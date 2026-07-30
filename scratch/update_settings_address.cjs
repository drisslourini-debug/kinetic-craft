const fs = require('fs');

const path = 'src/views/EinstellungenView.jsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('import AddressAutocomplete')) {
  code = code.replace("import { supabase } from '../lib/supabase'", "import { supabase } from '../lib/supabase'\nimport AddressAutocomplete from '../components/AddressAutocomplete'");
}

const targetInput = `<InputField label="Strasse & Nr." value={draft.strasse} onChange={v => handleDraftChange('strasse', v)} placeholder="Musterstrasse 12" />`;
const replacementInput = `<div className="">
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Strasse (Auto-Fill)</label>
                <AddressAutocomplete 
                  value={draft.strasse || ''} 
                  onChange={(val, details) => {
                    if (details) {
                      setDraft(prev => ({...prev, strasse: details.strasse, plz_ort: \`\${details.plz} \${details.ort}\`.trim()}))
                    } else {
                      handleDraftChange('strasse', val)
                    }
                  }}
                  placeholder="Strasse eingeben..."
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
                />
              </div>`;

code = code.replace(targetInput, replacementInput);

fs.writeFileSync(path, code);
console.log('Successfully updated EinstellungenView.jsx with AddressAutocomplete');
