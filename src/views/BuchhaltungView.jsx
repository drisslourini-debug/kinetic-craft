import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../lib/formatters'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { 
  generateBananaJournalCsv, 
  generateEstvMwstSummaryCsv, 
  generateOpenItemsDebtorsCsv 
} from '../lib/accountingExport'
import AusgabeCreateModal from './AusgabeCreateModal'
import BankabgleichModal from '../components/banking/BankabgleichModal'
import { useModalHistory } from '../hooks/useModalHistory'
import {
  IconChart,
  IconFolder,
  IconPackage,
  IconBook,
  IconSwissFlag,
  IconDocument,
  IconSparkles,
  IconMoney,
  IconSearch,
  IconBuilding,
  IconAttachment,
  IconCheck,
  IconWarning,
  IconBank,
  IconShieldCheck,
  IconClose,
  IconPraezision,
  IconPhotoScanner
} from '../components/icons/BrandIcons'

export default function BuchhaltungView({ onNavigate, userRole }) {
  const [ausgaben, setAusgaben] = useState([])
  const [einnahmen, setEinnahmen] = useState([])
  const [allInvoices, setAllInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBankabgleichOpen, setIsBankabgleichOpen] = useState(false)
  const [autoTriggerScan, setAutoTriggerScan] = useState(false)
  const [editingAusgabe, setEditingAusgabe] = useState(null)
  const [activeTab, setActiveTab] = useState('ausgaben') // 'ausgaben', 'op_liste', 'estv_mwst'
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [mobileExportMenuOpen, setMobileExportMenuOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Treuhand- & MWST-Einstellungen aus Mandantenprofil / Einstellungen
  const [settings, setSettings] = useState({
    mwst_methode: 'effektiv',
    saldosteuersatz: 5.9,
    mwst_abrechnungsart: 'vereinbart',
    konto_bank: '1020',
    konto_debitoren: '1100',
    konto_kreditoren: '2000',
    konto_ertrag: '3200',
    konto_skonto: '3800'
  })

  useModalHistory(isCreateModalOpen || !!editingAusgabe, () => {
    setIsCreateModalOpen(false)
    setEditingAusgabe(null)
  }, 'ausgabe_modal')

  useModalHistory(mobileFilterOpen, () => {
    setMobileFilterOpen(false)
  }, 'mobile_filter_buchhaltung')

  const [searchTerm, setSearchTerm] = useState('')
  const [ausgabeToDelete, setAusgabeToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  const handleBankabgleichSuccess = ({ count, totalAmount }) => {
    showToast('success', `${count} ${count === 1 ? 'Rechnung' : 'Rechnungen'} über ${formatCurrency(totalAmount)} erfolgreich abgeglichen & verbucht!`)
    fetchBuchhaltungData()
  }

  const [kpis, setKpis] = useState({
    einnahmen: 0,
    ausgaben: 0,
    vorsteuer: 0,
    geschuldeteMwst: 0,
    zahllast: 0,
    gewinn: 0
  })
  
  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState(currentYear.toString())
  const [filterQuarter, setFilterQuarter] = useState('All') // 'All', 'Q1', 'Q2', 'Q3', 'Q4'
  const [filterCategory, setFilterCategory] = useState('')

  // 1. Einstellungen laden
  useEffect(() => {
    async function loadSettings() {
      if (!supabase) return
      try {
        const { data, error } = await supabase.from('einstellungen').select('*').limit(1).maybeSingle()
        if (data && !error) {
          setSettings(prev => ({ ...prev, ...data }))
        } else {
          const local = localStorage.getItem('atelier77_einstellungen_v2')
          if (local) setSettings(prev => ({ ...prev, ...JSON.parse(local) }))
        }
      } catch (err) {
        console.warn('Einstellungen konnten nicht geladen werden, Fallback aktiv:', err)
        const local = localStorage.getItem('atelier77_einstellungen_v2')
        if (local) setSettings(prev => ({ ...prev, ...JSON.parse(local) }))
      }
    }
    loadSettings()
  }, [])

  // 2. Buchhaltungsdaten abrufen und nach Schweizer MWSTG abrechnen
  const fetchBuchhaltungData = useCallback(async () => {
    if (!supabase) return
    setIsLoading(true)
    
    try {
      // A. Ausgaben für das ausgewählte Jahr
      const startOfYear = `${filterYear}-01-01`
      const endOfYear = `${filterYear}-12-31`
      
      const { data: expenses, error: expenseError } = await supabase
        .from('ausgaben')
        .select('*, projekte(name)')
        .eq('is_archived', false)
        .gte('beleg_datum', startOfYear)
        .lte('beleg_datum', endOfYear)
        .order('beleg_datum', { ascending: false })
      
      if (expenseError) throw expenseError
      
      // B. Alle Rechnungen für OP-Liste und Einnahmenermittlung
      const { data: invoices, error: invoiceError } = await supabase
        .from('rechnungen')
        .select('id, rechnung_nr, total, bezahlt, bezahlt_am, rechnungsdatum, faellig_am, created_at, daten, status, projekt_id, projekte(name), kunden_id, kunden(name, firmenname)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (invoiceError) throw invoiceError
      if (invoices) setAllInvoices(invoices)

      let totalEinnahmen = 0
      let totalGeschuldeteMwst = 0
      
      const getQuarter = (dateStr) => {
        if (!dateStr) return 1
        const month = parseInt(dateStr.split('-')[1], 10)
        return Math.ceil(month / 3)
      }
      
      const isInQuarter = (dateStr) => {
        if (!dateStr || filterQuarter === 'All') return true
        const q = getQuarter(dateStr)
        return `Q${q}` === filterQuarter
      }

      const isVereinbart = settings.mwst_abrechnungsart !== 'vereinnahmt'
      const isSaldo = settings.mwst_methode === 'saldosteuer'
      const saldorate = parseFloat(settings.saldosteuersatz || 5.9)

      if (invoices) {
        const filteredInvoices = []

        if (isVereinbart) {
          // Vereinbarte Methode (Soll-Prinzip, Art. 39 Abs. 1 MWSTG):
          // Relevant ist das Rechnungsdatum aller fakturierten Rechnungen
          invoices.forEach(inv => {
            if (inv.status === 'Entwurf' || inv.status === 'Storniert') return

            const dateStr = inv.rechnungsdatum || (inv.created_at ? inv.created_at.split('T')[0] : '')
            if (dateStr && dateStr.startsWith(filterYear) && isInQuarter(dateStr)) {
              const invoiceTotal = parseFloat(inv.total || 0)
              totalEinnahmen += invoiceTotal
              filteredInvoices.push(inv)

              if (!isSaldo) {
                const mwstSatz = parseFloat(inv.daten?.konditionen?.mwst ?? 8.1) || 8.1
                const netto = invoiceTotal / (1 + (mwstSatz / 100))
                totalGeschuldeteMwst += (invoiceTotal - netto)
              }
            }
          })
        } else {
          // Vereinnahmte Methode (Ist-Prinzip, Art. 39 Abs. 2 MWSTG):
          // Relevant sind tatsächliche Zahlungseingänge
          invoices.forEach(inv => {
            const zahlungen = inv.daten?.zahlungen || []
            let match = false

            if (zahlungen.length === 0 && parseFloat(inv.bezahlt || 0) > 0 && inv.bezahlt_am) {
              if (inv.bezahlt_am.startsWith(filterYear) && isInQuarter(inv.bezahlt_am)) {
                const b = parseFloat(inv.bezahlt)
                totalEinnahmen += b
                match = true
                if (!isSaldo) {
                  const mwstSatz = parseFloat(inv.daten?.konditionen?.mwst ?? 8.1) || 8.1
                  const netto = b / (1 + (mwstSatz / 100))
                  totalGeschuldeteMwst += (b - netto)
                }
              }
            } else {
              zahlungen.forEach(z => {
                if (z.betrag > 0 && z.typ !== 'Ausbuchung') {
                  if (z.datum && z.datum.startsWith(filterYear) && isInQuarter(z.datum)) {
                    totalEinnahmen += z.betrag
                    match = true
                    if (!isSaldo) {
                      const mwstSatz = parseFloat(inv.daten?.konditionen?.mwst ?? 8.1) || 8.1
                      const netto = z.betrag / (1 + (mwstSatz / 100))
                      totalGeschuldeteMwst += (z.betrag - netto)
                    }
                  }
                }
              })
            }

            if (match) filteredInvoices.push(inv)
          })
        }

        // Saldosteuersatz: Pauschaler Satz auf Bruttoumsatz inkl. MWST (Art. 37 MWSTG)
        if (isSaldo) {
          totalGeschuldeteMwst = totalEinnahmen * (saldorate / 100)
        }

        setEinnahmen(filteredInvoices)
      }

      // C. Ausgaben & Vorsteuer
      let totalAusgaben = 0
      let totalVorsteuer = 0
      
      if (expenses) {
        const qExpenses = expenses.filter(ex => isInQuarter(ex.beleg_datum))
        setAusgaben(qExpenses)
        
        qExpenses.forEach(ex => {
          if (ex.status === 'Bezahlt' || !ex.status) {
            totalAusgaben += parseFloat(ex.betrag_brutto) || 0
            if (!isSaldo) {
              // Bei Saldosteuer entfällt Vorsteuerabzug (Art. 37 MWSTG)
              totalVorsteuer += parseFloat(ex.mwst_betrag) || 0
            }
          }
        })
      }

      const effectiveVorsteuer = isSaldo ? 0 : totalVorsteuer
      const zahllast = totalGeschuldeteMwst - effectiveVorsteuer

      setKpis({
        einnahmen: totalEinnahmen,
        ausgaben: totalAusgaben,
        vorsteuer: effectiveVorsteuer,
        geschuldeteMwst: totalGeschuldeteMwst,
        zahllast: zahllast,
        gewinn: totalEinnahmen - totalAusgaben
      })

    } catch (err) {
      console.error('Error fetching buchhaltung:', err)
      showToast('error', 'Fehler beim Laden der Buchhaltungsdaten.')
    } finally {
      setIsLoading(false)
    }
  }, [filterYear, filterQuarter, settings])

  useEffect(() => {
    fetchBuchhaltungData()
  }, [fetchBuchhaltungData])

  const categories = [...new Set(ausgaben.map(a => a.kategorie).filter(Boolean))]

  // Filter out data by category and search term
  const filteredAusgaben = ausgaben.filter(a => {
    const matchesCategory = !filterCategory || a.kategorie === filterCategory
    const term = searchTerm.toLowerCase().trim()
    const matchesSearch = !term ||
      (a.titel && a.titel.toLowerCase().includes(term)) ||
      (a.projekte?.name && a.projekte.name.toLowerCase().includes(term)) ||
      (a.kategorie && a.kategorie.toLowerCase().includes(term))
    return matchesCategory && matchesSearch
  })

  // Offene Posten (OP-Liste / Debitorenspiegel) Berechnung
  const openInvoices = allInvoices.filter(inv => {
    if (inv.status === 'Entwurf' || inv.status === 'Storniert') return false
    const total = parseFloat(inv.total || 0)
    const bezahlt = parseFloat(inv.bezahlt || 0)
    return (total - bezahlt) > 0.05
  }).map(inv => {
    const total = parseFloat(inv.total || 0)
    const bezahlt = parseFloat(inv.bezahlt || 0)
    const offen = Math.max(0, Math.round((total - bezahlt) * 100) / 100)
    const faelligStr = inv.faellig_am || inv.rechnungsdatum || inv.created_at
    const faelligDate = new Date(faelligStr)
    const diffTime = new Date().getTime() - faelligDate.getTime()
    const tageUeberfaellig = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
    const isOverdue = faelligDate < new Date() && tageUeberfaellig > 0

    let altersstufe = 'Noch nicht fällig'
    if (tageUeberfaellig > 90) altersstufe = '> 90 Tage'
    else if (tageUeberfaellig > 60) altersstufe = '61–90 Tage'
    else if (tageUeberfaellig > 30) altersstufe = '31–60 Tage'
    else if (tageUeberfaellig > 0) altersstufe = '1–30 Tage'

    return {
      ...inv,
      total,
      bezahlt,
      offen,
      faelligStr,
      tageUeberfaellig,
      isOverdue,
      altersstufe
    }
  })

  const totalOffeneForderungen = openInvoices.reduce((sum, inv) => sum + inv.offen, 0)
  const delkredere5Prozent = Math.round(totalOffeneForderungen * 0.05 * 100) / 100
  const nettoForderungen = Math.round((totalOffeneForderungen - delkredere5Prozent) * 100) / 100
  const ueberfaelligCount = openInvoices.filter(inv => inv.isOverdue).length

  // ===================== EXPORT HANDLERS =====================
  const handleExportZIP = async () => {
    if (filteredAusgaben.length === 0 && einnahmen.length === 0 && openInvoices.length === 0) {
      showToast('info', 'Keine Daten zum Exportieren vorhanden.')
      return
    }
    
    setIsExporting(true)
    try {
      const zip = new JSZip()

      // --- AUSGABEN CSV (Schweizer Excel Semikolon) ---
      if (filteredAusgaben.length > 0) {
        const ausgabenHeaders = ['Datum', 'Titel', 'Kategorie', 'Projekt', 'Netto CHF', 'MwSt %', 'MwSt CHF', 'Brutto CHF', 'Beleg URL']
        const ausgabenRows = filteredAusgaben.map(a => {
          return [
            formatDate(a.beleg_datum),
            `"${(a.titel || '').replace(/"/g, '""')}"`,
            `"${(a.kategorie || '').replace(/"/g, '""')}"`,
            `"${(a.projekte?.name || '').replace(/"/g, '""')}"`,
            (parseFloat(a.betrag_netto) || 0).toFixed(2),
            a.mwst_satz ?? 0,
            (parseFloat(a.mwst_betrag) || 0).toFixed(2),
            (parseFloat(a.betrag_brutto) || 0).toFixed(2),
            a.beleg_url || ''
          ].join(';')
        })
        const ausgabenCsv = [ausgabenHeaders.join(';'), ...ausgabenRows].join('\r\n')
        zip.file('Ausgaben.csv', '\uFEFF' + ausgabenCsv)
      }

      // --- EINNAHMEN CSV (Schweizer Excel Semikolon) ---
      if (einnahmen.length > 0) {
        const einnahmenHeaders = ['Rechnungsnummer', 'Datum', 'Status', 'Projekt', 'Total CHF']
        const einnahmenRows = einnahmen.map(r => {
          return [
            r.rechnung_nr || r.id,
            formatDate(r.rechnungsdatum || r.created_at),
            r.status,
            `"${(r.projekte?.name || '').replace(/"/g, '""')}"`,
            (parseFloat(r.total) || 0).toFixed(2)
          ].join(';')
        })
        const einnahmenCsv = [einnahmenHeaders.join(';'), ...einnahmenRows].join('\r\n')
        zip.file('Einnahmen.csv', '\uFEFF' + einnahmenCsv)
      }

      // --- OFFENE POSTEN (OP-LISTE DEBITOREN NACH ART. 960e OR) ---
      const opListeCsv = generateOpenItemsDebtorsCsv(allInvoices)
      zip.file('Offene_Posten_Debitoren.csv', opListeCsv)

      // --- BANANA BUCHHALTUNG (DOPPELT & KASSA) ---
      const bananaDoppelt = generateBananaJournalCsv(filteredAusgaben, einnahmen, { ...settings, mode: 'doppelt' })
      zip.file('Banana_Buchungsjournal_Doppelt.csv', bananaDoppelt)

      const bananaKassa = generateBananaJournalCsv(filteredAusgaben, einnahmen, { ...settings, mode: 'kassa' })
      zip.file('Banana_Buchungsjournal_Kassa.csv', bananaKassa)

      // --- ESTV FORMULAR 200 MWST-ÜBERSICHT ---
      const estvSummaryCsv = generateEstvMwstSummaryCsv(filteredAusgaben, einnahmen, settings)
      zip.file('ESTV_MWST_Formular200.csv', estvSummaryCsv)

      // --- TREUHAND DOKUMENTATION & REVISIONS-HINWEISE ---
      const infoText = [
        '====================================================================',
        'TREUHAND-REVISIONS-EXPORT (OR 957 ff. & GeBüV / MWSTG Art. 26/37/39)',
        '====================================================================',
        `Erstellt am: ${new Date().toLocaleDateString('de-CH')} ${new Date().toLocaleTimeString('de-CH')}`,
        `Steuerjahr: ${filterYear}, Periode: ${filterQuarter}`,
        `MWST-Methode: ${settings.mwst_methode === 'saldosteuer' ? `Saldosteuersatzmethode (${settings.saldosteuersatz}% - Art. 37 MWSTG)` : 'Effektive Abrechnungsmethode (Art. 36 MWSTG)'}`,
        `MWST-Abrechnungsart: ${settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (nach Zahlungseingang / Ist-Prinzip)' : 'Vereinbart (nach Rechnungsdatum / Soll-Prinzip)'}`,
        '',
        'SCHWEIZER KMU-KONTENPLAN:',
        `- Bank: Konto ${settings.konto_bank || '1020'}`,
        `- Debitoren (FLL): Konto ${settings.konto_debitoren || '1100'}`,
        `- Delkredere (5% pauschal Art. 960e OR): Konto 1109`,
        `- Kreditoren (VLL): Konto ${settings.konto_kreditoren || '2000'}`,
        `- Ertrag Handwerk: Konto ${settings.konto_ertrag || '3200'}`,
        `- Skonti & Erlösminderungen (Art. 41 MWSTG): Konto ${settings.konto_skonto || '3800'}`,
        '',
        'DATEIEN IN DIESEM ARCHIV:',
        '1. Ausgaben.csv: Alle verbuchten Lieferantenrechnungen & Spesen',
        '2. Einnahmen.csv: Alle fakturierten bzw. vereinnahmten Debitorenforderungen',
        '3. Offene_Posten_Debitoren.csv: Stichtags-Aging-Debitorenspiegel (<30, 31-60, 61-90, >90 Tage) & 5% Delkredere',
        '4. Banana_Buchungsjournal_Doppelt.csv: Importdatei für Banana Buchhaltung (Faktura 1100 an 3200 + Zahlung 1020 an 1100 + Skonto 3800 an 1100)',
        '5. Banana_Buchungsjournal_Kassa.csv: Einfaches Kassenbuch (1020 an 3200)',
        '6. ESTV_MWST_Formular200.csv: Vorbereitung zur MWST-Deklaration mit Kennziffern (Ziff. 200, 289, 302/381, 382, 400, 500)',
        '7. Ordner Belege/: Originale Belege & Quittungen der Ausgaben',
        '===================================================================='
      ].join('\r\n')
      zip.file('Treuhand_Hinweise.txt', infoText)

      // --- BELEGE (PDF/JPG) ---
      const belegeFolder = zip.folder('Belege')
      for (const a of filteredAusgaben) {
        if (a.beleg_url) {
          try {
            const response = await fetch(a.beleg_url)
            const blob = await response.blob()
            const ext = a.beleg_url.split('.').pop().split('?')[0] || 'pdf'
            const safeTitle = (a.titel || 'beleg').replace(/[^a-z0-9]/gi, '_').toLowerCase()
            belegeFolder.file(`Beleg_${a.beleg_datum}_${safeTitle}.${ext}`, blob)
          } catch (e) {
            console.error('Fehler beim Download des Belegs:', a.beleg_url, e)
          }
        }
      }

      // --- ZIP GENERIEREN & DOWNLOAD ---
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `Treuhand_Export_${filterYear}_${filterQuarter}.zip`)
      showToast('success', 'Treuhand-Revisions-ZIP erfolgreich erstellt und heruntergeladen.')
    } catch (error) {
      console.error('Export Fehler:', error)
      showToast('error', 'Fehler beim Erstellen des ZIP-Exports.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportBanana = (mode = 'doppelt') => {
    if (filteredAusgaben.length === 0 && einnahmen.length === 0) {
      showToast('info', 'Keine Daten zum Exportieren vorhanden.')
      return
    }
    const csv = generateBananaJournalCsv(filteredAusgaben, einnahmen, { ...settings, mode })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `Banana_Journal_${filterYear}_${filterQuarter}_${mode}.csv`)
    showToast('success', `Banana-Buchungsjournal (${mode === 'doppelt' ? 'Doppelt 1100/1020' : 'Kassenbuch'}) heruntergeladen.`)
    setBananaMenuOpen(false)
  }

  const handleExportEstvCsv = () => {
    const csv = generateEstvMwstSummaryCsv(filteredAusgaben, einnahmen, settings)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `ESTV_MWST_Formular200_${filterYear}_${filterQuarter}.csv`)
    showToast('success', 'ESTV Formular 200 CSV heruntergeladen.')
  }

  const handleExportOpListeCsv = () => {
    const csv = generateOpenItemsDebtorsCsv(allInvoices)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `Offene_Posten_Debitoren_${new Date().toISOString().split('T')[0]}.csv`)
    showToast('success', 'Offene-Posten-Liste (Debitorenspiegel) heruntergeladen.')
  }
  
  const handleMarkAsPaid = async (ausgabe) => {
    try {
      const { error } = await supabase
        .from('ausgaben')
        .update({ status: 'Bezahlt' })
        .eq('id', ausgabe.id)

      if (error) throw error
      showToast('success', 'Ausgabe wurde als bezahlt markiert.')
      fetchBuchhaltungData()
    } catch (err) {
      console.error('Error marking as paid:', err)
      showToast('error', 'Fehler beim Aktualisieren des Status.')
    }
  }

  const handleRequestDelete = (ausgabe) => {
    setAusgabeToDelete(ausgabe)
  }

  const handleConfirmDelete = async () => {
    if (!ausgabeToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('ausgaben')
        .delete()
        .eq('id', ausgabeToDelete.id)
      
      if (error) throw error
      
      setAusgaben(prev => prev.filter(a => a.id !== ausgabeToDelete.id))
      showToast('success', 'Ausgabe wurde erfolgreich gelöscht.')
      setAusgabeToDelete(null)
      fetchBuchhaltungData()
    } catch (err) {
      console.error('Error deleting ausgabe:', err)
      showToast('error', 'Fehler beim Löschen der Ausgabe.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenEdit = (ausgabe) => {
    setEditingAusgabe(ausgabe)
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingAusgabe(null)
    setIsCreateModalOpen(false)
    setAutoTriggerScan(false)
  }

  const handleSaveModal = () => {
    fetchBuchhaltungData()
    handleCloseModal()
  }

  const isSaldo = settings.mwst_methode === 'saldosteuer'

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in pb-24 md:pb-12">
      {/* Mobile Top Header (Clean, 2 primary buttons side-by-side + Export dropdown) */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <IconChart className="w-5 h-5 text-primary-600" />
              <span>Buchhaltung</span>
            </h2>
            <span className="text-[10px] text-text-secondary font-medium">OR 957 ff. · ESTV MWST</span>
          </div>

          {/* Mobile Export Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileExportMenuOpen(!mobileExportMenuOpen)}
              className="px-2.5 py-1.5 bg-white border border-border text-text-primary rounded-xl shadow-xs font-semibold text-xs flex items-center gap-1.5 active:bg-neutral-50 cursor-pointer"
              title="Exporte & Treuhand"
            >
              <IconFolder className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[11px] font-bold">Export</span>
              <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {mobileExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileExportMenuOpen(false)}></div>
                <div className="absolute right-0 top-10 w-60 bg-white border border-border rounded-2xl shadow-xl z-40 p-1.5 animate-scale-in">
                  <button
                    onClick={() => { setMobileExportMenuOpen(false); handleExportZIP(); }}
                    disabled={isExporting}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <IconPackage className="w-4 h-4 text-primary-600" />
                    <span>Treuhand-Revisions-ZIP</span>
                  </button>
                  <button
                    onClick={() => { setMobileExportMenuOpen(false); handleExportBanana('doppelt'); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <IconDocument className="w-4 h-4 text-amber-600" />
                    <span>Banana Doppelt (1100)</span>
                  </button>
                  <button
                    onClick={() => { setMobileExportMenuOpen(false); handleExportBanana('kassa'); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <IconBook className="w-4 h-4 text-emerald-600" />
                    <span>Banana Kassenbuch</span>
                  </button>
                  <button
                    onClick={() => { setMobileExportMenuOpen(false); handleExportEstvCsv(); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 cursor-pointer border-t border-border/50"
                  >
                    <IconSwissFlag className="w-4 h-4 text-red-600" />
                    <span>ESTV Formular 200 CSV</span>
                  </button>
                  <button
                    onClick={() => { setMobileExportMenuOpen(false); handleExportOpListeCsv(); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <IconDocument className="w-4 h-4 text-blue-600" />
                    <span>OP-Liste Debitoren CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2 Primary Mobile Action Buttons (Side-by-side) */}
        {userRole !== 'treuhand' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingAusgabe(null)
                setAutoTriggerScan(true)
                setIsCreateModalOpen(true)
              }}
              className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
            >
              <IconSparkles className="w-4 h-4 text-slate-950" />
              <span>Beleg scannen</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAusgabe(null)
                setAutoTriggerScan(false)
                setIsCreateModalOpen(true)
              }}
              className="py-2.5 px-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
            >
              <span className="text-sm">+</span>
              <span>Ausgabe erfassen</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Buchhaltung & Steuern</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
              <IconSwissFlag className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>OR 957 ff. · GeBüV</span>
            </span>
          </div>
          <p className="text-text-secondary text-sm mt-1.5">
            Schweizer KMU-Buchhaltung, ESTV-Mehrwertsteuerabrechnung & Revisions-Exporte.
          </p>
        </div>

        {/* Action Buttons: 1 Consolidated Export Dropdown + 2 Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Exporte & Treuhand Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="h-10 px-3.5 bg-white border border-border hover:border-text-secondary text-text-primary rounded-xl shadow-xs font-semibold text-xs sm:text-sm inline-flex items-center gap-2 hover:bg-neutral-50 active:scale-[0.98] transition-all cursor-pointer"
              title="Revisionsakten & Buchhaltungs-Exporte nach Schweizer Recht"
            >
              <IconFolder className="w-4 h-4 text-text-secondary" />
              <span>Exporte & Treuhand</span>
              <svg className="w-4 h-4 text-text-secondary transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportMenuOpen(false)}></div>
                <div className="absolute right-0 top-12 w-72 bg-white border border-border rounded-2xl shadow-xl z-40 p-2 animate-scale-in">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Revisions- & Treuhandakten
                  </div>
                  <button
                    onClick={() => { setExportMenuOpen(false); handleExportZIP(); }}
                    disabled={isExporting}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                      <IconPackage className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-text-primary">Treuhand-Revisions-ZIP</div>
                      <div className="text-[10px] text-text-secondary font-normal">Alle Belege, Rechnungen & CSV gebündelt</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-border/60"></div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Buchhaltungs-Software
                  </div>

                  <button
                    onClick={() => { setExportMenuOpen(false); handleExportBanana('doppelt'); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <IconDocument className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-text-primary">Banana Doppelt (1100 an 3200)</div>
                      <div className="text-[10px] text-text-secondary font-normal">Forderungen, Zahlungen & Skonto</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setExportMenuOpen(false); handleExportBanana('kassa'); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <IconBook className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-text-primary">Banana Kassenbuch (Einfach)</div>
                      <div className="text-[10px] text-text-secondary font-normal">Bank 1020 direkt an Ertrag 3200</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-border/60"></div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Behörden & OP-Liste
                  </div>

                  <button
                    onClick={() => { setExportMenuOpen(false); handleExportEstvCsv(); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <IconSwissFlag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-text-primary">ESTV Formular 200 CSV</div>
                      <div className="text-[10px] text-text-secondary font-normal">Ziffern 200 bis 500 für e-mwst</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setExportMenuOpen(false); handleExportOpListeCsv(); }}
                    className="w-full text-left p-2.5 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <IconDocument className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-text-primary">OP-Liste Debitoren CSV</div>
                      <div className="text-[10px] text-text-secondary font-normal">Fällige & offene Kundenrechnungen</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {userRole !== 'treuhand' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingAusgabe(null)
                  setAutoTriggerScan(true)
                  setIsCreateModalOpen(true)
                }}
                className="h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs inline-flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                title="Beleg mit Gemini KI automatisch auslesen & verbuchen"
              >
                <IconSparkles className="w-4 h-4 text-slate-950" />
                <span>Beleg scannen</span>
                <span className="text-[10px] font-extrabold uppercase bg-amber-400/80 text-slate-950 px-1.5 py-0.5 rounded tracking-wide">
                  KI
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingAusgabe(null)
                  setAutoTriggerScan(false)
                  setIsCreateModalOpen(true)
                }}
                className="h-10 px-4 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>Ausgabe erfassen</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dedicated Period Selector & Tax Status Bar (Desktop) */}
      <div className="hidden sm:flex items-center justify-between gap-4 bg-surface-card border border-border p-2.5 px-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Abrechnungsperiode:
          </span>
          <div className="inline-flex p-1 bg-neutral-100/90 rounded-xl gap-1">
            {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setFilterQuarter(q)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterQuarter === q
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {q === 'All' ? 'Ganzes Jahr' : q}
              </button>
            ))}
          </div>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-1 bg-neutral-100/90 border border-border/50 rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value={currentYear.toString()}>{currentYear}</option>
            <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
            <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
          </select>
        </div>

        {/* Tax Mode Badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 text-text-secondary text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {isSaldo ? `Saldosteuersatz ${settings.saldosteuersatz || 5.9}%` : 'Effektive Methode (8.1%)'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 text-text-secondary text-xs font-semibold">
            {settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (Ist-Methode)' : 'Vereinbart (Soll-Methode)'}
          </span>
        </div>
      </div>

      {/* Mobile KPI Grid (Kompaktes 2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5 md:hidden">
        {/* Umsatz */}
        <div className="bg-surface-card rounded-2xl border border-border p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Umsatz</span>
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <IconChart className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-base font-extrabold text-emerald-600 truncate">{formatCurrency(kpis.einnahmen)}</p>
          <span className="text-[9px] text-text-secondary block truncate mt-0.5">
            {settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt' : 'Vereinbart'}
          </span>
        </div>

        {/* Ausgaben */}
        <div className="bg-surface-card rounded-2xl border border-border p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Aufwand</span>
            <span className="w-5 h-5 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
              <IconMoney className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-base font-extrabold text-red-600 truncate">{formatCurrency(kpis.ausgaben)}</p>
          <span className="text-[9px] text-text-secondary block truncate mt-0.5">
            {filterQuarter !== 'All' ? filterQuarter : filterYear}
          </span>
        </div>

        {/* Gewinn (EAR) */}
        <div className="bg-surface-card rounded-2xl border border-border p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Gewinn (EAR)</span>
            <span className="w-5 h-5 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
              <IconMoney className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className={`text-base font-extrabold truncate ${kpis.gewinn >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
            {formatCurrency(kpis.gewinn)}
          </p>
          <span className="text-[9px] text-text-secondary block truncate mt-0.5">
            Netto vor Steuern
          </span>
        </div>

        {/* MWST Zahllast */}
        <div className="bg-surface-card rounded-2xl border border-border p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary truncate">
              {kpis.zahllast >= 0 ? 'MWST Zahllast' : 'MWST Guthaben'}
            </span>
            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
              <IconSwissFlag className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-base font-extrabold text-amber-700 truncate">
            {formatCurrency(Math.abs(kpis.zahllast))}
          </p>
          <span className="text-[9px] text-text-secondary block truncate mt-0.5">
            {isSaldo ? `Saldo ${settings.saldosteuersatz}%` : 'Ziff. 500 (8.1%)'}
          </span>
        </div>
      </div>

      {/* Desktop Schweizer Treuhand KPIs (5 Cards, No Truncation) */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Tile 1: Einnahmen / Umsatz */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Umsatz</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <IconChart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(kpis.einnahmen)}</p>
          <div className="text-[11px] text-text-secondary mt-1 font-medium truncate">
            Konto 3200 · {settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt' : 'Vereinbart'}
          </div>
        </div>

        {/* Tile 2: Ausgaben / Aufwand */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Aufwand</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <IconMoney className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 tracking-tight">{formatCurrency(kpis.ausgaben)}</p>
          <div className="text-[11px] text-text-secondary mt-1 font-medium truncate">
            Konto 4000–6500 · {filterQuarter !== 'All' ? filterQuarter : filterYear}
          </div>
        </div>

        {/* Tile 3: Gewinn (EAR) */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Gewinn (EAR)</span>
            <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <p className={`text-2xl font-black tracking-tight ${kpis.gewinn >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
            {formatCurrency(kpis.gewinn)}
          </p>
          <div className="text-[11px] text-text-secondary mt-1 font-medium truncate">
            Netto vor Steuern · Saldo
          </div>
        </div>

        {/* Tile 4: Vorsteuer */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Vorsteuer</span>
            <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <IconDocument className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-text-primary tracking-tight">
            {isSaldo ? 'CHF 0.00' : formatCurrency(kpis.vorsteuer)}
          </p>
          <div className="text-[11px] text-text-secondary mt-1 font-medium truncate">
            {isSaldo ? 'Kein Abzug (Saldosteuer)' : 'Konto 1170 · Vorsteuerabzug'}
          </div>
        </div>

        {/* Tile 5: MWST Zahllast */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">MWST Zahllast</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <IconSwissFlag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 tracking-tight">
            {formatCurrency(Math.abs(kpis.zahllast))}
          </p>
          <div className="text-[11px] text-text-secondary mt-1 font-medium truncate">
            ESTV Ziff. 500 · {isSaldo ? `Saldosatz ${settings.saldosteuersatz}%` : 'Normalsatz 8.1%'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Mobile Pill Tabs) */}
      <div className="grid grid-cols-3 md:hidden gap-1 p-1 bg-surface-card border border-border rounded-2xl shadow-xs">
        <button
          data-testid="tab-ausgaben"
          onClick={() => setActiveTab('ausgaben')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl font-bold text-[11px] sm:text-xs transition-all cursor-pointer min-w-0 ${
            activeTab === 'ausgaben'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100'
          }`}
        >
          <IconDocument className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Ausgaben</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
            activeTab === 'ausgaben' ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-text-secondary'
          }`}>
            {filteredAusgaben.length}
          </span>
        </button>

        <button
          data-testid="tab-op-liste"
          onClick={() => setActiveTab('op_liste')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl font-bold text-[11px] sm:text-xs transition-all cursor-pointer min-w-0 ${
            activeTab === 'op_liste'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100'
          }`}
        >
          <IconBook className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">OP-Liste</span>
          {openInvoices.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
              activeTab === 'op_liste' ? 'bg-primary-700 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {openInvoices.length}
            </span>
          )}
        </button>

        <button
          data-testid="tab-estv-mwst"
          onClick={() => setActiveTab('estv_mwst')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl font-bold text-[11px] sm:text-xs transition-all cursor-pointer min-w-0 ${
            activeTab === 'estv_mwst'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100'
          }`}
        >
          <IconSwissFlag className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">ESTV MWST</span>
        </button>
      </div>

      {/* Mobile Time-Filter Strip (Quartale + Jahr + Filter-Button) */}
      <div className="flex md:hidden items-center justify-between gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
        <div className="flex items-center gap-0.5 bg-surface-card p-0.5 rounded-xl border border-border shrink-0">
          {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setFilterQuarter(q)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                filterQuarter === q
                  ? 'bg-primary-600 text-white shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {q === 'All' ? 'Jahr' : q}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="px-2 py-1 bg-surface-card border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none"
          >
            <option value={currentYear.toString()}>{currentYear}</option>
            <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
            <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
          </select>

          {/* Filter button for search & category bottom sheet */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className={`px-2 py-1 border rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
              (searchTerm || filterCategory)
                ? 'bg-primary-50 border-primary-300 text-primary-800 font-bold'
                : 'bg-white border-border text-text-secondary hover:text-text-primary'
            }`}
            title="Filter & Suche"
          >
            <IconSearch className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(searchTerm || filterCategory) && (
              <span className="w-2 h-2 rounded-full bg-primary-600" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs (Segmented Control) */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="inline-flex p-1.5 bg-neutral-100/80 border border-border/80 rounded-2xl gap-1.5 shadow-2xs">
          <button
            onClick={() => setActiveTab('ausgaben')}
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'ausgaben'
                ? 'bg-white text-text-primary shadow-xs ring-1 ring-border/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-neutral-200/40'
            }`}
          >
            <IconDocument className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ausgaben & Belege</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'ausgaben' ? 'bg-amber-100 text-amber-900' : 'bg-neutral-200/80 text-text-secondary'
            }`}>
              {filteredAusgaben.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('op_liste')}
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'op_liste'
                ? 'bg-white text-text-primary shadow-xs ring-1 ring-border/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-neutral-200/40'
            }`}
          >
            <IconBook className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Offene Posten (OP-Liste)</span>
            {openInvoices.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'op_liste' ? 'bg-blue-100 text-blue-900' : 'bg-neutral-200/80 text-text-secondary'
              }`}>
                {openInvoices.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('estv_mwst')}
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'estv_mwst'
                ? 'bg-white text-text-primary shadow-xs ring-1 ring-border/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-neutral-200/40'
            }`}
          >
            <IconSwissFlag className="w-4 h-4 text-red-600 shrink-0" />
            <span>ESTV MWST (Formular 200)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold ${
              isSaldo 
                ? (activeTab === 'estv_mwst' ? 'bg-purple-100 text-purple-900' : 'bg-neutral-200/80 text-purple-800')
                : (activeTab === 'estv_mwst' ? 'bg-emerald-100 text-emerald-900' : 'bg-neutral-200/80 text-emerald-800')
            }`}>
              {isSaldo ? `Saldo ${settings.saldosteuersatz}%` : 'Effektiv 8.1%'}
            </span>
          </button>
        </div>

        {/* Bankabgleich Shortcut Button */}
        {userRole !== 'treuhand' && (
          <button
            type="button"
            onClick={() => setIsBankabgleichOpen(true)}
            className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-border text-text-primary hover:bg-neutral-50 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Kontoauszug (camt.053 / camt.054) automatisch mit Rechnungen abgleichen"
          >
            <IconBank className="w-4 h-4 text-emerald-600" />
            <span>Bankabgleich (camt)</span>
          </button>
        )}
      </div>

      {/* ===================== TAB 1: AUSGABEN & BELEGE ===================== */}
      {activeTab === 'ausgaben' && (
        <div className="bg-white border border-gray-200/60 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col min-h-[500px]">
          {/* Toolbar (Desktop) */}
          <div className="p-4 border-b border-border/60 hidden md:flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-neutral-50/50">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-text-primary text-sm">Ausgaben & Belege</h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-200/80 text-text-secondary">
                {filteredAusgaben.length} {filteredAusgaben.length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              {/* Search Input */}
              <div className="relative min-w-[260px]">
                <input
                  type="text"
                  placeholder="Ausgabe oder Beleg suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-border rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none shadow-2xs"
                />
                <svg className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 rounded-full cursor-pointer text-xs"
                    title="Suche zurücksetzen"
                  >
                    <IconClose className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none shadow-2xs cursor-pointer"
              >
                <option value="">Alle Kategorien</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="p-0 overflow-x-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredAusgaben.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-48 text-gray-500 text-center px-4">
                <IconDocument className="w-10 h-10 text-neutral-400 mb-2" />
                {searchTerm || filterCategory ? (
                  <>
                    <p className="font-medium text-gray-700">Keine Ausgaben entsprechen deinen Filterkriterien.</p>
                    <button
                      type="button"
                      onClick={() => { setSearchTerm(''); setFilterCategory(''); }}
                      className="mt-2 text-sm text-primary-600 hover:underline font-semibold cursor-pointer"
                    >
                      Filter zurücksetzen
                    </button>
                  </>
                ) : (
                  <p>Keine Ausgaben in diesem Zeitraum gefunden.</p>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Ausgaben Cards (md:hidden) */}
                <div className="md:hidden space-y-2.5 p-3">
                  {filteredAusgaben.map(ausgabe => {
                    const isPaid = !ausgabe.status || ausgabe.status === 'Bezahlt';
                    const isOverdue = ausgabe.faellig_am && new Date(ausgabe.faellig_am) < new Date();

                    return (
                      <div
                        key={ausgabe.id}
                        onClick={() => {
                          if (userRole !== 'treuhand') {
                            handleOpenEdit(ausgabe);
                          }
                        }}
                        className="p-3.5 bg-white border border-border rounded-2xl shadow-xs active:bg-neutral-50 transition-all flex flex-col gap-2.5 cursor-pointer relative"
                      >
                        {/* Row 1: Date, Category & Status */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary font-medium text-[11px]">
                              {formatDate(ausgabe.beleg_datum)}
                            </span>
                            <span className="bg-neutral-100 text-text-secondary px-2 py-0.5 rounded-md text-[10px] font-semibold">
                              {ausgabe.kategorie || 'Sonstiges'}
                            </span>
                          </div>

                          <div>
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Bezahlt
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOverdue
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                {isOverdue ? 'Überfällig' : 'Offen'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Title, Project & Gross Amount */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-text-primary truncate">
                              {ausgabe.titel || 'Unbenannte Ausgabe'}
                            </h4>
                            {ausgabe.projekte?.name && (
                              <p className="text-xs text-primary-600 font-medium truncate mt-0.5 flex items-center gap-1">
                                <IconBuilding className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                                <span>{ausgabe.projekte.name}</span>
                              </p>
                            )}
                            {ausgabe.faellig_am && !isPaid && (
                              <p className="text-[11px] text-text-secondary mt-0.5">
                                Fällig: {formatDate(ausgabe.faellig_am)}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-extrabold text-text-primary">
                              {formatCurrency(ausgabe.betrag_brutto)}
                            </div>
                            <div className="text-[10px] text-text-secondary font-medium">
                              inkl. {ausgabe.mwst_satz ?? 8.1}% MWST
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Action Bar (Beleg View, Pay toggle, Edit, Delete) */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {ausgabe.beleg_url ? (
                              <a
                                href={ausgabe.beleg_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-text-primary rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Beleg anzeigen"
                              >
                                <IconAttachment className="w-3.5 h-3.5 text-text-secondary" />
                                <span>Beleg</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-neutral-300 inline-block mr-1" /> Kein Beleg
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isPaid && userRole !== 'treuhand' && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(ausgabe)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <IconCheck className="w-3.5 h-3.5 text-emerald-800" />
                                Bezahlt
                              </button>
                            )}
                            {userRole !== 'treuhand' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(ausgabe)}
                                  className="px-2 py-1 text-text-secondary hover:text-text-primary rounded-lg text-[11px] font-semibold cursor-pointer"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestDelete(ausgabe)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Löschen"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (hidden md:table) */}
                <table className="hidden md:table w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                    <th className="font-semibold py-3 px-4">Datum</th>
                    <th className="font-semibold py-3 px-4">Titel</th>
                    <th className="font-semibold py-3 px-4">Kategorie</th>
                    <th className="font-semibold py-3 px-4 text-center">Status</th>
                    <th className="font-semibold py-3 px-4 text-center">Beleg</th>
                    <th className="font-semibold py-3 px-4 text-right">MwSt</th>
                    <th className="font-semibold py-3 px-4 text-right">Brutto</th>
                    {userRole !== 'treuhand' && <th className="font-semibold py-3 px-4 text-right">Aktionen</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAusgaben.map(ausgabe => (
                    <tr key={ausgabe.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(ausgabe.beleg_datum)}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-text-primary">
                        {ausgabe.titel}
                        {ausgabe.projekte?.name && (
                          <div className="text-xs text-gray-500 font-normal mt-0.5 max-w-[200px] truncate">
                            {onNavigate && ausgabe.projekt_id ? (
                              <button
                                type="button"
                                onClick={() => onNavigate('projekte', { projektId: ausgabe.projekt_id })}
                                className="text-primary-600 hover:underline font-medium cursor-pointer text-left inline-flex items-center gap-1"
                                title={`Zu Projekt "${ausgabe.projekte.name}" wechseln`}
                              >
                                <span>Projekt: {ausgabe.projekte.name}</span>
                              </button>
                            ) : (
                              <span>Projekt: {ausgabe.projekte.name}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
                          {ausgabe.kategorie}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        {(!ausgabe.status || ausgabe.status === 'Bezahlt') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Bezahlt
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ausgabe.faellig_am && new Date(ausgabe.faellig_am) < new Date() 
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                ausgabe.faellig_am && new Date(ausgabe.faellig_am) < new Date() ? 'bg-red-500' : 'bg-orange-500'
                              }`}></span>
                              Offen
                            </span>
                            {ausgabe.faellig_am && (
                              <span className="text-[10px] text-gray-500 mt-1 font-medium">
                                bis {formatDate(ausgabe.faellig_am)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        {ausgabe.beleg_url ? (
                          <a 
                            href={ausgabe.beleg_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                            title="Beleg ansehen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-500 whitespace-nowrap">
                        {formatCurrency(ausgabe.mwst_betrag)} <span className="text-[10px] text-gray-400 ml-1">({ausgabe.mwst_satz}%)</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(ausgabe.betrag_brutto)}
                      </td>
                      {userRole !== 'treuhand' && (
                      <td className="py-3 px-4 text-sm text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                        {ausgabe.status === 'Offen' && (
                          <button 
                            onClick={() => handleMarkAsPaid(ausgabe)}
                            className="text-gray-400 hover:text-emerald-600 transition-colors mr-2 flex items-center gap-1 bg-white border border-gray-200 px-3 py-2 min-h-[48px] rounded-lg shadow-sm hover:shadow cursor-pointer"
                            title="Als bezahlt markieren"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-sm font-semibold">Bezahlt</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(ausgabe)}
                          className="text-gray-400 hover:text-primary-600 transition-colors p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-primary-50 cursor-pointer"
                          title="Bearbeiten"
                        >
                          <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => handleRequestDelete(ausgabe)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Löschen"
                        >
                          <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: OFFENE POSTEN (OP-LISTE / DEBITOREN) ===================== */}
      {activeTab === 'op_liste' && (
        <div className="space-y-6">
          {/* Mobile OP-Liste Summary Cards (3-Kachel Grid) */}
          <div className="grid grid-cols-3 gap-2 sm:hidden">
            <div className="bg-surface-card border border-border p-2.5 rounded-2xl shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">Offen</span>
              <div className="text-sm font-black text-text-primary mt-0.5 truncate">{formatCurrency(totalOffeneForderungen)}</div>
              <span className="text-[9px] text-text-secondary mt-0.5 block">{openInvoices.length} Rechnungen</span>
            </div>

            <div className="bg-amber-50/40 border border-amber-200 p-2.5 rounded-2xl shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Delkredere 5%</span>
              <div className="text-sm font-black text-amber-900 mt-0.5 truncate">{formatCurrency(delkredere5Prozent)}</div>
              <span className="text-[9px] text-amber-700 mt-0.5 block">Art. 960e OR</span>
            </div>

            <div className="bg-red-50/40 border border-red-200 p-2.5 rounded-2xl shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Überfällig</span>
              <div className="text-sm font-black text-red-900 mt-0.5">{ueberfaelligCount}</div>
              <span className="text-[9px] text-red-700 mt-0.5 block">Zahlungsfrist abgelaufen</span>
            </div>
          </div>

          {/* Desktop Summary Cards */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Total Debitoren (Konto 1100)</span>
              <div className="text-2xl font-extrabold text-gray-900">{formatCurrency(totalOffeneForderungen)}</div>
              <span className="text-xs text-gray-500 mt-1 block">{openInvoices.length} unbezahlte Rechnungen</span>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm bg-amber-50/20">
              <span className="text-xs font-bold uppercase text-amber-700 block mb-1">Delkredere 5% (Art. 960e OR)</span>
              <div className="text-2xl font-extrabold text-amber-800">{formatCurrency(delkredere5Prozent)}</div>
              <span className="text-xs text-amber-600 mt-1 block">Pauschale Wertberichtigung (Konto 1109)</span>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20">
              <span className="text-xs font-bold uppercase text-emerald-700 block mb-1">Forderungen Netto</span>
              <div className="text-2xl font-extrabold text-emerald-800">{formatCurrency(nettoForderungen)}</div>
              <span className="text-xs text-emerald-600 mt-1 block">Bilanzwert nach Delkredere</span>
            </div>

            <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm bg-red-50/20">
              <span className="text-xs font-bold uppercase text-red-700 block mb-1">Überfällige Posten</span>
              <div className="text-2xl font-extrabold text-red-800">{ueberfaelligCount}</div>
              <span className="text-xs text-red-600 mt-1 block">Zahlungsfrist überschritten</span>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/30">
              <div>
                <h3 className="font-bold text-gray-900">Stichtags-Debitorenspiegel (Aging)</h3>
                <p className="text-xs text-gray-500">Stichtag: {new Date().toLocaleDateString('de-CH')} · Konform nach Schweizer Rechnungslegungsrecht (OR 957 ff.)</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsBankabgleichOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold hover:bg-sky-100 transition-colors shadow-xs cursor-pointer"
                  title="Schweizer Bankauszug (camt.054 / camt.053) einlesen"
                >
                  <IconBank className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>Bankauszug einlesen (camt)</span>
                </button>
                <button
                  onClick={handleExportOpListeCsv}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                >
                  <IconFolder className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                  <span>OP-Liste (CSV) exportieren</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {openInvoices.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <IconShieldCheck className="w-10 h-10 text-emerald-500 mb-2 mx-auto" />
                  <p className="font-medium text-gray-800">Keine offenen Debitorenforderungen vorhanden.</p>
                  <p className="text-xs text-gray-500 mt-1">Alle gestellten Rechnungen wurden vollständig beglichen.</p>
                </div>
              ) : (
                <>
                {/* Mobile OP-Liste Debitoren Cards (md:hidden) */}
                <div className="md:hidden space-y-2.5 p-3">
                  {openInvoices.map(inv => (
                    <div
                      key={inv.id}
                      onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: inv.id })}
                      className="p-3.5 bg-white border border-border rounded-2xl shadow-xs active:bg-neutral-50 transition-all flex flex-col gap-2 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-text-primary text-sm">{inv.rechnung_nr || `#${inv.id}`}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.altersstufe === '> 90 Tage' ? 'bg-red-100 text-red-800 border border-red-200' :
                          inv.altersstufe === '61–90 Tage' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          inv.altersstufe === '31–60 Tage' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          inv.altersstufe === '1–30 Tage' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {inv.altersstufe}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs text-text-primary truncate">
                            {inv.kunden?.firmenname || inv.kunden?.name || 'Kunde'}
                          </h4>
                          {inv.projekte?.name && (
                            <p className="text-[11px] text-text-secondary truncate mt-0.5 flex items-center gap-1">
                              <IconBuilding className="w-3 h-3 text-primary-600 shrink-0" />
                              <span>{inv.projekte.name}</span>
                            </p>
                          )}
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            Fällig: {formatDate(inv.faelligStr)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-text-secondary block">Offener Betrag:</span>
                          <span className="text-sm font-extrabold text-red-600 block">
                            {formatCurrency(inv.offen)}
                          </span>
                          <span className="text-[10px] text-text-secondary block">
                            Total {formatCurrency(inv.total)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                        <span className="text-text-secondary text-[11px]">
                          {inv.tageUeberfaellig > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <IconWarning className="w-3.5 h-3.5 text-red-600" />
                              {inv.tageUeberfaellig} Tage überfällig
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Im Zahlungsziel
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-primary-600 flex items-center gap-1 text-xs">
                          Rechnung öffnen →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (hidden md:table) */}
                <table className="hidden md:table w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                      <th className="font-semibold py-3 px-4">Rechnung</th>
                      <th className="font-semibold py-3 px-4">Kunde</th>
                      <th className="font-semibold py-3 px-4">Projekt</th>
                      <th className="font-semibold py-3 px-4">Fällig am</th>
                      <th className="font-semibold py-3 px-4 text-right">Total</th>
                      <th className="font-semibold py-3 px-4 text-right">Bezahlt</th>
                      <th className="font-semibold py-3 px-4 text-right">Offen</th>
                      <th className="font-semibold py-3 px-4 text-center">Altersstruktur</th>
                      <th className="font-semibold py-3 px-4 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openInvoices.map(inv => (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 text-sm font-bold text-gray-900">
                          {inv.rechnung_nr || `#${inv.id}`}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                          {inv.kunden?.firmenname || inv.kunden?.name || 'Kunde'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {inv.projekte?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(inv.faelligStr)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-700">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-emerald-600 font-medium">
                          {formatCurrency(inv.bezahlt)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(inv.offen)}
                        </td>
                        <td className="py-3 px-4 text-sm text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            inv.altersstufe === '> 90 Tage' ? 'bg-red-100 text-red-800 border border-red-200' :
                            inv.altersstufe === '61–90 Tage' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            inv.altersstufe === '31–60 Tage' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            inv.altersstufe === '1–30 Tage' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {inv.altersstufe}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right whitespace-nowrap">
                          {onNavigate && (
                            <button
                              onClick={() => onNavigate('rechnungen', { rechnungId: inv.id })}
                              className="text-primary-600 hover:text-primary-800 hover:underline font-semibold text-xs cursor-pointer"
                            >
                              Öffnen →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: ESTV MWST (FORMULAR 200) ===================== */}
      {activeTab === 'estv_mwst' && (
        <div className="space-y-6">
          {/* Method Info Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-xs sm:shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <IconSwissFlag className="w-5 h-5 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Eidgenössische Steuerverwaltung (ESTV) - Formular 200</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Abrechnungsperiode: <strong>{filterQuarter !== 'All' ? `${filterQuarter} ${filterYear}` : `Steuerjahr ${filterYear}`}</strong> · 
                Methode: <strong>{isSaldo ? `Saldosteuersatz (${settings.saldosteuersatz}% - Art. 37 MWSTG)` : 'Effektive Methode (Art. 36 MWSTG)'}</strong> · 
                Abrechnungsart: <strong>{settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (Ist-Prinzip)' : 'Vereinbart (Soll-Prinzip)'}</strong>
              </p>
            </div>
            <button
              onClick={handleExportEstvCsv}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-primary-700 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              <IconFolder className="w-4 h-4 shrink-0" />
              <span>ESTV-Formular (CSV) herunterladen</span>
            </button>
          </div>

          {/* Mobile ESTV Formular 200 Kennziffern Cards (md:hidden) */}
          <div className="md:hidden space-y-3">
            {/* Section I: Umsatz */}
            <div className="bg-white border border-border rounded-2xl p-3.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">I. Umsatz</span>
                <span className="text-[10px] text-text-secondary font-medium">ESTV Form. 200</span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 font-mono font-bold text-xs rounded">Ziff. 200</span>
                    <span className="text-xs font-medium text-text-primary truncate">Gesamtumsatz (inkl. MWST)</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">Vereinbarte / Vereinnahmte Entgelte</p>
                </div>
                <div className="font-bold text-sm text-text-primary text-right shrink-0">
                  {formatCurrency(kpis.einnahmen)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 font-mono font-semibold text-xs rounded">Ziff. 220</span>
                    <span className="text-xs text-text-secondary truncate">Steuerbefreit / Ausland</span>
                  </div>
                </div>
                <div className="text-xs text-text-secondary font-medium text-right shrink-0">
                  CHF 0.00
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 bg-neutral-50/70 p-2.5 rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-800 font-mono font-bold text-xs rounded">Ziff. 289</span>
                    <span className="text-xs font-bold text-text-primary truncate">Steuerbarer Umsatz</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">Ziff. 200 abzüglich Ziff. 220</p>
                </div>
                <div className="font-extrabold text-sm text-primary-900 text-right shrink-0">
                  {formatCurrency(kpis.einnahmen)}
                </div>
              </div>
            </div>

            {/* Section II: Steuerberechnung */}
            <div className="bg-white border border-border rounded-2xl p-3.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">II. Steuerberechnung</span>
                <span className="text-[10px] text-text-secondary font-medium">{isSaldo ? `Saldo ${settings.saldosteuersatz}%` : 'Normalsatz 8.1%'}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 font-mono font-bold text-xs rounded">
                      {isSaldo ? 'Ziff. 381' : 'Ziff. 302'}
                    </span>
                    <span className="text-xs font-medium text-text-primary truncate">
                      {isSaldo ? `Saldosteuersatz (${settings.saldosteuersatz}%)` : 'Leistungen zum Normalsatz (8.1%)'}
                    </span>
                  </div>
                </div>
                <div className="font-bold text-sm text-text-primary text-right shrink-0">
                  {formatCurrency(kpis.geschuldeteMwst)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 bg-neutral-50/70 p-2.5 rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-800 font-mono font-bold text-xs rounded">Ziff. 382</span>
                    <span className="text-xs font-bold text-text-primary truncate">Total geschuldete MWST</span>
                  </div>
                </div>
                <div className="font-extrabold text-sm text-primary-900 text-right shrink-0">
                  {formatCurrency(kpis.geschuldeteMwst)}
                </div>
              </div>
            </div>

            {/* Section III: Vorsteuerabzug */}
            <div className="bg-white border border-border rounded-2xl p-3.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">III. Vorsteuerabzug</span>
                <span className="text-[10px] text-text-secondary font-medium">{isSaldo ? 'Entfällt bei Saldo' : 'Effektiv'}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 font-mono font-semibold text-xs rounded">Ziff. 400</span>
                    <span className="text-xs font-medium text-text-primary truncate">Vorsteuer Material & Aufwand</span>
                  </div>
                  {isSaldo && (
                    <p className="text-[10px] text-amber-700 mt-0.5">* Gesetzlich pauschaliert (Art. 37 MWSTG)</p>
                  )}
                </div>
                <div className="font-bold text-sm text-text-primary text-right shrink-0">
                  {formatCurrency(kpis.vorsteuer)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 bg-neutral-50/70 p-2.5 rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-800 font-mono font-bold text-xs rounded">Ziff. 410</span>
                    <span className="text-xs font-bold text-text-primary truncate">Total Vorsteuerabzug</span>
                  </div>
                </div>
                <div className="font-extrabold text-sm text-primary-900 text-right shrink-0">
                  {formatCurrency(kpis.vorsteuer)}
                </div>
              </div>
            </div>

            {/* Section IV: Zahllast / Guthaben Card */}
            <div className="bg-primary-50 border-2 border-primary-300 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-primary-600 text-white font-mono font-extrabold text-xs rounded-md">
                    Ziff. 500
                  </span>
                  <span className="text-xs font-bold text-primary-950 uppercase tracking-wide">
                    {kpis.zahllast >= 0 ? 'ESTV Zahllast' : 'Guthaben / Rückforderung'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-primary-700 bg-white/80 px-2 py-0.5 rounded-full border border-primary-200">
                  {filterQuarter !== 'All' ? filterQuarter : `Jahr ${filterYear}`}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-primary-800">
                  {kpis.zahllast >= 0 ? 'Zu bezahlender Betrag:' : 'Rückforderbarer Betrag:'}
                </span>
                <span className="text-xl font-extrabold text-primary-950">
                  {formatCurrency(Math.abs(kpis.zahllast))}
                </span>
              </div>
            </div>
          </div>

          {/* Official Formular 200 Card (hidden md:block) */}
          <div className="hidden md:block bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/60 border-b border-gray-200 font-bold text-sm text-gray-800">
              Deklarationsaufstellung für das offizielle MWST-Abrechnungsportal (ePortal ESTV)
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/30 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4 font-semibold w-24">Ziffer</th>
                  <th className="py-3 px-4 font-semibold">Offizielle Bezeichnung gemäss MWST-Formular 200</th>
                  <th className="py-3 px-4 font-semibold text-right w-44">Betrag (CHF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {/* I. UMSATZ */}
                <tr className="bg-gray-50/50 font-bold text-gray-900 text-xs uppercase tracking-wider">
                  <td colSpan={3} className="py-2.5 px-4">I. Umsatz</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono font-bold text-primary-700">200</td>
                  <td className="py-3 px-4 text-gray-800">
                    Vereinbarte / Vereinnahmte Entgelte (Gesamtumsatz inkl. MWST)
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(kpis.einnahmen)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-gray-500">220</td>
                  <td className="py-3 px-4 text-gray-600">
                    Leistungen im Ausland / von der Steuer befreit
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    0.00
                  </td>
                </tr>
                <tr className="bg-gray-50/30 font-semibold">
                  <td className="py-3 px-4 font-mono font-bold text-primary-700">289</td>
                  <td className="py-3 px-4 text-gray-900">
                    Steuerbarer Gesamtumsatz (Ziffer 200 abzüglich Ziffer 220)
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(kpis.einnahmen)}
                  </td>
                </tr>

                {/* II. STEUERBERECHNUNG */}
                <tr className="bg-gray-50/50 font-bold text-gray-900 text-xs uppercase tracking-wider">
                  <td colSpan={3} className="py-2.5 px-4">II. Steuerberechnung</td>
                </tr>
                {isSaldo ? (
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-primary-700">381</td>
                    <td className="py-3 px-4 text-gray-800">
                      Saldosteuersatz ({settings.saldosteuersatz}% auf Gesamtumsatz Ziffer 289)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(kpis.geschuldeteMwst)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-primary-700">302</td>
                    <td className="py-3 px-4 text-gray-800">
                      Leistungen zum Normalsatz (8.1%)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(kpis.geschuldeteMwst)}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50/30 font-semibold">
                  <td className="py-3 px-4 font-mono font-bold text-primary-700">382</td>
                  <td className="py-3 px-4 text-gray-900">
                    Total geschuldete MWST
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(kpis.geschuldeteMwst)}
                  </td>
                </tr>

                {/* III. VORSTEUERABZUG */}
                <tr className="bg-gray-50/50 font-bold text-gray-900 text-xs uppercase tracking-wider">
                  <td colSpan={3} className="py-2.5 px-4">III. Vorsteuerabzug</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-gray-600">400</td>
                  <td className="py-3 px-4 text-gray-800">
                    Vorsteuer auf Material- und Dienstleistungsaufwand
                    {isSaldo && (
                      <span className="block text-xs text-amber-700 mt-0.5">
                        * Bei Saldosteuersatz (Art. 37 MWSTG) entfällt der Vorsteuerabzug gesetzlich.
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {formatCurrency(kpis.vorsteuer)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-gray-500">405</td>
                  <td className="py-3 px-4 text-gray-600">
                    Vorsteuer auf Investitionen und übrigem Betriebsaufwand
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    0.00
                  </td>
                </tr>
                <tr className="bg-gray-50/30 font-semibold">
                  <td className="py-3 px-4 font-mono font-bold text-primary-700">410</td>
                  <td className="py-3 px-4 text-gray-900">
                    Total Vorsteuerabzug
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(kpis.vorsteuer)}
                  </td>
                </tr>

                {/* IV. ZAHLLAST / GUTHABEN */}
                <tr className="bg-primary-50/40 font-bold text-base border-t-2 border-primary-200">
                  <td className="py-4 px-4 font-mono font-extrabold text-primary-800 text-lg">500</td>
                  <td className="py-4 px-4 text-primary-900">
                    {kpis.zahllast >= 0 
                      ? 'Zu bezahlender Betrag (Zahllast an die ESTV)' 
                      : 'Guthaben der steuerpflichtigen Person (Rückforderung)'}
                  </td>
                  <td className="py-4 px-4 text-right font-extrabold text-primary-800 text-lg whitespace-nowrap">
                    {formatCurrency(Math.abs(kpis.zahllast))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ausgabe Create/Edit Modal */}
      <AusgabeCreateModal 
        isOpen={isCreateModalOpen} 
        editData={editingAusgabe}
        autoTriggerScan={autoTriggerScan}
        onClose={handleCloseModal} 
        onSave={handleSaveModal} 
      />

      {/* Delete Confirmation Modal */}
      {ausgabeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Ausgabe löschen</h3>
                <p className="text-xs text-gray-500">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Möchtest du die Ausgabe <strong className="text-gray-900 font-semibold">"{ausgabeToDelete.titel}"</strong> ({formatCurrency(ausgabeToDelete.betrag_brutto)}) wirklich unwiderruflich löschen?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAusgabeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter & Search Bottom Sheet Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-gray-200 animate-slide-up sm:animate-scale-in max-h-[85vh] flex flex-col">
            {/* Header with Title and explicit round close button (No drag bar!) */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <IconSearch className="w-4 h-4 text-primary-600" />
                <h3 className="font-bold text-base text-gray-900">Filter & Suche</h3>
                {(searchTerm || filterCategory) && (
                  <span className="text-[10px] bg-primary-50 text-primary-700 font-bold px-2 py-0.5 rounded-full border border-primary-200">
                    Aktiv
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                aria-label="Schliessen"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="py-4 space-y-4 overflow-y-auto">
              {/* Search Field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Suchbegriff
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Beleg, Projekt, Titel suchen..."
                    className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-xs rounded-full cursor-pointer"
                    >
                      <IconClose className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Kategorie
                </label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                >
                  <option value="">Alle Kategorien anzeigen</option>
                  {(categories.length > 0 ? categories : [
                    'Material', 'Fremdleistungen', 'Werkzeuge & Maschinen', 
                    'Fahrzeug & Transport', 'Büromaterial & IT', 'Miete & Nebenkosten',
                    'Versicherungen & Gebühren', 'Werbung & Marketing', 'Spesen & Verpflegung', 'Sonstiges'
                  ]).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Quarter & Year for quick access */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Periode
                  </label>
                  <select
                    value={filterQuarter}
                    onChange={e => setFilterQuarter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-primary-700 focus:bg-white outline-none"
                  >
                    <option value="All">Ganzes Jahr</option>
                    <option value="Q1">Q1 (Jan–Mär)</option>
                    <option value="Q2">Q2 (Apr–Jun)</option>
                    <option value="Q3">Q3 (Jul–Sep)</option>
                    <option value="Q4">Q4 (Okt–Dez)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Steuerjahr
                  </label>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white outline-none"
                  >
                    <option value={currentYear.toString()}>{currentYear}</option>
                    <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
                    <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFilterCategory('')
                }}
                disabled={!searchTerm && !filterCategory}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Filter anwenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <span>
              {toast.type === 'success' ? (
                <IconCheck className="w-4 h-4 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <IconWarning className="w-4 h-4 text-red-600" />
              ) : (
                <IconDocument className="w-4 h-4 text-blue-600" />
              )}
            </span>
            <span>{toast.text}</span>
            <button 
              type="button" 
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {isBankabgleichOpen && (
        <BankabgleichModal
          isOpen={isBankabgleichOpen}
          onClose={() => setIsBankabgleichOpen(false)}
          onSuccess={handleBankabgleichSuccess}
          invoices={allInvoices}
        />
      )}
    </div>
  )
}
