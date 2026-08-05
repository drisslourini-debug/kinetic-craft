const fs = require('fs');
let code = fs.readFileSync('src/views/RechnungDetailView.jsx', 'utf8');

// Add imports if they don't exist
const imports = `
import RechnungHeader from '../components/rechnung/RechnungHeader'
import RechnungStammdaten from '../components/rechnung/RechnungStammdaten'
import RechnungKonditionen from '../components/rechnung/RechnungKonditionen'
import RechnungTexte from '../components/rechnung/RechnungTexte'
import RechnungLeistungsTabelle from '../components/rechnung/RechnungLeistungsTabelle'
import RechnungTotals from '../components/rechnung/RechnungTotals'
import KatalogDrawer from '../components/KatalogDrawer'
`;
if (!code.includes('RechnungHeader')) {
  code = code.replace(/import \{ formatCurrency/, imports + '\nimport { formatCurrency');
}

// Find the return statement
const returnIndex = code.indexOf('  return (\n    <div className="space-y-6 relative">');
if (returnIndex === -1) {
  console.log('Could not find return statement');
  process.exit(1);
}

const beforeReturn = code.substring(0, returnIndex);

const newReturn = `  return (
    <>
      <div className="space-y-6 max-w-[1200px] mx-auto animate-fade-in relative">
        <RechnungHeader 
          rechnung={rechnung}
          status={status}
          isUpdating={isUpdating}
          isEditing={isEditing}
          showLivePreview={showLivePreview}
          isDirty={isDirty}
          onBack={handleBackClick}
          onStatusChange={handleStatusChange}
          onStartEditing={startEditing}
          onToggleLivePreview={() => setShowLivePreview(!showLivePreview)}
          onShowPrintView={() => setShowPrintView(true)}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
          onRestore={async () => {
            if (!window.confirm('Rechnung wiederherstellen?')) return
            setIsUpdating(true)
            try {
              await supabase.from('rechnungen').update({ is_archived: false }).eq('id', rechnung.id)
              window.location.reload()
            } catch (err) {
              console.error('Fehler beim Wiederherstellen:', err)
            } finally {
              setIsUpdating(false)
            }
          }}
          onGenerateMahnung={handleGenerateMahnung}
          userRole={userRole}
        />

        {isLoading ? (
          <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
        ) : (
          <div className={showLivePreview && isEditing ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RechnungStammdaten 
                  rechnung={rechnung}
                  kunde={kunde}
                  projekt={projekt}
                  settings={settings}
                  status={status}
                  isDirty={isDirty}
                  isUpdating={isUpdating}
                  editStammdaten={editStammdaten}
                  onStammInputChange={handleStammInputChange}
                  onSaveStammdaten={handleSaveStammdaten}
                  onNavigate={onNavigate}
                  showPaymentForm={showPaymentForm}
                  setShowPaymentForm={setShowPaymentForm}
                  paymentDate={paymentDate}
                  setPaymentDate={setPaymentDate}
                  paymentAmount={paymentAmount}
                  setPaymentAmount={setPaymentAmount}
                  onPayment={handlePayment}
                  onDeletePayment={handleDeletePayment}
                  onWriteOff={handleWriteOff}
                  userRole={userRole}
                />
                <RechnungKonditionen 
                  daten={rechnung.daten}
                  isEditing={isEditing}
                  editKonditionen={editKonditionen}
                  onKonditionenChange={(field, val) => {
                    setEditKonditionen(prev => ({ ...prev, [field]: val }))
                    setIsDirty(true)
                  }}
                />
              </div>

              <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden mt-6">
                <RechnungTexte 
                  label="Einleitungstext (vor den Leistungen)"
                  isEditing={isEditing}
                  value={isEditing ? editEinleitung : rechnung.daten?.einleitung}
                  onChange={(val) => { setEditEinleitung(val); setIsDirty(true) }}
                  readOnlyText={rechnung.daten?.einleitung}
                />
                
                <RechnungLeistungsTabelle 
                  isEditing={isEditing}
                  leistungen={rechnung.daten?.leistungen || []}
                  editLeistungen={editLeistungen}
                  onChangeLeistungen={(newList) => { setEditLeistungen(newList); setIsDirty(true) }}
                  mwst={editKonditionen.mwst || 8.1}
                  onShowKatalogDrawer={() => {}} 
                />
                
                <RechnungTotals 
                  isEditing={isEditing}
                  rawTotal={calculateDocumentTotals(isEditing ? editLeistungen : (rechnung.daten?.leistungen || []), isEditing ? editKonditionen : (rechnung.daten || {})).subtotal}
                  rabattProzent={isEditing ? editKonditionen.rabatt : (rechnung.daten?.rabatt || 0)}
                  rabattBetrag={calculateDocumentTotals(isEditing ? editLeistungen : (rechnung.daten?.leistungen || []), isEditing ? editKonditionen : (rechnung.daten || {})).rabattAmount}
                  mwstProzent={isEditing ? editKonditionen.mwst : (rechnung.daten?.mwst || 8.1)}
                  mwstBetrag={calculateDocumentTotals(isEditing ? editLeistungen : (rechnung.daten?.leistungen || []), isEditing ? editKonditionen : (rechnung.daten || {})).taxAmount}
                  isPauschalActive={false}
                  finalTotal={calculateDocumentTotals(isEditing ? editLeistungen : (rechnung.daten?.leistungen || []), isEditing ? editKonditionen : (rechnung.daten || {})).total}
                />
                
                <RechnungTexte 
                  label="Schlusstext (nach der Kalkulation)"
                  isEditing={isEditing}
                  value={isEditing ? editSchluss : rechnung.daten?.schluss}
                  onChange={(val) => { setEditSchluss(val); setIsDirty(true) }}
                  readOnlyText={rechnung.daten?.schluss}
                />
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4 sticky bottom-4 z-10">
                  <button
                    onClick={saveRechnung}
                    disabled={isUpdating}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? 'Wird gespeichert...' : '💾 Rechnung speichern'}
                  </button>
                </div>
              )}
            </div>
            
            {showLivePreview && isEditing && (
              <div className="hidden xl:block h-[calc(100vh-120px)] sticky top-6">
                <div className="w-full h-full border border-border rounded-2xl overflow-hidden shadow-xl bg-white">
                  <RechnungPrintView 
                    rechnung={{...rechnung, daten: { ...rechnung.daten, leistungen: editLeistungen, einleitung: editEinleitung, schluss: editSchluss, rabatt: editKonditionen.rabatt, mwst: editKonditionen.mwst }}} 
                    kunde={kunde} 
                    projekt={projekt} 
                    settings={settings} 
                    hideButtons={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {!showLivePreview && showPrintView && (
        <RechnungPrintView 
           rechnung={rechnung} 
           kunde={kunde} 
           projekt={projekt} 
           settings={settings} 
           onClose={() => setShowPrintView(false)} 
        />
      )}
    </>
  )
}
`;

fs.writeFileSync('src/views/RechnungDetailView.jsx', beforeReturn + newReturn);
console.log('Successfully rewrote RechnungDetailView.jsx');
