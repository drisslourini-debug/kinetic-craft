import { useState, useEffect } from 'react'
import { 
  fetchSupportTickets, 
  fetchTicketMessages, 
  replyToTicket, 
  updateTicketStatus,
  impersonateTenant 
} from '../../services/adminService'
import { formatDate } from '../../lib/formatters'
import { 
  IconMail, 
  IconSend
} from '../../components/icons/BrandIcons'

export default function AdminTicketsView() {
  const [tickets, setTickets] = useState([])
  const [filterStatus, setFilterStatus] = useState('open')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const data = await fetchSupportTickets(filterStatus)
      setTickets(data)
      if (data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [filterStatus])

  useEffect(() => {
    async function loadMessages() {
      if (!selectedTicket?.id) {
        setMessages([])
        return
      }
      try {
        const msgs = await fetchTicketMessages(selectedTicket.id)
        setMessages(msgs)
      } catch (err) {
        console.error(err)
      }
    }
    loadMessages()
  }, [selectedTicket?.id])

  const handleSendReply = async (e) => {
    if (e) e.preventDefault()
    if (!replyText.trim() || !selectedTicket?.id) return

    setIsSending(true)
    try {
      const res = await replyToTicket(selectedTicket.id, {
        message: replyText,
        senderName: 'Kinetic Craft Support',
        isAdmin: true,
      })

      if (res.success) {
        setReplyText('')
        const updated = await fetchTicketMessages(selectedTicket.id)
        setMessages(updated)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket?.id) return
    const res = await updateTicketStatus(selectedTicket.id, newStatus)
    if (res.success) {
      setSelectedTicket(prev => ({ ...prev, status: newStatus }))
      loadTickets()
    }
  }

  const handleApplyTemplate = (text) => {
    setReplyText(prev => prev ? `${prev}\n${text}` : text)
  }

  const handleImpersonate = async () => {
    if (!selectedTicket?.tenant_id) return
    const confirmed = window.confirm(`Direkt in "${selectedTicket.tenant_name}" einloggen zur Support-Diagnose?`)
    if (!confirmed) return
    await impersonateTenant(selectedTicket.tenant_id, selectedTicket.tenant_name)
    window.location.href = '/'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <IconMail className="w-6 h-6 text-amber-400" />
            <span>Support-Tickets & Postfach</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Eingehende Anfragen aller Kundenbetriebe (Benachrichtigungen an support@ki-netic.ch)
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
          {[
            { key: 'open', label: 'Offen' },
            { key: 'in_progress', label: 'In Bearbeitung' },
            { key: 'resolved', label: 'Gelöst' },
            { key: 'all', label: 'Alle' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Ticket Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Ticket List */}
        <div className="lg:col-span-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-zinc-800 text-xs font-semibold text-zinc-400 flex items-center justify-between">
            <span>Anfragen ({tickets.length})</span>
            <button
              type="button"
              onClick={loadTickets}
              className="text-amber-400 hover:text-amber-300 text-[11px] cursor-pointer"
            >
              Aktualisieren ↻
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 max-h-[650px]">
            {isLoading ? (
              <p className="p-6 text-xs text-zinc-500 text-center">Tickets werden geladen...</p>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Keine Tickets mit diesem Status vorhanden.
              </div>
            ) : (
              tickets.map(ticket => {
                const isSelected = selectedTicket?.id === ticket.id
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/90 border-l-4 border-amber-500'
                        : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-amber-400 truncate max-w-[200px]">
                        {ticket.tenant_name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatDate(ticket.updated_at || ticket.created_at)}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-bold text-white line-clamp-1 mb-1">
                      {ticket.title}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${
                        ticket.priority === 'urgent'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : ticket.priority === 'high'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {ticket.priority}
                      </span>
                      <span className="text-[10px] text-zinc-400 capitalize">
                        {ticket.category}
                      </span>
                      <span className="text-[10px] text-zinc-400 ml-auto capitalize">
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Ticket Conversation Detail */}
        <div className="lg:col-span-7 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl flex flex-col justify-between overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Top Detail Bar */}
              <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      {selectedTicket.tenant_name}
                    </span>
                    <h2 className="text-lg font-bold text-white leading-snug">
                      {selectedTicket.title}
                    </h2>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleImpersonate}
                      title="Als dieser Mandant einloggen zur Live-Fehlersuche"
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>⚡ Diagnose-Login</span>
                    </button>

                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold focus:outline-hidden cursor-pointer"
                    >
                      <option value="open">Offen</option>
                      <option value="in_progress">In Bearbeitung</option>
                      <option value="resolved">Gelöst</option>
                      <option value="closed">Geschlossen</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>Kategorie: <strong className="text-zinc-200 capitalize">{selectedTicket.category}</strong></span>
                  <span>&middot;</span>
                  <span>Erstellt: <strong className="text-zinc-200">{formatDate(selectedTicket.created_at)}</strong></span>
                </div>
              </div>

              {/* Message Thread */}
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 max-h-[420px] bg-zinc-950/20">
                {messages.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">Keine Nachrichten gefunden.</p>
                ) : (
                  messages.map(msg => {
                    const isAdmin = msg.is_admin
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1 px-1">
                          <strong className={isAdmin ? 'text-amber-400' : 'text-zinc-200'}>
                            {msg.sender_name || (isAdmin ? 'Kinetic Craft Support' : 'Kunde')}
                          </strong>
                          <span>&middot;</span>
                          <span>{formatDate(msg.created_at)}</span>
                        </div>
                        <div className={`p-3.5 rounded-2xl max-w-md text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                          isAdmin
                            ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-xs shadow-md'
                            : 'bg-zinc-800 text-zinc-100 rounded-tl-xs border border-zinc-700'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Quick Template Chips */}
              <div className="px-4 py-2 bg-zinc-950/60 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-zinc-400 shrink-0">Textbausteine:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Hallo! Wir haben deine Testphase soeben um weitere 14 Tage verlängert. Beste Grüsse, Kinetic Support')}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 whitespace-nowrap cursor-pointer"
                >
                  +14 Tage verlängert
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Guten Tag, das technische Problem wurde behoben. Bitte lade die Seite einmal neu (Strg+F5 / ⌘+Shift+R).')}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 whitespace-nowrap cursor-pointer"
                >
                  Bug behoben
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Deine Lizenz wurde erfolgreich freigeschaltet. Vielen Dank für dein Vertrauen in Kinetic Craft!')}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 whitespace-nowrap cursor-pointer"
                >
                  Lizenz aktiv
                </button>
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex gap-2">
                <textarea
                  rows={2}
                  required
                  placeholder="Antwort an den Kunden verfassen..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center text-xs"
                >
                  {isSending ? '...' : <IconSend className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500 text-xs">
              <IconMail className="w-10 h-10 mb-2 opacity-30 text-amber-400" />
              <span>Wähle ein Ticket links aus, um den Verlauf einzusehen.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
