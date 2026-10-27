import { supabase } from '../lib/supabase'

export const SUPERADMIN_EMAIL = 'support@ki-netic.ch'

const IMPERSONATION_STORAGE_KEY = 'kc_impersonated_tenant'

/**
 * Checks if the given user or session has superadmin privileges.
 */
export async function checkIsSuperAdmin(user) {
  if (!user) return false

  // In local development, allow admin testing via query parameter ?adminBypass=true
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('adminBypass') === 'true' || urlParams.get('admin') === 'true') {
      return true
    }
  }

  const email = user.email?.toLowerCase()?.trim()
  if (email === SUPERADMIN_EMAIL) {
    return true
  }

  // Database check in platform_superadmins
  try {
    if (!supabase) return false
    const { data, error } = await supabase
      .from('platform_superadmins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error && data?.user_id) {
      return true
    }
  } catch (err) {
    console.warn('Superadmin check exception:', err)
  }

  return false
}

/**
 * Platform KPIs Overview (MRR, Tenants, Invoices, Open Tickets)
 */
export async function fetchPlatformKpis() {
  if (!supabase) {
    return {
      total_tenants: 0,
      active_tenants: 0,
      trial_tenants: 0,
      suspended_tenants: 0,
      mrr: 0,
      open_tickets: 0,
      total_kunden: 0,
      total_rechnungen: 0,
    }
  }

  // Attempt RPC first
  try {
    const { data, error } = await supabase.rpc('admin_get_platform_kpis')
    if (!error && data) {
      return data
    }
  } catch (rpcErr) {
    // Fall back to direct queries below
  }

  // Fallback direct aggregates
  try {
    const { data: tenants } = await supabase.from('tenants').select('id, status, price_chf')
    const total_tenants = tenants?.length || 0
    const active_tenants = tenants?.filter(t => t.status === 'active')?.length || 0
    const trial_tenants = tenants?.filter(t => t.status === 'trial')?.length || 0
    const suspended_tenants = tenants?.filter(t => t.status === 'suspended' || t.status === 'overdue')?.length || 0
    const mrr = tenants?.filter(t => t.status === 'active')?.reduce((sum, t) => sum + (parseFloat(t.price_chf) || 49), 0) || 0

    let open_tickets = 0
    try {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])
      open_tickets = count || 0
    } catch (_) {}

    let total_kunden = 0
    try {
      const { count } = await supabase.from('kunden').select('*', { count: 'exact', head: true })
      total_kunden = count || 0
    } catch (_) {}

    let total_rechnungen = 0
    try {
      const { count } = await supabase.from('rechnungen').select('*', { count: 'exact', head: true })
      total_rechnungen = count || 0
    } catch (_) {}

    return {
      total_tenants,
      active_tenants,
      trial_tenants,
      suspended_tenants,
      mrr,
      open_tickets,
      total_kunden,
      total_rechnungen,
    }
  } catch (err) {
    console.error('Failed to fetch platform KPIs:', err)
    return {
      total_tenants: 0,
      active_tenants: 0,
      trial_tenants: 0,
      suspended_tenants: 0,
      mrr: 0,
      open_tickets: 0,
      total_kunden: 0,
      total_rechnungen: 0,
    }
  }
}

/**
 * Fetch all tenants with their settings & stats
 */
export async function fetchTenants() {
  if (!supabase) return []
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        status,
        plan,
        billing_cycle,
        price_chf,
        trial_ends_at,
        contact_name,
        contact_email,
        contact_phone,
        notes,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch associated einstellungen / owners if possible
    const { data: einstellungen } = await supabase
      .from('einstellungen')
      .select('tenant_id, firmenname, email, telefon, ort, kanton')

    const einstellungenMap = new Map()
    if (einstellungen) {
      einstellungen.forEach(e => einstellungenMap.set(e.tenant_id, e))
    }

    return (tenants || []).map(t => {
      const e = einstellungenMap.get(t.id) || {}
      return {
        ...t,
        firmenname: t.name || e.firmenname || 'Unbenannte Firma',
        email: t.contact_email || e.email || '',
        phone: t.contact_phone || e.telefon || '',
        ort: e.ort || '',
        kanton: e.kanton || '',
      }
    })
  } catch (err) {
    console.error('Failed to fetch tenants:', err)
    return []
  }
}

/**
 * Update tenant details or subscription status
 */
export async function updateTenant(tenantId, updates) {
  if (!supabase || !tenantId) return { success: false }
  try {
    // Try RPC first if it's status/plan/trial update
    const { error: rpcErr } = await supabase.rpc('admin_update_tenant', {
      p_tenant_id: tenantId,
      p_status: updates.status || null,
      p_trial_days_extension: updates.trialDaysExtension || null,
      p_plan: updates.plan || null,
      p_price_chf: updates.price_chf || null,
    })

    if (!rpcErr) return { success: true }

    // Fallback direct update
    const updateData = { ...updates }
    delete updateData.trialDaysExtension
    if (updates.trialDaysExtension) {
      const { data: cur } = await supabase.from('tenants').select('trial_ends_at').eq('id', tenantId).single()
      const curDate = cur?.trial_ends_at ? new Date(cur.trial_ends_at) : new Date()
      curDate.setDate(curDate.getDate() + updates.trialDaysExtension)
      updateData.trial_ends_at = curDate.toISOString()
      updateData.status = 'trial'
    }

    const { error } = await supabase.from('tenants').update(updateData).eq('id', tenantId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('Failed to update tenant:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Extend trial phase by N days
 */
export async function extendTenantTrial(tenantId, additionalDays = 14) {
  return updateTenant(tenantId, { trialDaysExtension: additionalDays, status: 'trial' })
}

/**
 * Support Impersonation: 1-Click login as tenant
 */
export async function impersonateTenant(tenantId, tenantName) {
  if (!supabase || !tenantId) return { success: false }
  try {
    // 1. Store impersonation session in localStorage
    const impersonationData = {
      tenantId,
      tenantName,
      startedAt: new Date().toISOString(),
    }
    localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(impersonationData))

    // 2. Call RPC or direct update on current user's role
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_impersonate_tenant', {
      p_target_tenant_id: tenantId,
    })

    if (rpcErr) {
      console.warn('admin_impersonate_tenant RPC failed, falling back to direct update:', rpcErr)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_roles')
          .update({ tenant_id: tenantId })
          .eq('id', user.id)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to impersonate tenant:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Gets currently active impersonation state if any
 */
export function getImpersonationState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(IMPERSONATION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

/**
 * Exits impersonation and returns back to admin
 */
export function exitImpersonation() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IMPERSONATION_STORAGE_KEY)
}

/**
 * Support Tickets: Fetch all tickets with tenant info
 */
export async function fetchSupportTickets(filterStatus = null) {
  if (!supabase) return []
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        tenant_id,
        user_id,
        title,
        category,
        priority,
        status,
        created_at,
        updated_at,
        tenants (
          name
        )
      `)
      .order('updated_at', { ascending: false })

    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(t => ({
      ...t,
      tenant_name: t.tenants?.name || 'Unbekannte Firma',
    }))
  } catch (err) {
    console.error('Failed to fetch support tickets:', err)
    return []
  }
}

/**
 * Fetch messages for a specific support ticket
 */
export async function fetchTicketMessages(ticketId) {
  if (!supabase || !ticketId) return []
  try {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to fetch ticket messages:', err)
    return []
  }
}

/**
 * Send reply to a support ticket
 */
export async function replyToTicket(ticketId, { message, senderName = 'Kinetic Craft Support', isAdmin = true }) {
  if (!supabase || !ticketId || !message) return { success: false }
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { error: msgErr } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user?.id || null,
        sender_name: senderName,
        is_admin: isAdmin,
        message: message.trim(),
      })

    if (msgErr) throw msgErr

    // Update ticket updated_at and status if requested
    await supabase
      .from('support_tickets')
      .update({
        updated_at: new Date().toISOString(),
        status: isAdmin ? 'in_progress' : 'open',
      })
      .eq('id', ticketId)

    return { success: true }
  } catch (err) {
    console.error('Failed to reply to ticket:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update ticket status (e.g. mark resolved)
 */
export async function updateTicketStatus(ticketId, status) {
  if (!supabase || !ticketId) return { success: false }
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Creates a support ticket from the customer app (Support & Hilfe Button)
 */
export async function createCustomerSupportTicket({ tenantId, title, category, priority, message, senderName }) {
  if (!supabase || !tenantId || !title || !message) return { success: false }
  try {
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Insert ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .insert({
        tenant_id: tenantId,
        user_id: user?.id || null,
        title: title.trim(),
        category: category || 'general',
        priority: priority || 'normal',
        status: 'open',
      })
      .select('id')
      .single()

    if (ticketErr) throw ticketErr

    // 2. Insert initial message
    const { error: msgErr } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user?.id || null,
        sender_name: senderName || user?.email || 'Kunde',
        is_admin: false,
        message: message.trim(),
      })

    if (msgErr) throw msgErr

    return { success: true, ticketId: ticket.id }
  } catch (err) {
    console.error('Failed to create customer ticket:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Platform Invoices: Fetch license invoices
 */
export async function fetchPlatformInvoices() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('platform_invoices')
      .select(`
        *,
        tenants (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(inv => ({
      ...inv,
      tenant_name: inv.tenants?.name || 'Unbekannte Firma',
    }))
  } catch (err) {
    console.error('Failed to fetch platform invoices:', err)
    return []
  }
}

/**
 * Create a new license invoice for a tenant
 */
export async function createPlatformInvoice({
  tenantId,
  amountChf = 49.00,
  planName = 'Kinetic Craft Professional',
  dueDateDays = 30,
  notes = '',
}) {
  if (!supabase || !tenantId) return { success: false }
  try {
    const year = new Date().getFullYear()
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const invoiceNumber = `KC-${year}-${randomSuffix}`

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueDateDays)

    const { data, error } = await supabase
      .from('platform_invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        amount_chf: amountChf,
        status: 'open',
        plan_name: planName,
        due_date: dueDate.toISOString().split('T')[0],
        notes,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, invoice: data }
  } catch (err) {
    console.error('Failed to create platform invoice:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Mark platform invoice as paid
 */
export async function markPlatformInvoicePaid(invoiceId) {
  if (!supabase || !invoiceId) return { success: false }
  try {
    const { error } = await supabase
      .from('platform_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * CRM Notes: Fetch notes for tenant
 */
export async function fetchCrmNotes(tenantId) {
  if (!supabase || !tenantId) return []
  try {
    const { data, error } = await supabase
      .from('crm_tenant_notes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to fetch CRM notes:', err)
    return []
  }
}

/**
 * Add a CRM note to a tenant
 */
export async function addCrmNote({ tenantId, noteType = 'call', content, authorName = 'Support-Team' }) {
  if (!supabase || !tenantId || !content) return { success: false }
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('crm_tenant_notes')
      .insert({
        tenant_id: tenantId,
        author_id: user?.id || null,
        author_name: authorName,
        note_type: noteType,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, note: data }
  } catch (err) {
    console.error('Failed to add CRM note:', err)
    return { success: false, error: err.message }
  }
}
