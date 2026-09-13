import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PaywallScreen({ tenant }) {
  const [showContactModal, setShowContactModal] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const tenantName = tenant?.name || 'deine Firma'
  const upgradeMailSubject = encodeURIComponent(`Abonnement aktivieren: ${tenantName}`)
  const upgradeMailBody = encodeURIComponent(`Hallo Kinetic Craft Support-Team,\n\nunsere 14-tägige Testphase für "${tenantName}" ist abgelaufen. Wir möchten gerne ein vollwertiges Abonnement abschliessen.\n\nBitte kontaktiert uns bezüglich der Freischaltung.\n\nVielen Dank!`)
  const upgradeMailHref = `mailto:support@ki-netic.ch?subject=${upgradeMailSubject}&body=${upgradeMailBody}`

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-border/80 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-primary-500 to-amber-500" />

        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-4xl mb-6 shadow-sm border border-amber-100">
          ⏳
        </div>
        
        <h2 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
          Testphase abgelaufen
        </h2>
        
        <p className="text-sm sm:text-base text-text-secondary mb-8 leading-relaxed">
          Deine 14-tägige Testphase für <span className="font-bold text-text-primary">{tenantName}</span> ist abgelaufen. 
          Aktiviere jetzt dein Abonnement, um weiterhin nahtlos auf Angebote, Rechnungen und Buchhaltung zuzugreifen.
        </p>
        
        <div className="space-y-3">
          <a
            href={upgradeMailHref}
            className="w-full min-h-[48px] flex items-center justify-center py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer text-sm"
          >
            Abonnement anfragen (Support kontaktieren)
          </a>

          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-text-primary font-semibold rounded-xl border border-gray-200 transition-colors text-sm cursor-pointer"
          >
            Direkte Kontaktmöglichkeiten
          </button>
          
          <button 
            type="button"
            onClick={handleLogout}
            className="w-full py-3 px-4 text-text-secondary hover:text-text-primary font-medium rounded-xl transition-colors text-sm cursor-pointer"
          >
            Abmelden
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-text-secondary font-medium">
        Fragen? Schreib uns an{' '}
        <a 
          href="mailto:support@ki-netic.ch" 
          className="font-bold text-primary-600 hover:text-primary-800 underline underline-offset-2 transition-colors"
        >
          support@ki-netic.ch
        </a>
      </p>

      {/* Direct Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-left shadow-2xl border border-border">
            <h3 className="text-lg font-bold text-text-primary mb-3">Support & Beratung</h3>
            <p className="text-xs text-text-secondary mb-4">
              Wir beraten dich gerne persönlich zur passenden Lizenz für dein Unternehmen:
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">✉️</span>
                <div>
                  <p className="text-xs text-text-secondary">E-Mail</p>
                  <a href="mailto:support@ki-netic.ch" className="font-semibold text-primary-600 hover:underline">
                    support@ki-netic.ch
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">⏱️</span>
                <div>
                  <p className="text-xs text-text-secondary">Reaktionszeit</p>
                  <p className="font-semibold text-text-primary">In der Regel unter 2 Stunden</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors cursor-pointer"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
