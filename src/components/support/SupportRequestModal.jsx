import { useState } from 'react'
import { createCustomerSupportTicket } from '../../services/adminService'
import { IconMail, IconCheck, IconWarning } from '../icons/BrandIcons'

export default function SupportRequestModal({ isOpen, onClose, tenantId, userName, userEmail }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('question')
  const [priority, setPriority] = useState('normal')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      setError('Bitte fülle Betreff und Nachricht aus.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await createCustomerSupportTicket({
        tenantId,
        title,
        category,
        priority,
        message,
        senderName: userName || userEmail || 'Benutzer',
      })

      if (res.success) {
        setIsSuccess(true)
      } else {
        setError(res.error || 'Fehler beim Senden des Tickets. Bitte sende eine E-Mail an support@ki-netic.ch.')
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte kontaktiere support@ki-netic.ch direkt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setTitle('')
    setMessage('')
    setCategory('question')
    setPriority('normal')
    setIsSuccess(false)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 text-left shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary-600 to-amber-600" />

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
              <IconCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Support-Ticket übermittelt</h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
              Deine Anfrage wurde direkt an unser Support-Team übermittelt (<span className="font-semibold text-gray-800">support@ki-netic.ch</span>). 
              Wir melden uns in der Regel innerhalb von 2 Stunden bei dir.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-sm"
              >
                Schliessen
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <IconMail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Support & Hilfe</h3>
                  <p className="text-xs text-gray-500">Direkter Draht zum Kinetic Craft Team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <IconWarning className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Betreff / Thema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Frage zur QR-Rechnung oder Baustellenzuweisung"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="question">Allgemeine Frage</option>
                    <option value="bug">Technisches Problem / Bug</option>
                    <option value="billing">Abrechnung & Lizenz</option>
                    <option value="feature">Funktionswunsch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Priorität
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Hoch</option>
                    <option value="urgent">Dringend (Betriebsstörung)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Deine Nachricht / Problembeschreibung *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Beschreibe kurz dein Anliegen oder die Fehlermeldung..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Antwort an: <strong className="text-gray-700">{userEmail || 'deine E-Mail'}</strong></span>
                <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  Ø &lt; 2h
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center gap-2"
                >
                  {isSubmitting ? 'Wird gesendet...' : 'Ticket absenden'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
