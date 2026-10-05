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
import { useModalHistory } from '../hooks/useModalHistory'

export default function BuchhaltungView({ onNavigate, userRole }) {
  const [ausgaben, setAusgaben] = useState([])
  const [einnahmen, setEinnahmen] = useState([])
  const [allInvoices, setAllInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [autoTriggerScan, setAutoTriggerScan] = useState(false)
  const [editingAusgabe, setEditingAusgabe] = useState(null)
  const [activeTab, setActiveTab] = useState('ausgaben') // 'ausgaben', 'op_liste', 'estv_mwst'
  const [bananaMenuOpen, setBananaMenuOpen] = useState(false)

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

  const [searchTerm, setSearchTerm] = useState('')
  const [ausgabeToDelete, setAusgabeToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Buchhaltung & Steuern (OR 957 ff.)</h2>
          <p className="text-text-secondary mt-1">
            Schweizer KMU-Buchhaltung, ESTV-Mehrwertsteuer & Revisions-Exporte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <button 
            onClick={handleExportZIP}
            disabled={isExporting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-white text-gray-700 border border-gray-300 font-semibold text-base sm:text-sm rounded-xl hover:bg-gray-50 active:scale-[0.97] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            title="Vollständiges Revisions-ZIP nach Schweizer Recht (OR 957ff. & GeBüV)"
          >
            {isExporting ? (
              <svg className="animate-spin w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            {isExporting ? 'Exportiere...' : 'Treuhand-ZIP'}
          </button>

          {/* Banana Export Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setBananaMenuOpen(!bananaMenuOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-white text-gray-700 border border-gray-300 font-semibold text-base sm:text-sm rounded-xl hover:bg-gray-50 active:scale-[0.97] transition-all shadow-sm cursor-pointer"
              title="Banana Buchhaltung Export (KMU-Kontenrahmen)"
            >
              <span>🍌</span>
              <span>Banana-Export</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {bananaMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBananaMenuOpen(false)}></div>
                <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-40 p-1 animate-scale-in">
                  <button
                    onClick={() => handleExportBanana('doppelt')}
                    className="w-full text-left p-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-gray-900">Doppelte Buchhaltung</span>
                    <span className="text-xs text-gray-500">Faktura 1100 an 3200 + Zahlung 1020 an 1100 + Skonto 3800</span>
                  </button>
                  <button
                    onClick={() => handleExportBanana('kassa')}
                    className="w-full text-left p-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700 flex flex-col gap-0.5 cursor-pointer border-t border-gray-100"
                  >
                    <span className="font-semibold text-gray-900">Kassenbuch (Einfach)</span>
                    <span className="text-xs text-gray-500">Direkt Bank (1020) an Ertrag (3200)</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {userRole !== 'treuhand' && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => {
                  setEditingAusgabe(null)
                  setAutoTriggerScan(true)
                  setIsCreateModalOpen(true)
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base sm:text-sm rounded-xl active:scale-[0.97] transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                title="Beleg mit Google Gemini KI automatisch auslesen"
              >
                <span>✨</span>
                <span>Beleg scannen</span>
              </button>
              <button 
                onClick={() => {
                  setEditingAusgabe(null)
                  setAutoTriggerScan(false)
                  setIsCreateModalOpen(true)
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-semibold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
              >
                <span className="text-lg">+</span>
                Ausgabe erfassen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schweizer Treuhand KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tile 1: Einnahmen */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Einnahmen (Umsatz)</h3>
            </div>
            <p className="text-xl font-bold text-emerald-600 truncate">{formatCurrency(kpis.einnahmen)}</p>
            <div className="text-[10px] text-text-secondary mt-1">
              {settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (Ist)' : 'Vereinbart (Soll)'}
            </div>
          </div>
        </div>

        {/* Tile 2: Ausgaben */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Ausgaben (Aufwand)</h3>
            </div>
            <p className="text-xl font-bold text-red-600 truncate">{formatCurrency(kpis.ausgaben)}</p>
            <div className="text-[10px] text-text-secondary mt-1">{filterQuarter !== 'All' ? filterQuarter : filterYear}</div>
          </div>
        </div>

        {/* Tile 3: Gewinn */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Gewinn (EAR)</h3>
            </div>
            <p className={`text-xl font-bold truncate ${kpis.gewinn >= 0 ? 'text-primary-600' : 'text-red-600'}`}>{formatCurrency(kpis.gewinn)}</p>
            <div className="text-[10px] text-text-secondary mt-1">{filterQuarter !== 'All' ? filterQuarter : filterYear}</div>
          </div>
        </div>

        {/* Tile 4: Vorsteuer */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Vorsteuer (Konto 1170)</h3>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">
              {isSaldo ? 'CHF 0.00' : formatCurrency(kpis.vorsteuer)}
            </p>
            <div className="text-[10px] text-text-secondary mt-1">
              {isSaldo ? 'Kein Abzug (Saldosteuer)' : 'Vorsteuerabzug'}
            </div>
          </div>
        </div>

        {/* Tile 5: MWST Zahllast / Saldo */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">
                {kpis.zahllast >= 0 ? 'MWST Zahllast (Ziff. 500)' : 'MWST Guthaben'}
              </h3>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(Math.abs(kpis.zahllast))}</p>
            <div className="text-[10px] text-text-secondary mt-1">
              {isSaldo ? `Saldosteuersatz ${settings.saldosteuersatz}%` : 'Normalsatz 8.1%'}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200/80 pb-3">
        <button
          data-testid="tab-ausgaben"
          onClick={() => setActiveTab('ausgaben')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'ausgaben'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <span>🧾</span>
          <span>Ausgaben & Belege</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'ausgaben' ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {filteredAusgaben.length}
          </span>
        </button>

        <button
          data-testid="tab-op-liste"
          onClick={() => setActiveTab('op_liste')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'op_liste'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <span>📋</span>
          <span>Offene Posten (OP-Liste)</span>
          {openInvoices.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'op_liste' ? 'bg-primary-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
              {openInvoices.length}
            </span>
          )}
        </button>

        <button
          data-testid="tab-estv-mwst"
          onClick={() => setActiveTab('estv_mwst')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'estv_mwst'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <span>🇨🇭</span>
          <span>ESTV MWST (Formular 200)</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
            isSaldo 
              ? (activeTab === 'estv_mwst' ? 'bg-primary-700 text-white' : 'bg-purple-100 text-purple-800')
              : (activeTab === 'estv_mwst' ? 'bg-primary-700 text-white' : 'bg-emerald-100 text-emerald-800')
          }`}>
            {isSaldo ? `Saldo ${settings.saldosteuersatz}%` : 'Effektiv'}
          </span>
        </button>
      </div>

      {/* ===================== TAB 1: AUSGABEN & BELEGE ===================== */}
      {activeTab === 'ausgaben' && (
        <div className="bg-white border border-gray-200/60 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col min-h-[500px]">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-gray-50/30">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-text-primary">Ausgaben / Belege</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {filteredAusgaben.length} {filteredAusgaben.length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* Search Input */}
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  placeholder="Ausgabe oder Projekt suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer text-sm"
                    title="Suche zurücksetzen"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Alle Kategorien</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={filterQuarter}
                onChange={e => setFilterQuarter(e.target.value)}
                className="px-3 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-primary-700 bg-primary-50"
              >
                <option value="All">Ganzes Jahr</option>
                <option value="Q1">Q1 (Jan-Mär)</option>
                <option value="Q2">Q2 (Apr-Jun)</option>
                <option value="Q3">Q3 (Jul-Sep)</option>
                <option value="Q4">Q4 (Okt-Dez)</option>
              </select>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value={currentYear.toString()}>{currentYear}</option>
                <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
                <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
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
                <div className="text-3xl mb-2">🧾</div>
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
              <table className="w-full text-left border-collapse min-w-[700px]">
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
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: OFFENE POSTEN (OP-LISTE / DEBITOREN) ===================== */}
      {activeTab === 'op_liste' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <button
                onClick={handleExportOpListeCsv}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
              >
                <span>📥</span> OP-Liste (CSV) exportieren
              </button>
            </div>

            <div className="overflow-x-auto">
              {openInvoices.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-medium text-gray-800">Keine offenen Debitorenforderungen vorhanden.</p>
                  <p className="text-xs text-gray-500 mt-1">Alle gestellten Rechnungen wurden vollständig beglichen.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[750px]">
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: ESTV MWST (FORMULAR 200) ===================== */}
      {activeTab === 'estv_mwst' && (
        <div className="space-y-6">
          {/* Method Info Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇨🇭</span>
                <h3 className="text-lg font-bold text-gray-900">Eidgenössische Steuerverwaltung (ESTV) - Formular 200</h3>
              </div>
              <p className="text-sm text-gray-600">
                Abrechnungsperiode: <strong>{filterQuarter !== 'All' ? `${filterQuarter} ${filterYear}` : `Steuerjahr ${filterYear}`}</strong> · 
                Methode: <strong>{isSaldo ? `Saldosteuersatz (${settings.saldosteuersatz}% - Art. 37 MWSTG)` : 'Effektive Methode (Art. 36 MWSTG)'}</strong> · 
                Abrechnungsart: <strong>{settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (Ist-Prinzip)' : 'Vereinbart (Soll-Prinzip)'}</strong>
              </p>
            </div>
            <button
              onClick={handleExportEstvCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <span>📥</span> ESTV-Formular (CSV) herunterladen
            </button>
          </div>

          {/* Official Formular 200 Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <span>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{toast.text}</span>
            <button 
              type="button" 
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
