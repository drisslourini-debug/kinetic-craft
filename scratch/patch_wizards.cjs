const fs = require('fs');

function patchDrawer(filePath, type) {
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Add settings state
  if (!code.includes('const [settings, setSettings] = useState(null)')) {
    code = code.replace(
      'const [isSubmitting, setIsSubmitting] = useState(false)',
      'const [isSubmitting, setIsSubmitting] = useState(false)\n  const [settings, setSettings] = useState(null)'
    );
  }

  // 2. Fetch settings in loadData
  const loadDataRegex = /async function loadData\(\) \{[\s\S]*?try \{/;
  if (code.match(loadDataRegex) && !code.includes('from(\'einstellungen\')')) {
    const newLoadData = `async function loadData() {
      try {
        const { data: setts } = await supabase.from('einstellungen').select('*').eq('id', 1).single()
        if (setts) setSettings(setts)
        `;
    code = code.replace(loadDataRegex, newLoadData);
  }

  // 3. Patch creation logic
  if (type === 'offerte') {
    if (!code.includes('const nextNr =')) {
      const draftDataRegex = /const draftData = \{[\s\S]*?konditionen: \{ rabatt: 0, mwst: 8\.1 \},[\s\S]*?pauschalpreis: null\s*\n\s*\}/;
      
      const newDraftDataStr = `
      // Generate Next Nr
      const prefix = 'OF-' + new Date().getFullYear() + '-';
      let nextNum = settings?.startnummer_offerten || 1000;
      const { data: existing } = await supabase.from('offerten').select('offerte_nr').not('offerte_nr', 'is', null).order('created_at', { ascending: false }).limit(10);
      if (existing && existing.length > 0) {
        const nums = existing.map(e => {
          const match = e.offerte_nr.match(/\\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        }).filter(n => n > 0);
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }
      
      const draftData = {
        kunden_id: selectedKundeId,
        projekt_id: selectedProjektId || null,
        status: 'Entwurf',
        total: 0,
        offerte_nr: prefix + nextNum,
        daten: {
          leistungen: [],
          konditionen: { rabatt: settings?.standard_rabatt || 0, mwst: settings?.standard_mwst || 8.1 },
          texte: { einleitungstext: '', schlusstext: '' },
          ausfuehrung: { start: '', dauer: '', notizen: '' },
          gueltig_bis: new Date(Date.now() + (settings?.gueltigkeit_offerten_tage || 30) * 24 * 60 * 60 * 1000).toISOString(),
          pauschalpreis: null
        }
      }`;
      code = code.replace(draftDataRegex, newDraftDataStr);
    }
  } else if (type === 'rechnung') {
    // RechnungenWizard.jsx has a different structure. 
    // It has `const handleSaveDraft = async () => { ... const baseDraft = { ... konditionen: { rabatt: 0, mwst: 8.1 } }`
    if (!code.includes('const nextNr =')) {
      const draftDataRegex = /const baseDraft = \{[\s\S]*?konditionen: \{ rabatt: 0, mwst: 8\.1 \},[\s\S]*?pauschalpreis: null\s*\n\s*\}/;
      
      const newDraftDataStr = `
      // Generate Next Nr
      const prefix = 'RE-' + new Date().getFullYear() + '-';
      let nextNum = settings?.startnummer_rechnungen || 1000;
      const { data: existing } = await supabase.from('rechnungen').select('rechnung_nr').not('rechnung_nr', 'is', null).order('created_at', { ascending: false }).limit(10);
      if (existing && existing.length > 0) {
        const nums = existing.map(e => {
          const match = e.rechnung_nr?.match(/\\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        }).filter(n => n > 0);
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }

      const baseDraft = {
        kunden_id: kunde.id,
        projekt_id: projekt?.id || null,
        status: isFinal ? 'Offen' : 'Entwurf',
        rechnung_nr: prefix + nextNum,
        faellig_am: new Date(Date.now() + (settings?.zahlungsfrist_tage || 30) * 24 * 60 * 60 * 1000).toISOString(),
        total: 0,
        daten: {
          leistungen: mappedLeistungen,
          konditionen: { rabatt: settings?.standard_rabatt || 0, mwst: settings?.standard_mwst || 8.1 },
          texte: { einleitungstext: '', schlusstext: '' },
          ausfuehrung: { start: '', dauer: '', notizen: '' },
          pauschalpreis: null
        }
      }`;
      if (code.match(draftDataRegex)) {
        code = code.replace(draftDataRegex, newDraftDataStr);
      }
    }
  }

  fs.writeFileSync(filePath, code);
}

patchDrawer('src/components/OfferteCreateDrawer.jsx', 'offerte');
patchDrawer('src/components/RechnungenWizard.jsx', 'rechnung');
console.log('Patched wizards successfully.');
