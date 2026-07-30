const fs = require('fs');

let code = fs.readFileSync('src/views/EinstellungenView.jsx', 'utf8');

// 1. Add handleRestoreDefaults function before handleAddTemplate
if (!code.includes('handleRestoreDefaults')) {
  const restoreFunc = `
  const handleRestoreDefaults = () => {
    if (window.confirm('Möchtest du die Standard-Vorlagen laden? Deine bisherigen bleiben erhalten.')) {
      const currentList = settings.text_vorlagen || []
      const newList = [...currentList]
      
      defaultTextVorlagen.forEach(defaultItem => {
         const exists = currentList.find(t => t.category === defaultItem.category && t.label === defaultItem.label)
         if (!exists) {
            newList.push({ ...defaultItem, id: Date.now().toString() + Math.random().toString(36).substring(7) })
         }
      })
      
      saveTemplateListToDb(newList)
    }
  }

  const handleAddTemplate`;
  
  code = code.replace('const handleAddTemplate', restoreFunc);
}

// 2. Add Button to UI
if (!code.includes('Standard laden</button>')) {
  const uiTarget = /<h3 className="text-xl font-bold text-text-primary mb-2">Offerten Vorlagen<\/h3>/;
  const uiReplacement = `<div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-text-primary">Offerten Vorlagen</h3>
                <button onClick={handleRestoreDefaults} className="text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-primary-100">Standard laden</button>
              </div>`;
  
  code = code.replace(uiTarget, uiReplacement);
  
  const uiTarget2 = /<h3 className="text-xl font-bold text-text-primary mb-2">Rechnungen Vorlagen<\/h3>/;
  const uiReplacement2 = `<div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-text-primary">Rechnungen Vorlagen</h3>
                <button onClick={handleRestoreDefaults} className="text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-primary-100">Standard laden</button>
              </div>`;
              
  code = code.replace(uiTarget2, uiReplacement2);
}

fs.writeFileSync('src/views/EinstellungenView.jsx', code);
console.log('Restore button added.');
