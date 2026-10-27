import { useState, useEffect } from 'react'
import { fetchTenants, fetchCrmNotes, addCrmNote } from '../../services/adminService'
import { formatDate } from '../../lib/formatters'
import { 
  IconEdit, 
  IconCheck, 
  IconClock, 
  IconUsers, 
  IconSend 
} from '../../components/icons/BrandIcons'

export default function AdminCrmNotesView({ initialTenant }) {
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenant?.id || '')
  const [notes, setNotes] = useState([])
  const [newContent, setNewContent] = useState('')
  const [noteType, setNoteType] = useState('call')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadTenants() {
      const data = await fetchTenants()
      setTenants(data)
      if (!selectedTenantId && data.length > 0) {
        setSelectedTenantId(data[0].id)
      }
    }
    loadTenants()
  }, [])

  useEffect(() => {
    async function loadNotes() {
      if (!selectedTenantId) return
      setIsLoading(true)
      try {
        const data = await fetchCrmNotes(selectedTenantId)
        setNotes(data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadNotes()
  }, [selectedTenantId])

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newContent.trim() || !selectedTenantId) return
    setIsSubmitting(true)

    try {
      const res = await addCrmNote({
        tenantId: selectedTenantId,
        noteType,
        content: newContent,
        authorName: 'Support-Lead',
      })

      if (res.success) {
        setNewContent('')
        const updated = await fetchCrmNotes(selectedTenantId)
        setNotes(updated)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <IconEdit className="w-6 h-6 text-amber-400" />
            <span>Kunden-Betreuung & CRM-Notizen</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Telefonate, Absprachen, Schulungen und Onboarding-Verlauf je Betrieb
          </p>
        </div>

        {/* Tenant Picker */}
        <div className="w-full sm:w-72">
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.firmenname} ({t.ort || 'CH'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedTenant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tenant Mini Profile */}
          <div className="lg:col-span-4 bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-xl space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Ausgewählter Betrieb
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {selectedTenant.firmenname}
              </h2>
              <p className="text-xs text-zinc-400">{selectedTenant.email || 'Keine E-Mail'}</p>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{selectedTenant.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Standort:</span>
                <span className="text-zinc-200">{selectedTenant.ort || 'Schweiz'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Tarif:</span>
                <span className="font-mono text-zinc-200">CHF {selectedTenant.price_chf || '49.00'}</span>
              </div>
            </div>

            {/* Quick Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Neuen Eintrag verfassen:
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'call', label: '📞 Anruf' },
                  { key: 'meeting', label: '🤝 Meeting' },
                  { key: 'note', label: '📝 Notiz' },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setNoteType(item.key)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center ${
                      noteType === item.key
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                required
                placeholder="Details des Telefonats, Wünsche oder getroffene Absprachen festhalten..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
              />

              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Eintrag speichern</span>
              </button>
            </form>
          </div>

          {/* Right: Chronological Timeline */}
          <div className="lg:col-span-8 bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-xl flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4 pb-3 border-b border-zinc-800 flex items-center gap-2">
              <IconClock className="w-4 h-4 text-amber-400" />
              <span>Verlauf & Historie ({notes.length})</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[600px]">
              {isLoading ? (
                <p className="text-xs text-zinc-500 text-center py-8">Lade Notizen...</p>
              ) : notes.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Noch keine CRM-Einträge für diesen Betrieb hinterlegt.
                </div>
              ) : (
                notes.map(note => (
                  <div
                    key={note.id}
                    className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 uppercase tracking-wide">
                          {note.note_type === 'call' ? '📞 Telefonat' : note.note_type === 'meeting' ? '🤝 Meeting' : '📝 Notiz'}
                        </span>
                        <span className="text-zinc-500">&middot;</span>
                        <span className="text-zinc-400">von {note.author_name || 'Admin'}</span>
                      </div>
                      <span className="text-zinc-500 font-mono">
                        {formatDate(note.created_at)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
