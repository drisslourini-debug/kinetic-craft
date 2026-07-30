import re

with open('src/views/RechnungDetailView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Header modification
header_old = """      {/* Header mit Zurück-Button & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <button 
            onClick={handleBackClick}
            className="p-2 mt-1 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary truncate">
                Rechnung {rechnung.rechnung_nr || `#${rechnung.id}`}
              </h2>
              
              <div className="relative inline-block">
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdating}
                  className={`appearance-none pl-3 pr-8 py-1 text-xs font-bold rounded-full border-2 focus:outline-none transition-all cursor-pointer ${
                    status === 'Bezahlt' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                    status === 'Versendet' ? 'border-primary-200 bg-primary-50 text-primary-700' :
                    status === 'Überfällig' ? 'border-red-200 bg-red-50 text-red-700' :
                    status === 'Storniert' ? 'border-gray-300 bg-gray-100 text-gray-800' :
                    'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                >
                  <option value="Entwurf">Entwurf</option>
                  <option value="Versendet">Versendet</option>
                  <option value="Bezahlt">Bezahlt</option>
                  <option value="Überfällig">Überfällig</option>
                  <option value="Storniert">Storniert</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {(isUpdating || isDirty || isEditing) && (
                <span className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-primary-500 animate-pulse' : 'bg-amber-500'}`} title={isUpdating ? 'Speichert...' : 'Ungespeicherte Änderungen'}></span>
              )}
            </div>
            <p className="text-text-secondary mt-1 text-sm">Erstellt am {formatDate(rechnung.created_at)}</p>
          </div>
        </div>

        {/* Primary Action + More Menu */}
        <div className="flex items-center gap-2 self-start sm:self-auto pl-12 sm:pl-0 w-full sm:w-auto relative">
          {isEditing && (
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`hidden xl:inline-flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer border ${
                showLivePreview 
                  ? 'bg-primary-50 text-primary-700 border-primary-200' 
                  : 'bg-surface text-text-secondary border-border hover:bg-surface-card hover:text-text-primary'
              }`}
              title="Split-Screen Live-Vorschau (nur Desktop)"
            >
              {showLivePreview ? '👁️ Live-Vorschau an' : '👁️ Live-Vorschau aus'}
            </button>
          )}
          <button
            onClick={() => setShowPrintView(true)}
            disabled={isDirty || isEditing}
            className="flex-1 sm:flex-none justify-center px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            PDF anzeigen/teilen
          </button>"""

header_new = """      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackClick}
            className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary truncate">
                Rechnung {rechnung.rechnung_nr || `#${rechnung.id}`}
              </h2>
              {isUpdating && <span className="text-xs text-text-secondary">Speichert...</span>}
            </div>
            <p className="text-text-secondary mt-1">Erstellt am {formatDate(rechnung.created_at)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 ${
              status === 'Bezahlt' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              status === 'Versendet' ? 'border-primary-200 bg-primary-50 text-primary-700' :
              status === 'Überfällig' ? 'border-red-200 bg-red-50 text-red-700' :
              status === 'Storniert' ? 'border-gray-300 bg-gray-100 text-gray-800' :
              'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <option value="Entwurf">Entwurf</option>
            <option value="Versendet">Versendet</option>
            <option value="Bezahlt">Bezahlt</option>
            <option value="Überfällig">Überfällig</option>
            <option value="Storniert">Storniert</option>
          </select>
          
          {/* Main Action: PDF View or Edit */}
          {isEditing && (
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`hidden xl:inline-flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer border ${
                showLivePreview 
                  ? 'bg-primary-50 text-primary-700 border-primary-200' 
                  : 'bg-surface text-text-secondary border-border hover:bg-surface-card hover:text-text-primary'
              }`}
              title="Split-Screen Live-Vorschau (nur Desktop)"
            >
              {showLivePreview ? '👁️ Live-Vorschau an' : '👁️ Live-Vorschau aus'}
            </button>
          )}
          {!isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-primary-200 text-primary-700 font-bold text-sm rounded-xl hover:bg-primary-50 transition-colors cursor-pointer shadow-sm"
            >
              ✏️ Rechnung bearbeiten
            </button>
          )}
          <button
            onClick={() => setShowPrintView(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-bold text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">PDF anzeigen</span>
            <span className="sm:hidden">PDF</span>
          </button>"""

if header_old in content:
    content = content.replace(header_old, header_new)
else:
    print("Header not found")

# 2. Remove tabs HTML
tabs_html_pattern = re.compile(r'\{\/\* Tabs \*\/\}.*?<\/div>', re.DOTALL)
content = tabs_html_pattern.sub('', content)

# 3. Remove "activeTab === 'stammdaten'" wrap
content = content.replace("{activeTab === 'stammdaten' && (", "")
content = content.replace("""            <div className="animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-6">""", """          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">""")

# Replace the closing div and )} for stammdaten, which is right before "TAB: LEISTUNGEN"
stammdaten_close_pattern = r'(\s*)</div>\s*\)\}\s*\{\/\* TAB: LEISTUNGEN \*\/\}'
content = re.sub(stammdaten_close_pattern, r'\1{/* TAB: LEISTUNGEN */}', content)

# 4. Remove "activeTab === 'leistungen'" wrap
leistungen_open_pattern = r'\{\/\* TAB: LEISTUNGEN \*\/\}\s*\{activeTab === \'leistungen\' && \(\s*<div className="animate-fade-in-up space-y-6">'
content = re.sub(leistungen_open_pattern, r'{/* TAB: LEISTUNGEN */}\n          <div className="space-y-6 mt-6">', content)

# Remove the 'Edit-Mode Toggle' and 'Save/Cancel' buttons from the Leistungen tab
edit_mode_toggle_pattern = re.compile(r'\{\/\* Edit-Mode Toggle \*\/\}.*?\{\/\* ENDE Header Leistungen \*\/\}\s*<\/div>', re.DOTALL)
content = edit_mode_toggle_pattern.sub('', content)

# Remove Save/Cancel buttons block at the end of Leistungen tab
save_buttons_pattern = re.compile(r'\{\/\* Save / Cancel Actions \*\/\}.*?<\/div>', re.DOTALL)
content = save_buttons_pattern.sub('', content)

# Also remove the Subtle delete button block since we want to move it to the end or it's redundant
delete_btn_pattern = re.compile(r'\{\/\* Subtle Delete Button \*\/\}.*?<\/div>', re.DOTALL)
content = delete_btn_pattern.sub('', content)

# 5. Fix closing brackets of 'leistungen' tab
# It used to end with:
#             </div>
#           )}
# 
#           {/* Action Buttons removed from bottom - now in top menu */}
#         </div>
#
# Replace with just </div>
leistungen_close_pattern = r'(\s*)</div>\s*\)\}\s*\{\/\* Action Buttons removed from bottom - now in top menu \*\/\}'
content = re.sub(leistungen_close_pattern, r'\1{/* Action Buttons removed from bottom - now in top menu */}', content)

# 6. Add the fixed bottom-0 save/cancel bar
bottom_bar = """
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-surface/80 backdrop-blur-md border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex items-center justify-end gap-3 animate-slide-up">
          <button
            onClick={cancelEditing}
            className="px-5 py-2.5 bg-surface-card border border-border text-text-secondary font-bold text-sm rounded-xl hover:bg-surface transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={saveEditing}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? 'Speichert...' : '💾 Änderungen speichern'}
          </button>
        </div>
      )}
"""
content = content.replace("      {/* Unsaved Changes Modal */}", bottom_bar + "\n      {/* Unsaved Changes Modal */}")


# Also remove `const [activeTab, setActiveTab] = useState('stammdaten')`
content = content.replace("  const [activeTab, setActiveTab] = useState('stammdaten')\n", "")

with open('src/views/RechnungDetailView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
