import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CameraCapture from '../components/CameraCapture'
import { getTenantStoragePath, extractStoragePath } from '../lib/storageHelper'
import { formatCurrency } from '../lib/formatters'
import {
  IconFolder,
  IconDocument,
  IconImage,
  IconNotes,
  IconAttachment,
  IconClose,
  IconRefresh,
  IconCamera,
  IconEye,
  IconLink,
  IconEdit,
  IconTrash,
  IconLegal,
  IconCheck,
  IconWarning,
  IconInfo
} from '../components/icons/BrandIcons'

const FolderIcon = ({ className = "w-10 h-10 text-amber-400" }) => (
  <IconFolder className={className} />
)

const STANDARD_CATEGORIES = ['Offerten', 'Rechnungen', 'Fotos & Pläne', 'Allgemeine Dokumente']

const normalizeCategory = (cat, typ) => {
  if (!cat) {
    return typ?.includes('image') ? 'Fotos & Pläne' : 'Allgemeine Dokumente'
  }
  if (cat === 'Offerte' || cat === 'Offerten') return 'Offerten'
  if (cat === 'Rechnung' || cat === 'Rechnungen' || cat === 'Buchhaltung' || cat === 'Beleg') return 'Rechnungen'
  if (cat === 'Fotos & Pläne' || cat.includes('Foto') || cat.includes('Plan') || typ?.includes('image')) return 'Fotos & Pläne'
  return 'Allgemeine Dokumente'
}

const FileIcon = ({ typ, className = "w-10 h-10" }) => {
  if (!typ) return <IconAttachment className={className} />
  if (typ.includes('pdf')) return <IconDocument className={className} />
  if (typ.includes('image')) return <IconImage className={className} />
  if (typ.includes('word') || typ.includes('document')) return <IconNotes className={className} />
  return <IconAttachment className={className} />
}

export default function DateienView({ onNavigate, userRole, globalSettings }) {
  const [dateien, setDateien] = useState([])
  const [kunden, setKunden] = useState([])
  const [projekte, setProjekte] = useState([])
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  
  const [isUploading, setIsUploading] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Mobile Bottom Sheets & Refs
  const fileInputRef = useRef(null)
  const [selectedFileForSheet, setSelectedFileForSheet] = useState(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  // Modals & Toast
  const [uploadModal, setUploadModal] = useState(null)
  const [renameModal, setRenameModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [showCamera, setShowCamera] = useState(false)

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  // Navigation State (Breadcrumbs & Drilldown)
  const [currentPath, setCurrentPath] = useState([{ type: 'root', id: 'root', name: 'Archiv' }])
  const currentFolder = currentPath[currentPath.length - 1]
  const previousFolder = currentPath.length > 1 ? currentPath[currentPath.length - 2] : null

  const handleGoBack = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1))
      setSearchTerm('')
    }
  }

  // Tree State
  const [isKundenExpanded, setIsKundenExpanded] = useState(false)
  const [treeSearch, setTreeSearch] = useState('')

  // Recent files state
  const [recentFiles, setRecentFiles] = useState(() => {
    try {
      const stored = localStorage.getItem('atelier77_recent_files')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const recentDateienList = useMemo(() => {
    if (!recentFiles.length || !dateien.length) return []
    const dateienMap = new Map(dateien.map(d => [d.id, d]))
    return recentFiles.map(rf => {
      const file = dateienMap.get(rf.id)
      return file ? { ...file, openedAt: rf.openedAt } : null
    }).filter(Boolean).slice(0, 8)
  }, [recentFiles, dateien])

  const handleOpenFile = (file) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.id !== file.id)
      const updated = [{ id: file.id, openedAt: Date.now() }, ...filtered].slice(0, 25)
      localStorage.setItem('atelier77_recent_files', JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!supabase) return
    try {
      setIsLoading(true)
      const [dateienRes, kundenRes, projekteRes, offertenRes, rechnungenRes] = await Promise.all([
        supabase.from('dateien').select('*, kunden(name, firmenname), projekte(name)').order('created_at', { ascending: false }),
        supabase.from('kunden').select('*').order('name'),
        supabase.from('projekte').select('*').order('name'),
        supabase.from('offerten').select('id, offerte_nr, total, status, created_at, pdf_url, kunden_id, projekt_id').order('created_at', { ascending: false }),
        supabase.from('rechnungen').select('id, rechnung_nr, total, status, created_at, pdf_url, kunden_id, projekt_id').order('created_at', { ascending: false })
      ])

      if (dateienRes.error) throw dateienRes.error
      if (kundenRes.error) throw kundenRes.error
      if (projekteRes.error) throw projekteRes.error

      setDateien(dateienRes.data || [])
      setKunden(kundenRes.data || [])
      setProjekte(projekteRes.data || [])
      setOfferten(offertenRes?.data || [])
      setRechnungen(rechnungenRes?.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      showToast('error', 'Fehler beim Laden der Dateien.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = (folder) => {
    setSearchTerm('')
    
    // Find index if already in path (clicking a breadcrumb)
    const idx = currentPath.findIndex(p => p.id === folder.id)
    if (idx !== -1) {
      setCurrentPath(currentPath.slice(0, idx + 1))
      return
    }

    // Otherwise append
    setCurrentPath([...currentPath, folder])
  }

  const mergeDocumentFiles = (physicalFiles, liveDocs, type) => {
    const result = []
    const matchedPhysicalIds = new Set()

    liveDocs.forEach(doc => {
      const docNr = type === 'offerte' ? doc.offerte_nr : doc.rechnung_nr
      const matching = physicalFiles.find(d => 
        (type === 'offerte' && d.offerte_id === doc.id) ||
        (type === 'rechnung' && d.rechnung_id === doc.id) ||
        (doc.pdf_url && d.url === doc.pdf_url) ||
        (docNr && d.name && d.name.includes(docNr))
      )

      if (matching) {
        matchedPhysicalIds.add(matching.id)
        result.push({
          ...matching,
          isDocument: true,
          docType: type,
          docId: doc.id,
          docNr: docNr || (type === 'offerte' ? `OFF #${doc.id}` : `RE #${doc.id}`),
          docStatus: doc.status,
          docTotal: doc.total,
          kunde_id: doc.kunden_id || matching.kunde_id,
          projekt_id: doc.projekt_id || matching.projekt_id,
        })
      } else {
        result.push({
          id: `live_${type}_${doc.id}`,
          name: `${type === 'offerte' ? 'Offerte' : 'Rechnung'}_${docNr || doc.id}.pdf`,
          typ: 'application/pdf',
          url: doc.pdf_url || null,
          size_bytes: null,
          created_at: doc.created_at,
          kategorie: type === 'offerte' ? 'Offerte' : 'Rechnung',
          isDocument: true,
          isLiveOnly: !doc.pdf_url,
          docType: type,
          docId: doc.id,
          docNr: docNr || (type === 'offerte' ? `OFF #${doc.id}` : `RE #${doc.id}`),
          docStatus: doc.status,
          docTotal: doc.total,
          kunde_id: doc.kunden_id,
          projekt_id: doc.projekt_id,
        })
      }
    })

    physicalFiles.forEach(f => {
      if (!matchedPhysicalIds.has(f.id)) {
        result.push(f)
      }
    })

    return result
  }

  // Determine contents of current folder
  const currentContents = useMemo(() => {
    let folders = []
    let files = []

    if (currentFolder.id === 'root') {
      folders = [
        { type: 'system', id: 'recent_root', name: 'Zuletzt geöffnet' },
        { type: 'system', id: 'kunden_root', name: 'Kunden' },
        { type: 'system', id: 'offerten_root', name: 'Offerten' },
        { type: 'system', id: 'buchhaltung_root', name: 'Buchhaltung & Rechnungen' },
        { type: 'system', id: 'intern_root', name: 'Firma Intern' }
      ]
      files = dateien.filter(d => !d.kunde_id && !d.projekt_id && d.kategorie !== 'Firma intern' && normalizeCategory(d.kategorie, d.typ) === 'Allgemeine Dokumente')
    } 
    else if (currentFolder.id === 'kunden_root') {
      folders = kunden.map(k => ({ type: 'kunde', id: `kunde_${k.id}`, dbId: k.id, name: k.name || k.firmenname }))
      files = []
    }
    else if (currentFolder.id === 'offerten_root') {
      const phys = dateien.filter(d => normalizeCategory(d.kategorie, d.typ) === 'Offerten')
      files = mergeDocumentFiles(phys, offerten, 'offerte')
    }
    else if (currentFolder.id === 'buchhaltung_root') {
      const phys = dateien.filter(d => normalizeCategory(d.kategorie, d.typ) === 'Rechnungen')
      files = mergeDocumentFiles(phys, rechnungen, 'rechnung')
    }
    else if (currentFolder.id === 'intern_root') {
      files = dateien.filter(d => d.kategorie === 'Firma intern')
    }
    else if (currentFolder.id === 'recent_root') {
      const dateienMap = new Map(dateien.map(d => [d.id, d]))
      files = recentFiles.map(rf => {
        const file = dateienMap.get(rf.id)
        return file ? { ...file, openedAt: rf.openedAt } : null
      }).filter(Boolean)
      folders = []
    }
    else if (currentFolder.type === 'kunde') {
      const kProjekte = projekte.filter(p => p.kunden_id === currentFolder.dbId).map(p => ({
        type: 'projekt', id: `proj_${p.id}`, dbId: p.id, name: p.name, kunden_id: currentFolder.dbId
      }))
      
      const categoryFolders = STANDARD_CATEGORIES.map(cat => ({
        type: 'kategorie', id: `cat_kunde_${currentFolder.dbId}_${cat}`, name: cat, dbId: currentFolder.dbId, parentType: 'kunde'
      }))

      folders = [...kProjekte, ...categoryFolders]
      files = []
    }
    else if (currentFolder.type === 'projekt') {
      const categoryFolders = STANDARD_CATEGORIES.map(cat => ({
        type: 'kategorie', id: `cat_proj_${currentFolder.dbId}_${cat}`, name: cat, dbId: currentFolder.dbId, parentType: 'projekt'
      }))
      folders = categoryFolders
      files = []
    }
    else if (currentFolder.type === 'kategorie') {
      const cat = currentFolder.name
      
      if (currentFolder.parentType === 'projekt') {
        const projId = currentFolder.dbId

        if (cat === 'Offerten') {
          const phys = dateien.filter(d => d.projekt_id === projId && normalizeCategory(d.kategorie, d.typ) === 'Offerten')
          const live = offerten.filter(o => o.projekt_id === projId)
          files = mergeDocumentFiles(phys, live, 'offerte')
        } else if (cat === 'Rechnungen') {
          const phys = dateien.filter(d => d.projekt_id === projId && normalizeCategory(d.kategorie, d.typ) === 'Rechnungen')
          const live = rechnungen.filter(r => r.projekt_id === projId)
          files = mergeDocumentFiles(phys, live, 'rechnung')
        } else {
          files = dateien.filter(d => d.projekt_id === projId && normalizeCategory(d.kategorie, d.typ) === cat)
        }
      } else if (currentFolder.parentType === 'kunde') {
        const kundeId = currentFolder.dbId
        const kProjIds = projekte.filter(p => p.kunden_id === kundeId).map(p => p.id)

        if (cat === 'Offerten') {
          const phys = dateien.filter(d => (d.kunde_id === kundeId || kProjIds.includes(d.projekt_id)) && normalizeCategory(d.kategorie, d.typ) === 'Offerten')
          const live = offerten.filter(o => o.kunden_id === kundeId || kProjIds.includes(o.projekt_id))
          files = mergeDocumentFiles(phys, live, 'offerte')
        } else if (cat === 'Rechnungen') {
          const phys = dateien.filter(d => (d.kunde_id === kundeId || kProjIds.includes(d.projekt_id)) && normalizeCategory(d.kategorie, d.typ) === 'Rechnungen')
          const live = rechnungen.filter(r => r.kunden_id === kundeId || kProjIds.includes(r.projekt_id))
          files = mergeDocumentFiles(phys, live, 'rechnung')
        } else {
          files = dateien.filter(d => (d.kunde_id === kundeId || kProjIds.includes(d.projekt_id)) && normalizeCategory(d.kategorie, d.typ) === cat)
        }
      }
    }

    // Filter by search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      folders = folders.filter(f => f.name.toLowerCase().includes(lower))
      files = files.filter(f => 
        f.name.toLowerCase().includes(lower) || 
        (f.docNr && f.docNr.toLowerCase().includes(lower)) ||
        (f.docStatus && f.docStatus.toLowerCase().includes(lower))
      )
    }

    // Sort
    const sortFn = (a, b) => {
      let valA, valB
      if (sortField === 'name') {
        valA = (a.docNr || a.name).toLowerCase()
        valB = (b.docNr || b.name).toLowerCase()
      } else if (sortField === 'date') {
        valA = new Date(a.created_at || 0).getTime()
        valB = new Date(b.created_at || 0).getTime()
      } else if (sortField === 'size') {
        valA = a.size_bytes || 0
        valB = b.size_bytes || 0
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    }

    if (currentFolder.id !== 'recent_root') {
      folders.sort(sortFn)
      files.sort(sortFn)
    }

    return { folders, files }
  }, [currentFolder, dateien, kunden, projekte, offerten, rechnungen, recentFiles, searchTerm, sortField, sortDirection])


  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name

    setUploadModal({
      file,
      baseName,
      fileExt,
      name: baseName
    })

    e.target.value = null
  }

  const handleCameraCapture = (blob) => {
    const now = new Date()
    const d = now.toISOString().split('T')[0]
    const t = now.toTimeString().split(' ')[0].replace(/:/g, '-')
    const fileName = `foto_${d}_${t}.jpg`
    const file = new File([blob], fileName, { type: 'image/jpeg' })
    
    setUploadModal({
      file,
      baseName: `foto_${d}_${t}`,
      fileExt: 'jpg',
      name: `foto_${d}_${t}`
    })
  }

  const handleConfirmUpload = async () => {
    if (!uploadModal || !uploadModal.file) return
    const { file, fileExt, name } = uploadModal

    const trimmedName = name?.trim() || uploadModal.baseName
    const finalName = `${trimmedName}.${fileExt}`

    // Determine upload context
    let kunde_id = null
    let projekt_id = null
    let kategorie = 'Allgemein'

    if (currentFolder.id === 'buchhaltung_root') kategorie = 'Buchhaltung'
    else if (currentFolder.id === 'offerten_root') kategorie = 'Offerte'
    else if (currentFolder.id === 'intern_root') kategorie = 'Firma intern'
    else if (currentFolder.type === 'kategorie') {
      if (currentFolder.parentType === 'projekt') {
        projekt_id = currentFolder.dbId
        const prj = projekte.find(p => p.id === currentFolder.dbId)
        kunde_id = prj?.kunden_id || null
      } else if (currentFolder.parentType === 'kunde') {
        kunde_id = currentFolder.dbId
      }
      
      // Map back to db category logic
      let cat = currentFolder.name
      if (cat === 'Offerten') cat = 'Offerte'
      else if (cat === 'Rechnungen') cat = 'Rechnung'
      
      kategorie = cat
    }

    try {
      setIsUploading(true)
      const filePath = getTenantStoragePath(globalSettings?.tenant_id, finalName, 'dateien')

      const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('anhange').getPublicUrl(filePath)

      const payload = {
        name: finalName,
        typ: file.type || fileExt,
        url: publicUrl,
        size_bytes: file.size,
        kunde_id,
        projekt_id,
        kategorie
      }

      const { error: dbError } = await supabase.from('dateien').insert([payload])
      if (dbError) throw dbError

      showToast('success', `Datei "${finalName}" erfolgreich hochgeladen.`)
      setUploadModal(null)
      fetchData()
    } catch (err) {
      console.error('Upload error:', err)
      showToast('error', 'Upload fehlgeschlagen.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenRename = (file) => {
    if (file.isLiveOnly) {
      showToast('info', 'Live-Belege können in der jeweiligen Belegansicht angepasst werden.')
      return
    }
    const fileExt = file.name.split('.').pop()
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    setRenameModal({
      id: file.id,
      oldName: file.name,
      baseName,
      fileExt,
      name: baseName
    })
  }

  const handleConfirmRename = async () => {
    if (!renameModal) return
    const { id, fileExt, name, baseName } = renameModal
    const trimmed = name?.trim() || baseName
    const newName = `${trimmed}.${fileExt}`

    if (newName === renameModal.oldName) {
      setRenameModal(null)
      return
    }

    try {
      setIsRenaming(true)
      const { error } = await supabase.from('dateien').update({ name: newName }).eq('id', id)
      if (error) throw error
      setDateien(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d))
      showToast('success', `Datei in "${newName}" umbenannt.`)
      setRenameModal(null)
    } catch (err) {
      console.error('Rename error:', err)
      showToast('error', 'Umbenennen fehlgeschlagen.')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleRequestDelete = (file) => {
    if (file.isLiveOnly) {
      showToast('info', 'Live-Belege können in der jeweiligen Modulansicht (Offerten/Rechnungen) verwaltet werden.')
      return
    }
    setDeleteModal(file)
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal) return
    try {
      setIsDeleting(true)

      // 1. Physische Datei im Storage löschen, falls vorhanden
      if (deleteModal.url) {
        const storagePath = extractStoragePath(deleteModal.url)
        if (storagePath) {
          try {
            await supabase.storage.from('anhange').remove([storagePath])
          } catch (stErr) {
            console.warn('Storage delete warning:', stErr)
          }
        }
      }

      // 2. Datenbank-Datensatz löschen
      const { error } = await supabase.from('dateien').delete().eq('id', deleteModal.id)
      if (error) throw error

      // 3. Falls die Datei als pdf_url in rechnungen/offerten verlinkt war, Referenz leeren
      if (deleteModal.rechnung_id) {
        try {
          await supabase.from('rechnungen').update({ pdf_url: null, archiviert_am: null }).eq('id', deleteModal.rechnung_id)
        } catch (_) {}
        setRechnungen(prev => prev.map(r => r.id === deleteModal.rechnung_id ? { ...r, pdf_url: null, archiviert_am: null } : r))
      } else if (deleteModal.offerte_id) {
        try {
          await supabase.from('offerten').update({ pdf_url: null, archiviert_am: null }).eq('id', deleteModal.offerte_id)
        } catch (_) {}
        setOfferten(prev => prev.map(o => o.id === deleteModal.offerte_id ? { ...o, pdf_url: null, archiviert_am: null } : o))
      }

      setDateien(prev => prev.filter(d => d.id !== deleteModal.id))
      showToast('success', `Datei "${deleteModal.name}" wurde gelöscht.`)
      setDeleteModal(null)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('error', 'Löschen fehlgeschlagen.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleJumpToSource = (file) => {
    if (!onNavigate) return

    if (file.docType === 'rechnung' || file.rechnung_id) {
      const rid = file.docId || file.rechnung_id
      onNavigate('rechnungen', { rechnungId: rid })
      return
    }

    if (file.docType === 'offerte' || file.offerte_id) {
      const oid = file.docId || file.offerte_id
      onNavigate('offerten', { offerteId: oid })
      return
    }

    let activeTab = 'dateien'
    if (file.kategorie === 'Offerte' || file.kategorie === 'Offerten') activeTab = 'offerten'
    if (file.kategorie === 'Rechnung' || file.kategorie === 'Rechnungen') activeTab = 'rechnungen'

    if (file.projekt_id) {
      onNavigate('projekte', { projektId: file.projekt_id, activeTab })
    } else if (file.kunde_id) {
      onNavigate('kunden', { kundeId: file.kunde_id, activeTab })
    }
  }

  const handleSyncArchive = async () => {
    try {
      setIsSyncing(true)
      let syncedCount = 0
      let normalizedCount = 0

      // 1. Kategorien standardisieren
      for (const d of dateien) {
        const norm = normalizeCategory(d.kategorie, d.typ)
        if (d.kategorie !== norm && ['Upload', 'Projekt', 'Allgemein', 'Allgemeine Dateien'].includes(d.kategorie)) {
          await supabase.from('dateien').update({ kategorie: norm }).eq('id', d.id)
          normalizedCount++
        }
      }

      // 2. Bestehende Dateien mit Offerten & Rechnungen verknüpfen
      for (const o of offerten) {
        const matching = dateien.find(d => !d.offerte_id && ((o.offerte_nr && d.name.includes(o.offerte_nr)) || (o.pdf_url && d.url === o.pdf_url)))
        if (matching) {
          try {
            await supabase.from('dateien').update({ offerte_id: o.id, kategorie: 'Offerte' }).eq('id', matching.id)
            syncedCount++
          } catch (e) {
            // Spalte existiert möglicherweise noch nicht
          }
        }
      }

      for (const r of rechnungen) {
        const matching = dateien.find(d => !d.rechnung_id && ((r.rechnung_nr && d.name.includes(r.rechnung_nr)) || (r.pdf_url && d.url === r.pdf_url)))
        if (matching) {
          try {
            await supabase.from('dateien').update({ rechnung_id: r.id, kategorie: 'Rechnung' }).eq('id', matching.id)
            syncedCount++
          } catch (e) {
            // Spalte existiert möglicherweise noch nicht
          }
        }
      }

      await fetchData()
      showToast('success', `Archiv synchronisiert! ${syncedCount} Belege verknüpft, ${normalizedCount} Kategorien standardisiert.`)
    } catch (err) {
      console.error('Sync error:', err)
      showToast('error', 'Fehler bei der Archiv-Synchronisation.')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '--'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Sidebar tree filter
  const filteredKundenTree = useMemo(() => {
    if (!treeSearch) return kunden
    const lower = treeSearch.toLowerCase()
    return kunden.filter(k => (k.name || k.firmenname || '').toLowerCase().includes(lower))
  }, [kunden, treeSearch])

  // Global search when at root on mobile
  const mobileRootSearchResults = useMemo(() => {
    if (!searchTerm || currentFolder.id !== 'root') return { matchedKunden: [], matchedFiles: [] }
    const term = searchTerm.toLowerCase()
    const matchedKunden = kunden.filter(k => 
      (k.name || '').toLowerCase().includes(term) || 
      (k.firmenname || '').toLowerCase().includes(term)
    )
    const matchedFiles = dateien.filter(d => 
      (d.name || '').toLowerCase().includes(term) || 
      (d.kategorie || '').toLowerCase().includes(term) || 
      (d.kunden?.name || '').toLowerCase().includes(term) ||
      (d.projekte?.name || '').toLowerCase().includes(term) ||
      (d.docNr && d.docNr.toLowerCase().includes(term))
    )
    return { matchedKunden, matchedFiles }
  }, [searchTerm, currentFolder, kunden, dateien])

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8 bg-surface overflow-hidden">
      
      {/* Hidden file input accessible from both Desktop and Mobile */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelect} 
        disabled={isUploading} 
      />

      {/* ---------------- DESKTOP SIDEBAR (Tree) (>= md) ---------------- */}
      <div className="hidden md:flex w-64 bg-surface-card border-r border-border overflow-y-auto flex-col shrink-0">
        <div className="p-4 border-b border-border sticky top-0 bg-surface-card/90 backdrop-blur-sm z-10">
          <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            Archiv
          </h2>
        </div>
        
        <div className="p-2 flex-1 text-sm font-medium">
          
          <button 
            onClick={() => handleNavigate({ type: 'root', id: 'root', name: 'Archiv' })}
            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${currentFolder.id === 'root' ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-gray-50'}`}
          >
            <FolderIcon className="w-5 h-5 text-blue-400 shrink-0" />
            <span className="truncate">{globalSettings?.firmenname || 'Mein Unternehmen'}</span>
          </button>

          <button 
            onClick={() => {
              setCurrentPath([
                { type: 'root', id: 'root', name: 'Archiv' },
                { type: 'system', id: 'recent_root', name: 'Zuletzt geöffnet' }
              ])
            }}
            className={`mt-1 w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${currentFolder.id === 'recent_root' ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="truncate">Zuletzt geöffnet</span>
          </button>

          <div className="mt-4">
            <div className="flex items-center justify-between px-3 py-1 text-text-primary group cursor-pointer" onClick={() => setIsKundenExpanded(!isKundenExpanded)}>
              <div className="flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-amber-400" />
                <span>Kunden</span>
              </div>
              <svg className={`w-4 h-4 text-text-secondary transition-transform ${isKundenExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>

            {isKundenExpanded && (
              <div className="mt-2 ml-4 border-l border-border pl-2 space-y-1">
                <div className="px-2 mb-2 relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input 
                    type="text" 
                    placeholder="Suchen..." 
                    value={treeSearch}
                    onChange={e => setTreeSearch(e.target.value)}
                    className="w-full pl-7 pr-6 py-1 bg-gray-50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {treeSearch && (
                    <button
                      type="button"
                      onClick={() => setTreeSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full text-xs cursor-pointer"
                      title="Suche zurücksetzen"
                      aria-label="Suche zurücksetzen"
                    >
                      <IconClose className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {filteredKundenTree.map(k => (
                  <button
                    key={k.id}
                    onClick={() => {
                      setCurrentPath([
                        { type: 'root', id: 'root', name: 'Archiv' },
                        { type: 'system', id: 'kunden_root', name: 'Kunden' },
                        { type: 'kunde', id: `kunde_${k.id}`, dbId: k.id, name: k.name || k.firmenname }
                      ])
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 truncate transition-colors ${currentFolder.id === `kunde_${k.id}` ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-gray-50'}`}
                  >
                    <FolderIcon className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="truncate">{k.name || k.firmenname}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              setCurrentPath([
                { type: 'root', id: 'root', name: 'Archiv' },
                { type: 'system', id: 'offerten_root', name: 'Offerten' }
              ])
            }}
            className={`mt-1 w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${currentFolder.id === 'offerten_root' ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-gray-50'}`}
          >
            <FolderIcon className="w-5 h-5 text-indigo-400" />
            Offerten
          </button>

          <button 
            onClick={() => {
              setCurrentPath([
                { type: 'root', id: 'root', name: 'Archiv' },
                { type: 'system', id: 'buchhaltung_root', name: 'Buchhaltung' }
              ])
            }}
            className={`mt-1 w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${currentFolder.id === 'buchhaltung_root' ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-gray-50'}`}
          >
            <FolderIcon className="w-5 h-5 text-emerald-400" />
            Buchhaltung
          </button>

          <button 
            onClick={() => {
              setCurrentPath([
                { type: 'root', id: 'root', name: 'Archiv' },
                { type: 'system', id: 'intern_root', name: 'Firma Intern' }
              ])
            }}
            className={`mt-1 w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${currentFolder.id === 'intern_root' ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-gray-50'}`}
          >
            <FolderIcon className="w-5 h-5 text-gray-400" />
            Firma Intern
          </button>

        </div>
      </div>

      {/* ---------------- MAIN CONTENT CONTAINER ---------------- */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface overflow-hidden">
        
        {/* ============================================================== */}
        {/* ------------ MOBILE APPLE FILES INTERFACE (< md) ------------- */}
        {/* ============================================================== */}
        <div className="md:hidden flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-surface">
          {currentFolder.id === 'root' ? (
            /* ------------------ MOBILE ROOT VIEW ------------------ */
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-28">
              {/* Large iOS Navigation Title */}
              <div className="flex items-center justify-between mb-3 pt-1">
                <div>
                  <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Dateien</h1>
                  <p className="text-xs text-text-secondary">{globalSettings?.firmenname || 'Archiv & Dokumente'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateSheet(true)}
                  className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold hover:bg-primary-200 active:scale-95 transition-all shadow-xs"
                  title="Aktionen & Upload"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* iOS-Style Pill Search Bar */}
              <div className="relative mb-5">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Dateien durchsuchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-gray-100 dark:bg-gray-800/60 border border-transparent focus:border-primary-500 rounded-xl text-sm focus:outline-none transition-all placeholder:text-gray-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full text-xs cursor-pointer"
                    aria-label="Suche zurücksetzen"
                  >
                    <IconClose className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Global search results if searching from root */}
              {searchTerm ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Suchergebnisse für "{searchTerm}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-primary-600 font-semibold cursor-pointer"
                    >
                      Zurücksetzen
                    </button>
                  </div>

                  {mobileRootSearchResults.matchedKunden.length === 0 && mobileRootSearchResults.matchedFiles.length === 0 ? (
                    <div className="py-12 text-center text-text-secondary text-sm">
                      Keine passenden Kunden oder Dateien gefunden.
                    </div>
                  ) : (
                    <>
                      {/* Matched Kunden */}
                      {mobileRootSearchResults.matchedKunden.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-text-secondary mb-1.5 px-1">Kunden</p>
                          <div className="bg-surface-card rounded-2xl border border-border shadow-xs divide-y divide-border overflow-hidden">
                            {mobileRootSearchResults.matchedKunden.map(k => (
                              <button
                                key={k.id}
                                onClick={() => handleNavigate({ type: 'kunde', id: `kunde_${k.id}`, dbId: k.id, name: k.name || k.firmenname })}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                                    {(k.name || k.firmenname || 'K').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-text-primary text-sm truncate">{k.name || k.firmenname}</p>
                                    {k.firmenname && k.name && <p className="text-xs text-text-secondary truncate">{k.firmenname}</p>}
                                  </div>
                                </div>
                                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matched Files */}
                      {mobileRootSearchResults.matchedFiles.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-text-secondary mb-1.5 px-1">Dateien & Belege</p>
                          <div className="bg-surface-card rounded-2xl border border-border shadow-xs divide-y divide-border overflow-hidden">
                            {mobileRootSearchResults.matchedFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (file.url) {
                                    handleOpenFile(file)
                                    window.open(file.url, '_blank')
                                  } else {
                                    handleJumpToSource(file)
                                  }
                                }}
                                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileIcon typ={file.typ} className="w-8 h-8 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-text-primary text-sm truncate">
                                      {file.docNr ? `${file.docNr} • ${file.name}` : file.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                                      {file.docTotal != null ? (
                                        <span className="font-semibold text-text-primary">CHF {formatCurrency(file.docTotal)}</span>
                                      ) : (
                                        <span>{file.size_bytes ? formatBytes(file.size_bytes) : 'Datei'}</span>
                                      )}
                                      <span>•</span>
                                      <span>{new Date(file.created_at).toLocaleDateString('de-CH')}</span>
                                      {file.docStatus && (
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          file.docStatus === 'Bezahlt' || file.docStatus === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-800' :
                                          file.docStatus === 'Versendet' ? 'bg-blue-100 text-blue-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {file.docStatus}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedFileForSheet(file)
                                  }}
                                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg shrink-0 ml-2 cursor-pointer"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* SPEICHERORTE (iOS Inset-Grouped Card) */}
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 px-1">Speicherorte</p>
                    <div className="bg-surface-card rounded-2xl border border-border shadow-xs divide-y divide-border overflow-hidden">
                      {/* Kunden */}
                      <button
                        onClick={() => handleNavigate({ type: 'system', id: 'kunden_root', name: 'Kunden' })}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <FolderIcon className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary text-sm block">Kunden</span>
                            <span className="text-xs text-text-secondary block">{kunden.length} Kundenordner</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>

                      {/* Offerten */}
                      <button
                        onClick={() => handleNavigate({ type: 'system', id: 'offerten_root', name: 'Offerten' })}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <FolderIcon className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary text-sm block">Offerten</span>
                            <span className="text-xs text-text-secondary block">{offerten.length} Belege & PDF</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>

                      {/* Buchhaltung & Rechnungen */}
                      <button
                        onClick={() => handleNavigate({ type: 'system', id: 'buchhaltung_root', name: 'Buchhaltung & Rechnungen' })}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <FolderIcon className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary text-sm block">Buchhaltung & Rechnungen</span>
                            <span className="text-xs text-text-secondary block">{rechnungen.length} Belege</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>

                      {/* Firma Intern */}
                      <button
                        onClick={() => handleNavigate({ type: 'system', id: 'intern_root', name: 'Firma Intern' })}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                            <FolderIcon className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary text-sm block">Firma Intern</span>
                            <span className="text-xs text-text-secondary block">{dateien.filter(d => d.kategorie === 'Firma intern').length} interne Dokumente</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ZULETZT GEÖFFNET */}
                  {recentDateienList.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Zuletzt geöffnet</p>
                        <button
                          onClick={() => handleNavigate({ type: 'system', id: 'recent_root', name: 'Zuletzt geöffnet' })}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                        >
                          Alle anzeigen ›
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {recentDateienList.slice(0, 4).map(file => (
                          <div
                            key={file.id}
                            onClick={() => {
                              if (file.url) {
                                handleOpenFile(file)
                                window.open(file.url, '_blank')
                              } else {
                                handleJumpToSource(file)
                              }
                            }}
                            className="bg-surface-card rounded-2xl border border-border p-3.5 flex flex-col justify-between shadow-xs hover:border-primary-300 active:scale-[0.98] transition-all cursor-pointer relative group"
                          >
                            <div className="flex items-start justify-between">
                              <FileIcon typ={file.typ} className="w-10 h-10" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedFileForSheet(file)
                                }}
                                className="p-1.5 -mr-1 -mt-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                              </button>
                            </div>
                            <div className="mt-2 min-w-0">
                              <p className="font-semibold text-text-primary text-xs truncate">
                                {file.docNr ? `${file.docNr}` : file.name}
                              </p>
                              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ALLGEMEINE DOKUMENTE AUF ROOT */}
                  {currentContents.files.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 px-1">Allgemeine Dokumente</p>
                      <div className="grid grid-cols-2 gap-3">
                        {currentContents.files.map(file => (
                          <div
                            key={file.id}
                            onClick={() => {
                              if (file.url) {
                                handleOpenFile(file)
                                window.open(file.url, '_blank')
                              } else {
                                handleJumpToSource(file)
                              }
                            }}
                            className="bg-surface-card rounded-2xl border border-border p-3 flex flex-col justify-between shadow-xs hover:border-primary-300 active:scale-[0.98] transition-all cursor-pointer relative min-h-[130px]"
                          >
                            <div className="flex items-start justify-between w-full">
                              <FileIcon typ={file.typ} className="w-9 h-9" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedFileForSheet(file)
                                }}
                                className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                              </button>
                            </div>
                            <div className="w-full mt-2">
                              <p className="text-xs font-semibold text-text-primary line-clamp-2 break-words">
                                {file.name}
                              </p>
                              {file.size_bytes && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(file.size_bytes)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ------------------ MOBILE SUBFOLDER VIEW ------------------ */
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              {/* iOS Navigation Header */}
              <div className="px-4 py-3 border-b border-border bg-surface-card/95 backdrop-blur-md flex items-center justify-between shrink-0">
                {/* Back button */}
                <button
                  onClick={handleGoBack}
                  className="inline-flex items-center gap-1 text-primary-600 font-semibold text-sm hover:opacity-80 active:opacity-60 transition-opacity max-w-[140px] truncate cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="truncate">{previousFolder?.name || 'Zurück'}</span>
                </button>

                {/* Center folder title */}
                <h2 className="font-bold text-text-primary text-sm sm:text-base text-center truncate px-2 flex-1">
                  {currentFolder.name}
                </h2>

                {/* Right action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {currentFolder.id !== 'kunden_root' && (
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      title={viewMode === 'grid' ? 'Zur Listenansicht' : 'Zur Kachelansicht'}
                    >
                      {viewMode === 'grid' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCreateSheet(true)}
                    className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold hover:bg-primary-200 active:scale-95 transition-all cursor-pointer"
                    title="Aktionen & Upload"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Subfolder Search Bar */}
              <div className="px-4 py-2 bg-surface border-b border-border/60">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={currentFolder.id === 'kunden_root' ? 'Kunden durchsuchen...' : 'In diesem Ordner suchen...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-100 dark:bg-gray-800/60 border border-transparent focus:border-primary-500 rounded-xl text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-400"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full text-xs cursor-pointer"
                      aria-label="Suche zurücksetzen"
                    >
                      <IconClose className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Subfolder Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3 pb-28">
                {/* Special Customer List View */}
                {currentFolder.id === 'kunden_root' ? (
                  <div className="bg-surface-card rounded-2xl border border-border shadow-xs divide-y divide-border overflow-hidden">
                    {currentContents.folders.length === 0 ? (
                      <div className="p-8 text-center text-text-secondary text-sm">
                        Keine Kunden gefunden{searchTerm ? ` für "${searchTerm}"` : ''}.
                      </div>
                    ) : (
                      currentContents.folders.map(folder => {
                        const k = kunden.find(item => item.id === folder.dbId) || {}
                        const projectCount = projekte.filter(p => p.kunden_id === folder.dbId).length
                        return (
                          <button
                            key={folder.id}
                            onClick={() => handleNavigate(folder)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0 border border-amber-200">
                                {(k.name || k.firmenname || 'K').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-text-primary text-sm truncate">
                                  {k.name || k.firmenname}
                                </p>
                                {k.firmenname && k.name && (
                                  <p className="text-xs text-text-secondary truncate">{k.firmenname}</p>
                                )}
                                <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-text-secondary rounded text-[11px] font-medium">
                                  {projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onNavigate('kunden', { kundeId: folder.dbId })
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg cursor-pointer"
                                title="Zum Kundenprofil"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : (
                  <>
                    {/* Empty State */}
                    {currentContents.folders.length === 0 && currentContents.files.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-text-secondary">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                          <IconFolder className="w-8 h-8 text-primary-500" />
                        </div>
                        <p className="font-semibold text-text-primary text-sm">Dieser Ordner ist leer</p>
                        <p className="text-xs text-gray-500 mt-1">Lade neue Dateien hoch oder nimm ein Foto auf.</p>
                        {userRole !== 'treuhand' && (
                          <button
                            type="button"
                            onClick={() => setShowCreateSheet(true)}
                            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-primary-700 cursor-pointer"
                          >
                            + Inhalt hinzufügen
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* GRID VIEW (2 columns on mobile) */}
                        {viewMode === 'grid' && (
                          <div className="grid grid-cols-2 gap-3">
                            {/* Folders */}
                            {currentContents.folders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => handleNavigate(folder)}
                                className="bg-surface-card rounded-2xl border border-border p-3.5 flex flex-col items-center justify-center text-center shadow-xs hover:border-primary-300 active:scale-[0.98] transition-all cursor-pointer relative min-h-[120px]"
                              >
                                {(folder.type === 'kunde' || folder.type === 'projekt') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (folder.type === 'kunde') onNavigate('kunden', { kundeId: folder.dbId })
                                      else if (folder.type === 'projekt') onNavigate('projekte', { projektId: folder.dbId })
                                    }}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-blue-500 rounded cursor-pointer"
                                    title={`Zum ${folder.type === 'kunde' ? 'Kunden' : 'Projekt'}`}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                )}
                                {folder.id === 'recent_root' ? (
                                  <svg className="w-12 h-12 mb-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <FolderIcon className={`w-12 h-12 mb-2 ${folder.id.includes('buchhaltung') ? 'text-emerald-400' : folder.id.includes('intern') ? 'text-gray-400' : folder.id.includes('offerten') ? 'text-indigo-400' : 'text-amber-400'}`} />
                                )}
                                <span className="text-xs font-semibold text-text-primary line-clamp-2 w-full px-1">
                                  {folder.name}
                                </span>
                              </div>
                            ))}

                            {/* Files */}
                            {currentContents.files.map(file => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (file.url) {
                                    handleOpenFile(file)
                                    window.open(file.url, '_blank')
                                  } else {
                                    handleJumpToSource(file)
                                  }
                                }}
                                className="bg-surface-card rounded-2xl border border-border p-3 flex flex-col justify-between shadow-xs hover:border-primary-300 active:scale-[0.98] transition-all cursor-pointer relative min-h-[140px]"
                              >
                                {/* Top row: badge & ... button */}
                                <div className="flex items-start justify-between w-full">
                                  {file.isDocument ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      file.docStatus === 'Bezahlt' || file.docStatus === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-800' :
                                      file.docStatus === 'Versendet' ? 'bg-blue-100 text-blue-800' :
                                      file.docStatus === 'Überfällig' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {file.docStatus || file.kategorie || 'Beleg'}
                                    </span>
                                  ) : <span />}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedFileForSheet(file)
                                    }}
                                    className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Center icon */}
                                <div className="flex items-center justify-center my-1">
                                  <FileIcon typ={file.typ} className="w-12 h-12" />
                                </div>

                                {/* Bottom info */}
                                <div className="w-full text-center">
                                  <p className="text-xs font-semibold text-text-primary line-clamp-2 break-words">
                                    {file.docNr ? `${file.docNr} • ${file.name}` : file.name}
                                  </p>
                                  {file.docTotal != null && (
                                    <p className="text-[11px] font-bold text-text-secondary mt-0.5">
                                      CHF {formatCurrency(file.docTotal)}
                                    </p>
                                  )}
                                  {file.size_bytes && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {formatBytes(file.size_bytes)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* LIST VIEW (Inset Grouped) */}
                        {viewMode === 'list' && (
                          <div className="bg-surface-card rounded-2xl border border-border shadow-xs divide-y divide-border overflow-hidden">
                            {/* Folders in list */}
                            {currentContents.folders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => handleNavigate(folder)}
                                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FolderIcon className={`w-8 h-8 shrink-0 ${folder.id.includes('buchhaltung') ? 'text-emerald-400' : folder.id.includes('intern') ? 'text-gray-400' : folder.id.includes('offerten') ? 'text-indigo-400' : 'text-amber-400'}`} />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-text-primary text-sm truncate">{folder.name}</p>
                                    <p className="text-xs text-text-secondary">Ordner</p>
                                  </div>
                                </div>
                                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            ))}

                            {/* Files in list */}
                            {currentContents.files.map(file => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (file.url) {
                                    handleOpenFile(file)
                                    window.open(file.url, '_blank')
                                  } else {
                                    handleJumpToSource(file)
                                  }
                                }}
                                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileIcon typ={file.typ} className="w-8 h-8 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-text-primary text-sm truncate">
                                      {file.docNr ? `${file.docNr} • ${file.name}` : file.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                                      {file.docTotal != null ? (
                                        <span className="font-semibold text-text-primary">CHF {formatCurrency(file.docTotal)}</span>
                                      ) : (
                                        <span>{file.size_bytes ? formatBytes(file.size_bytes) : 'PDF'}</span>
                                      )}
                                      <span>•</span>
                                      <span>{new Date(file.created_at).toLocaleDateString('de-CH')}</span>
                                      {file.docStatus && (
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          file.docStatus === 'Bezahlt' || file.docStatus === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-800' :
                                          file.docStatus === 'Versendet' ? 'bg-blue-100 text-blue-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {file.docStatus}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedFileForSheet(file)
                                  }}
                                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg shrink-0 ml-2 cursor-pointer"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ------------- DESKTOP FINDER INTERFACE (>= md) --------------- */}
        {/* ============================================================== */}
        <div className="hidden md:flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          {/* Toolbar & Breadcrumbs */}
          <div className="h-16 border-b border-border px-6 flex items-center justify-between shrink-0 bg-surface-card">
          
          <div className="flex items-center gap-2 text-sm text-text-secondary overflow-x-auto hide-scrollbar">
            {currentPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center gap-2 whitespace-nowrap">
                {index > 0 && <span>/</span>}
                <button 
                  onClick={() => handleNavigate(folder)}
                  className={`hover:text-primary-600 transition-colors ${index === currentPath.length - 1 ? 'font-bold text-text-primary' : ''}`}
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Dateien durchsuchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-48 xl:w-64 pl-9 pr-8 py-3 sm:py-1.5 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer text-xs"
                  title="Suche zurücksetzen"
                  aria-label="Suche zurücksetzen"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1 border border-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSyncArchive}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-3 sm:py-1.5 min-h-[48px] sm:min-h-0 bg-surface border border-border text-text-primary text-base sm:text-sm font-semibold rounded-lg hover:bg-gray-100 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              title="Archiv mit Offerten & Rechnungen synchronisieren"
            >
              <IconRefresh className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">{isSyncing ? 'Synchronisiert...' : 'Archiv abgleichen'}</span>
            </button>

            {userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="md:hidden inline-flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2 min-h-[48px] bg-emerald-600 text-white text-base sm:text-sm font-semibold rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors shadow-sm"
              >
                <IconCamera className="w-4 h-4" />
                <span>Foto aufnehmen</span>
              </button>
            )}

            {userRole !== 'treuhand' && (currentFolder.type === 'kategorie' || currentFolder.id === 'buchhaltung_root' || currentFolder.id === 'intern_root' || currentFolder.id === 'offerten_root' || currentFolder.id === 'root') && (
              <label className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 min-h-[48px] bg-primary-600 text-white text-base sm:text-sm font-semibold rounded-lg hover:bg-primary-700 cursor-pointer transition-colors shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {isUploading ? 'Lädt...' : 'Hochladen'}
                <input type="file" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
              </label>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-text-secondary">Lädt Inhalt...</div>
          ) : currentContents.folders.length === 0 && currentContents.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary space-y-4 animate-fade-in text-center px-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
              </div>
              {searchTerm ? (
                <>
                  <p className="font-semibold text-text-primary">Keine Dateien oder Ordner gefunden</p>
                  <p className="text-sm text-gray-500">Es wurden keine Treffer für "{searchTerm}" gefunden.</p>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-primary-600 hover:underline font-semibold cursor-pointer"
                  >
                    Suche zurücksetzen
                  </button>
                </>
              ) : (
                <p>Dieser Ordner ist leer.</p>
              )}
            </div>
          ) : (
            <>
              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {/* Folders */}
                  {currentContents.folders.map(folder => (
                    <div
                      key={folder.id} 
                      onClick={() => handleNavigate(folder)}
                      onDoubleClick={() => handleNavigate(folder)}
                      className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      {(folder.type === 'kunde' || folder.type === 'projekt') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            if (folder.type === 'kunde') onNavigate('kunden', { kundeId: folder.dbId })
                            else if (folder.type === 'projekt') onNavigate('projekte', { projektId: folder.dbId })
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 bg-white shadow rounded text-gray-500 hover:text-blue-500" 
                          title={`Zum ${folder.type === 'kunde' ? 'Kunden' : 'Projekt'}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </button>
                      )}
                      {folder.id === 'recent_root' ? (
                        <svg className="w-16 h-16 mb-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ) : (
                        <FolderIcon className={`w-16 h-16 mb-2 ${folder.id.includes('buchhaltung') ? 'text-emerald-400' : folder.id.includes('intern') ? 'text-gray-400' : folder.id.includes('offerten') ? 'text-indigo-400' : 'text-amber-400'}`} />
                      )}
                      <span className="text-sm font-medium text-text-primary text-center line-clamp-2">{folder.name}</span>
                    </div>
                  ))}
                  
                  {/* Files */}
                  {currentContents.files.map(file => (
                    <div key={file.id} className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        {file.url ? (
                          <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={() => handleOpenFile(file)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-white shadow rounded text-gray-500 hover:text-primary-600 cursor-pointer" title="PDF / Datei ansehen">
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </a>
                        ) : (
                          <button onClick={() => handleJumpToSource(file)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-white shadow rounded text-amber-600 hover:text-amber-700 cursor-pointer" title="Beleg öffnen & PDF erstellen">
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          </button>
                        )}
                        {(file.kunde_id || file.projekt_id || file.docId) && (
                          <button onClick={() => handleJumpToSource(file)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-white shadow rounded text-gray-500 hover:text-blue-500 cursor-pointer" title={file.docType ? `Zur ${file.docType === 'offerte' ? 'Offerte' : 'Rechnung'} springen` : `Gehe zu ${file.projekt_id ? 'Projekt' : 'Kunde'}`}>
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        )}
                        {userRole !== 'treuhand' && !file.isLiveOnly && (
                          <>
                            <button onClick={() => handleOpenRename(file)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-white shadow rounded text-gray-500 hover:text-amber-500 cursor-pointer" title="Umbenennen">
                              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleRequestDelete(file)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-white shadow rounded text-gray-500 hover:text-red-600 cursor-pointer" title="Löschen">
                              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <FileIcon typ={file.typ} className="w-16 h-16 mb-2" />
                        {file.isDocument && (
                          <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm ${
                            file.docStatus === 'Bezahlt' || file.docStatus === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-800' :
                            file.docStatus === 'Versendet' ? 'bg-blue-100 text-blue-800' :
                            file.docStatus === 'Überfällig' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {file.docStatus || 'Beleg'}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-text-primary text-center line-clamp-2 w-full break-words">
                        {file.docNr ? `${file.docNr} • ${file.name}` : file.name}
                      </span>
                      {file.docTotal != null && (
                        <span className="text-xs font-semibold text-text-secondary mt-0.5">
                          CHF {formatCurrency(file.docTotal)}
                        </span>
                      )}
                      {file.isLiveOnly && (
                        <span className="text-[10px] text-amber-600 font-medium mt-0.5">
                          Live-Datensatz
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* LIST VIEW */}
              {viewMode === 'list' && (
                <div className="w-full bg-surface-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-text-secondary cursor-pointer hover:text-text-primary" onClick={() => { setSortField('name'); setSortDirection(s => s === 'asc' ? 'desc' : 'asc') }}>
                          Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 font-semibold text-text-secondary cursor-pointer hover:text-text-primary" onClick={() => { setSortField('date'); setSortDirection(s => s === 'asc' ? 'desc' : 'asc') }}>
                          Änderungsdatum {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 font-semibold text-text-secondary">Typ</th>
                        <th className="px-4 py-3 font-semibold text-text-secondary cursor-pointer hover:text-text-primary" onClick={() => { setSortField('size'); setSortDirection(s => s === 'asc' ? 'desc' : 'asc') }}>
                          Grösse {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Folders */}
                      {currentContents.folders.map(folder => (
                        <tr key={folder.id} onClick={() => handleNavigate(folder)} onDoubleClick={() => handleNavigate(folder)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-3">
                            {folder.id === 'recent_root' ? (
                              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                              <FolderIcon className={`w-6 h-6 ${folder.id.includes('buchhaltung') ? 'text-emerald-400' : folder.id.includes('intern') ? 'text-gray-400' : folder.id.includes('offerten') ? 'text-indigo-400' : 'text-amber-400'}`} />
                            )}
                            {folder.name}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">--</td>
                          <td className="px-4 py-3 text-text-secondary">Dateiordner</td>
                          <td className="px-4 py-3 text-text-secondary">--</td>
                          <td className="px-4 py-3 text-right">
                            <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2 transition-opacity">
                              {(folder.type === 'kunde' || folder.type === 'projekt') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (folder.type === 'kunde') onNavigate('kunden', { kundeId: folder.dbId })
                                    else if (folder.type === 'projekt') onNavigate('projekte', { projektId: folder.dbId })
                                  }}
                                  className="text-gray-500 hover:text-blue-500" 
                                  title={`Zum ${folder.type === 'kunde' ? 'Kunden' : 'Projekt'}`}
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Files */}
                      {currentContents.files.map(file => (
                        <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                          <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-3">
                            <FileIcon typ={file.typ} className="w-6 h-6" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                {file.url ? (
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={() => handleOpenFile(file)} className="hover:underline font-semibold">
                                    {file.docNr ? `${file.docNr} • ${file.name}` : file.name}
                                  </a>
                                ) : (
                                  <span className="font-semibold text-text-primary">
                                    {file.docNr ? `${file.docNr} • ${file.name}` : file.name}
                                  </span>
                                )}
                                {file.docStatus && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    file.docStatus === 'Bezahlt' || file.docStatus === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-800' :
                                    file.docStatus === 'Versendet' ? 'bg-blue-100 text-blue-800' :
                                    file.docStatus === 'Überfällig' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {file.docStatus}
                                  </span>
                                )}
                                {file.isLiveOnly && (
                                  <span className="text-[10px] text-amber-600 font-medium">
                                    (Live-Datensatz)
                                  </span>
                                )}
                              </div>
                              {file.docTotal != null && (
                                <span className="text-xs text-text-secondary">
                                  CHF {formatCurrency(file.docTotal)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{new Date(file.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-text-secondary">{file.typ?.split('/')[1]?.toUpperCase() || 'DATEI'}</td>
                          <td className="px-4 py-3 text-text-secondary">{file.size_bytes ? formatBytes(file.size_bytes) : '--'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-1 transition-opacity">
                              {file.url ? (
                                <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={() => handleOpenFile(file)} className="p-3 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg cursor-pointer" title="Ansehen">
                                  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </a>
                              ) : null}
                              {(file.kunde_id || file.projekt_id || file.docId) && (
                                <button onClick={() => handleJumpToSource(file)} className="p-3 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded-lg cursor-pointer" title={file.docType ? `Zur ${file.docType === 'offerte' ? 'Offerte' : 'Rechnung'} springen` : `Gehe zu ${file.projekt_id ? 'Projekt' : 'Kunde'}`}>
                                  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </button>
                              )}
                              {userRole !== 'treuhand' && !file.isLiveOnly && (
                                <>
                                  <button onClick={() => handleOpenRename(file)} className="p-3 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-500 hover:text-amber-500 hover:bg-gray-100 rounded-lg cursor-pointer" title="Umbenennen">
                                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button onClick={() => handleRequestDelete(file)} className="p-3 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg cursor-pointer" title="Löschen">
                                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {/* ============================================================== */}
      {/* ---------------- iOS ACTION SHEETS (BOTTOM SHEETS) ---------- */}
      {/* ============================================================== */}
      
      {/* iOS File Action Sheet */}
      {selectedFileForSheet && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in" 
          onClick={() => setSelectedFileForSheet(null)}
        >
          <div 
            className="w-full sm:max-w-md bg-surface-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* iOS pull bar */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto sm:hidden mb-2" />

            {/* File info header */}
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <FileIcon typ={selectedFileForSheet.typ} className="w-12 h-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text-primary text-sm truncate">
                  {selectedFileForSheet.docNr ? `${selectedFileForSheet.docNr} • ${selectedFileForSheet.name}` : selectedFileForSheet.name}
                </p>
                <div className="flex items-center flex-wrap gap-2 text-xs text-text-secondary mt-0.5">
                  <span>{selectedFileForSheet.size_bytes ? formatBytes(selectedFileForSheet.size_bytes) : (selectedFileForSheet.isDocument ? 'Beleg' : 'Datei')}</span>
                  {selectedFileForSheet.created_at && (
                    <>
                      <span>•</span>
                      <span>{new Date(selectedFileForSheet.created_at).toLocaleDateString('de-CH')}</span>
                    </>
                  )}
                  {selectedFileForSheet.docStatus && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedFileForSheet.docStatus === 'Bezahlt' || selectedFileForSheet.docStatus === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-800' :
                      selectedFileForSheet.docStatus === 'Versendet' ? 'bg-blue-100 text-blue-800' :
                      selectedFileForSheet.docStatus === 'Überfällig' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedFileForSheet.docStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-1">
              {selectedFileForSheet.url ? (
                <a
                  href={selectedFileForSheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    handleOpenFile(selectedFileForSheet)
                    setSelectedFileForSheet(null)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary text-sm font-medium transition-colors cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <IconEye className="w-5 h-5 text-blue-600" />
                  </span>
                  <span>Öffnen / Vorschau</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleJumpToSource(selectedFileForSheet)
                    setSelectedFileForSheet(null)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-amber-700 text-sm font-medium transition-colors cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <IconDocument className="w-5 h-5 text-amber-600" />
                  </span>
                  <span>Beleg öffnen & PDF erstellen</span>
                </button>
              )}

              {(selectedFileForSheet.kunde_id || selectedFileForSheet.projekt_id || selectedFileForSheet.docId) && (
                <button
                  type="button"
                  onClick={() => {
                    handleJumpToSource(selectedFileForSheet)
                    setSelectedFileForSheet(null)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary text-sm font-medium transition-colors cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <IconLink className="w-5 h-5 text-indigo-600" />
                  </span>
                  <span>{selectedFileForSheet.docType ? `Zur ${selectedFileForSheet.docType === 'offerte' ? 'Offerte' : 'Rechnung'} springen` : 'Zum Datensatz / Projekt'}</span>
                </button>
              )}

              {userRole !== 'treuhand' && !selectedFileForSheet.isLiveOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const f = selectedFileForSheet
                      setSelectedFileForSheet(null)
                      handleOpenRename(f)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary text-sm font-medium transition-colors cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <IconEdit className="w-5 h-5 text-amber-600" />
                    </span>
                    <span>Umbenennen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const f = selectedFileForSheet
                      setSelectedFileForSheet(null)
                      handleRequestDelete(f)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 text-red-600 text-sm font-medium transition-colors cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                      <IconTrash className="w-5 h-5 text-red-600" />
                    </span>
                    <span>Löschen</span>
                  </button>
                </>
              )}
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setSelectedFileForSheet(null)}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-text-primary font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* iOS Create / Plus Action Sheet */}
      {showCreateSheet && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in" 
          onClick={() => setShowCreateSheet(false)}
        >
          <div 
            className="w-full sm:max-w-md bg-surface-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto sm:hidden mb-2" />

            <div>
              <h3 className="font-bold text-base text-text-primary">Aktionen & Upload</h3>
              <p className="text-xs text-text-secondary mt-0.5">Zielordner: {currentFolder.name}</p>
            </div>

            <div className="space-y-1">
              {userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSheet(false)
                    setShowCamera(true)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary text-sm font-medium transition-colors cursor-pointer"
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconCamera className="w-5 h-5 text-emerald-600" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-text-primary text-sm">Foto / Scan aufnehmen</p>
                    <p className="text-xs text-text-secondary">Beleg oder Notiz direkt fotografieren</p>
                  </div>
                </button>
              )}

              {userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSheet(false)
                    fileInputRef.current?.click()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary text-sm font-medium transition-colors cursor-pointer"
                >
                  <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <IconFolder className="w-5 h-5 text-blue-600" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-text-primary text-sm">Datei hochladen</p>
                    <p className="text-xs text-text-secondary">PDF, Dokument oder Bild auswählen</p>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowCreateSheet(false)
                  handleSyncArchive()
                }}
                disabled={isSyncing}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <IconRefresh className={`w-5 h-5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                </span>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-text-primary text-sm">Archiv synchronisieren</p>
                  <p className="text-xs text-text-secondary">Offerten & Rechnungen mit Dateien abgleichen</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateSheet(false)}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-text-primary font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-primary-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Datei hochladen</h3>
                <p className="text-xs text-gray-500">Zielordner: {currentFolder.name}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Dateiname (ohne Endung)
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={uploadModal.name}
                    onChange={e => setUploadModal({ ...uploadModal, name: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmUpload() }}
                    autoFocus
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500 font-medium">
                    .{uploadModal.fileExt}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Dateigrösse: {formatBytes(uploadModal.file.size)}</span>
                <span>Typ: {uploadModal.file.type || uploadModal.fileExt}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUploadModal(null)}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUploading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isUploading ? 'Lädt hoch...' : 'Hochladen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Datei umbenennen</h3>
                <p className="text-xs text-gray-500">Bisheriger Name: {renameModal.oldName}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Neuer Dateiname (ohne Endung)
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={renameModal.name}
                    onChange={e => setRenameModal({ ...renameModal, name: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename() }}
                    autoFocus
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500 font-medium">
                    .{renameModal.fileExt}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                disabled={isRenaming}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                disabled={isRenaming}
                className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRenaming ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Datei löschen</h3>
                <p className="text-xs text-gray-500">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Möchtest du die Datei <strong className="text-gray-900 font-semibold">"{deleteModal.name}"</strong> wirklich unwiderruflich löschen?
            </p>

            {(deleteModal.docType === 'rechnung' || deleteModal.rechnung_id || deleteModal.kategorie === 'Rechnungen' || deleteModal.name?.toLowerCase().includes('rechnung')) && (
              <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <IconLegal className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-0.5">Gesetzliche Aufbewahrungspflicht (Art. 958f OR)</p>
                  <p className="text-amber-800">
                    Rechnungen und Buchungsbelege müssen in der Schweiz mindestens <strong>10 Jahre</strong> aufbewahrt werden. Das vorzeitige Löschen kann steuer- und handelsrechtliche Konsequenzen haben.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
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
            <span className="shrink-0">
              {toast.type === 'success' ? (
                <IconCheck className="w-4 h-4 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <IconWarning className="w-4 h-4 text-red-600" />
              ) : (
                <IconInfo className="w-4 h-4 text-blue-600" />
              )}
            </span>
            <span>{toast.text}</span>
            <button 
              type="button" 
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-60 hover:opacity-100 cursor-pointer p-0.5 rounded"
              aria-label="Schliessen"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <CameraCapture 
        isOpen={showCamera} 
        onClose={() => setShowCamera(false)} 
        onCapture={handleCameraCapture} 
      />
    </div>
  )
}
