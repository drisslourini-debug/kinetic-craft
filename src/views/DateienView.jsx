import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const FolderIcon = ({ className = "w-10 h-10 text-amber-400" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  </svg>
)

const FileIcon = ({ typ, className = "w-10 h-10" }) => {
  if (!typ) return <span className={`text-4xl ${className}`}>📎</span>
  if (typ.includes('pdf')) return <span className={`text-4xl ${className}`}>📄</span>
  if (typ.includes('image')) return <span className={`text-4xl ${className}`}>🖼️</span>
  if (typ.includes('word') || typ.includes('document')) return <span className={`text-4xl ${className}`}>📝</span>
  return <span className={`text-4xl ${className}`}>📎</span>
}

export default function DateienView({ onNavigate }) {
  const [dateien, setDateien] = useState([])
  const [kunden, setKunden] = useState([])
  const [projekte, setProjekte] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  
  const [isUploading, setIsUploading] = useState(false)

  // Navigation State (Breadcrumbs)
  const [currentPath, setCurrentPath] = useState([{ type: 'root', id: 'root', name: 'Archiv' }])
  const currentFolder = currentPath[currentPath.length - 1]

  // Tree State
  const [isKundenExpanded, setIsKundenExpanded] = useState(false)
  const [treeSearch, setTreeSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [dateienRes, kundenRes, projekteRes] = await Promise.all([
        supabase.from('dateien').select('*, kunden(name), projekte(name)').order('created_at', { ascending: false }),
        supabase.from('kunden').select('*').order('name'),
        supabase.from('projekte').select('*').order('name')
      ])

      if (dateienRes.error) throw dateienRes.error
      if (kundenRes.error) throw kundenRes.error
      if (projekteRes.error) throw projekteRes.error

      setDateien(dateienRes.data || [])
      setKunden(kundenRes.data || [])
      setProjekte(projekteRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      alert('Fehler beim Laden der Daten.')
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

  // Determine contents of current folder
  const currentContents = useMemo(() => {
    let folders = []
    let files = []

    if (currentFolder.id === 'root') {
      folders = [
        { type: 'system', id: 'kunden_root', name: 'Kunden' },
        { type: 'system', id: 'offerten_root', name: 'Offerten' },
        { type: 'system', id: 'buchhaltung_root', name: 'Buchhaltung & Rechnungen' },
        { type: 'system', id: 'intern_root', name: 'Firma Intern' }
      ]
      files = dateien.filter(d => !d.kunde_id && d.kategorie !== 'Buchhaltung' && d.kategorie !== 'Firma intern' && d.kategorie !== 'Offerte' && d.kategorie !== 'Rechnung')
    } 
    else if (currentFolder.id === 'kunden_root') {
      folders = kunden.map(k => ({ type: 'kunde', id: `kunde_${k.id}`, dbId: k.id, name: k.name || k.firmenname }))
      files = []
    }
    else if (currentFolder.id === 'offerten_root') {
      files = dateien.filter(d => d.kategorie === 'Offerte')
    }
    else if (currentFolder.id === 'buchhaltung_root') {
      files = dateien.filter(d => d.kategorie === 'Buchhaltung' || d.kategorie === 'Rechnung' || d.kategorie === 'Beleg')
    }
    else if (currentFolder.id === 'intern_root') {
      files = dateien.filter(d => d.kategorie === 'Firma intern')
    }
    else if (currentFolder.type === 'kunde') {
      const kProjekte = projekte.filter(p => p.kunden_id === currentFolder.dbId).map(p => ({
        type: 'projekt', id: `proj_${p.id}`, dbId: p.id, name: p.name
      }))
      
      const kundeFiles = dateien.filter(d => d.kunde_id === currentFolder.dbId && !d.projekt_id)
      
      const defaultCats = ['Offerten', 'Rechnungen', 'Allgemeine Dateien']
      const existingCats = kundeFiles.map(d => {
        if (d.kategorie === 'Offerte') return 'Offerten'
        if (d.kategorie === 'Rechnung') return 'Rechnungen'
        return d.kategorie || 'Allgemeine Dateien'
      })
      const allCats = [...new Set([...defaultCats, ...existingCats])]
      
      const categoryFolders = allCats.map(cat => ({
        type: 'kategorie', id: `cat_kunde_${currentFolder.dbId}_${cat}`, name: cat, dbId: currentFolder.dbId, parentType: 'kunde'
      }))

      folders = [...kProjekte, ...categoryFolders]
      files = [] // All files are tucked into the category folders!
    }
    else if (currentFolder.type === 'projekt') {
      const projFiles = dateien.filter(d => d.projekt_id === currentFolder.dbId)
      
      const defaultCats = ['Offerten', 'Rechnungen', 'Fotos & Pläne', 'Allgemein']
      const existingCats = projFiles.map(d => {
        if (d.kategorie === 'Offerte') return 'Offerten'
        if (d.kategorie === 'Rechnung') return 'Rechnungen'
        if (d.typ?.includes('image')) return 'Fotos & Pläne'
        return d.kategorie || 'Allgemein'
      })
      const allCats = [...new Set([...defaultCats, ...existingCats])]
      
      folders = allCats.map(cat => ({
        type: 'kategorie', id: `cat_proj_${currentFolder.dbId}_${cat}`, name: cat, dbId: currentFolder.dbId, parentType: 'projekt'
      }))
      files = []
    }
    else if (currentFolder.type === 'kategorie') {
      const cat = currentFolder.name
      let baseFiles = []
      
      if (currentFolder.parentType === 'projekt') {
        baseFiles = dateien.filter(d => d.projekt_id === currentFolder.dbId)
      } else if (currentFolder.parentType === 'kunde') {
        baseFiles = dateien.filter(d => d.kunde_id === currentFolder.dbId && !d.projekt_id)
      }

      files = baseFiles.filter(d => {
        let mappedCat = d.kategorie || 'Allgemein'
        if (d.kategorie === 'Offerte') mappedCat = 'Offerten'
        else if (d.kategorie === 'Rechnung') mappedCat = 'Rechnungen'
        else if (currentFolder.parentType === 'projekt' && d.typ?.includes('image') && mappedCat !== 'Offerten' && mappedCat !== 'Rechnungen') {
          mappedCat = 'Fotos & Pläne'
        }
        else if (currentFolder.parentType === 'kunde' && !d.kategorie) mappedCat = 'Allgemeine Dateien'
        
        return mappedCat === cat
      })
    }

    // Filter by search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      folders = folders.filter(f => f.name.toLowerCase().includes(lower))
      files = files.filter(f => f.name.toLowerCase().includes(lower))
    }

    // Sort
    const sortFn = (a, b) => {
      let valA, valB
      if (sortField === 'name') {
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
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

    folders.sort(sortFn)
    files.sort(sortFn)

    return { folders, files }
  }, [currentFolder, dateien, kunden, projekte, searchTerm, sortField, sortDirection])


  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    const userPrompt = window.prompt('Bitte Dateiname eingeben (ohne Endung):', baseName)
    
    if (userPrompt === null) {
      e.target.value = null
      return
    }
    
    const finalName = userPrompt.trim() ? `${userPrompt.trim()}.${fileExt}` : file.name

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
        const kundeFolder = currentPath.find(p => p.type === 'kunde')
        kunde_id = kundeFolder?.dbId || null
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
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `uploads/${fileName}`

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

      fetchData()
    } catch (err) {
      console.error(err)
      alert('Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
      e.target.value = null
    }
  }

  const handleRename = async (id, oldName) => {
    const fileExt = oldName.split('.').pop()
    const baseName = oldName.substring(0, oldName.lastIndexOf('.')) || oldName
    const userPrompt = window.prompt('Neuer Dateiname (ohne Endung):', baseName)
    
    if (!userPrompt || userPrompt.trim() === baseName) return

    const newName = `${userPrompt.trim()}.${fileExt}`

    try {
      const { error } = await supabase.from('dateien').update({ name: newName }).eq('id', id)
      if (error) throw error
      setDateien(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d))
    } catch (err) {
      console.error(err)
      alert('Umbenennen fehlgeschlagen')
    }
  }

  const handleDelete = async (id) => {
    if(!window.confirm('Datei unwiderruflich löschen?')) return
    try {
      const { error } = await supabase.from('dateien').delete().eq('id', id)
      if (error) throw error
      setDateien(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
      alert('Löschen fehlgeschlagen')
    }
  }

  const handleJumpToSource = (file) => {
    if (!onNavigate) return
    let activeTab = 'dateien'
    if (file.kategorie === 'Offerte') activeTab = 'offerten'
    if (file.kategorie === 'Rechnung') activeTab = 'rechnungen'

    if (file.projekt_id) {
      onNavigate('projekte', { projektId: file.projekt_id, activeTab })
    } else if (file.kunde_id) {
      onNavigate('kunden', { kundeId: file.kunde_id, activeTab })
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

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-4 sm:-m-6 lg:-m-8 bg-surface">
      
      {/* ---------------- SIDEBAR (Tree) ---------------- */}
      <div className="w-64 bg-surface-card border-r border-border overflow-y-auto flex flex-col shrink-0">
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
            <FolderIcon className="w-5 h-5 text-blue-400" />
            Mein Atelier77
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
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input 
                    type="text" 
                    placeholder="Suchen..." 
                    value={treeSearch}
                    onChange={e => setTreeSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-gray-50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
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

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        
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
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="In diesem Ordner suchen..."
                className="w-48 xl:w-64 pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1 border border-border">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>

            {(currentFolder.type === 'kategorie' || currentFolder.id === 'buchhaltung_root' || currentFolder.id === 'intern_root' || currentFolder.id === 'offerten_root' || currentFolder.id === 'root') && (
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 cursor-pointer transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {isUploading ? 'Lädt...' : 'Hochladen'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-text-secondary">Lädt Inhalt...</div>
          ) : currentContents.folders.length === 0 && currentContents.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary space-y-4 animate-fade-in">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
              </div>
              <p>Dieser Ordner ist leer.</p>
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
                      <FolderIcon className={`w-16 h-16 mb-2 ${folder.id.includes('buchhaltung') ? 'text-emerald-400' : folder.id.includes('intern') ? 'text-gray-400' : folder.id.includes('offerten') ? 'text-indigo-400' : 'text-amber-400'}`} />
                      <span className="text-sm font-medium text-text-primary text-center line-clamp-2">{folder.name}</span>
                    </div>
                  ))}
                  
                  {/* Files */}
                  {currentContents.files.map(file => (
                    <div key={file.id} className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1 bg-white shadow rounded text-gray-500 hover:text-primary-600" title="Ansehen">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </a>
                        {(file.kunde_id || file.projekt_id) && (
                          <button onClick={() => handleJumpToSource(file)} className="p-1 bg-white shadow rounded text-gray-500 hover:text-blue-500" title={`Gehe zu ${file.projekt_id ? 'Projekt' : 'Kunde'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleRename(file.id, file.name)} className="p-1 bg-white shadow rounded text-gray-500 hover:text-amber-500" title="Umbenennen">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(file.id)} className="p-1 bg-white shadow rounded text-gray-500 hover:text-red-600" title="Löschen">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <FileIcon typ={file.typ} className="w-16 h-16 mb-2" />
                      <span className="text-sm font-medium text-text-primary text-center line-clamp-2 w-full break-words">{file.name}</span>
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
                          Größe {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Folders */}
                      {currentContents.folders.map(folder => (
                        <tr key={folder.id} onDoubleClick={() => handleNavigate(folder)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-3">
                            <FolderIcon className={`w-6 h-6 ${folder.id.includes('buchhaltung') ? 'text-emerald-400' : folder.id.includes('intern') ? 'text-gray-400' : folder.id.includes('offerten') ? 'text-indigo-400' : 'text-amber-400'}`} />
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
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{new Date(file.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-text-secondary">{file.typ?.split('/')[1]?.toUpperCase() || 'DATEI'}</td>
                          <td className="px-4 py-3 text-text-secondary">{formatBytes(file.size_bytes)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2 transition-opacity">
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-600" title="Ansehen">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </a>
                              {(file.kunde_id || file.projekt_id) && (
                                <button onClick={() => handleJumpToSource(file)} className="text-gray-500 hover:text-blue-500" title={`Gehe zu ${file.projekt_id ? 'Projekt' : 'Kunde'}`}>
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </button>
                              )}
                              <button onClick={() => handleRename(file.id, file.name)} className="text-gray-500 hover:text-amber-500" title="Umbenennen">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(file.id)} className="text-gray-500 hover:text-red-600" title="Löschen">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
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
  )
}
