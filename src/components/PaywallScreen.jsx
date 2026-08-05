import { supabase } from '../lib/supabase'

export default function PaywallScreen({ tenant }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-border">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-4xl mb-6">
          ⏳
        </div>
        
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Testphase abgelaufen
        </h2>
        
        <p className="text-text-secondary mb-8">
          Deine 14-tägige Testphase für <span className="font-bold text-text-primary">{tenant?.name || 'deine Firma'}</span> ist leider abgelaufen. 
          Bitte wähle ein Abonnement, um weiterhin vollen Zugriff auf dein CRM zu haben.
        </p>
        
        <div className="space-y-4">
          <button className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 transition-colors">
            Abonnement wählen
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-gray-50 text-text-secondary font-bold rounded-xl hover:bg-gray-100 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-text-secondary font-medium">
        Fragen? Kontaktiere den Support unter support@ki-netic.ch
      </p>
    </div>
  )
}
