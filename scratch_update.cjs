const fs = require('fs');
const path = require('path');

const offertenPath = path.join(__dirname, 'src', 'components', 'OffertenWizard.jsx');
let offCode = fs.readFileSync(offertenPath, 'utf8');

// 1. Update STEPS
offCode = offCode.replace(
  `const STEPS = [
  { id: 1, label: 'Kunde', icon: '👤' },
  { id: 2, label: 'Ausführung', icon: '📅' },
  { id: 3, label: 'Leistungen', icon: '🔨' },
  { id: 4, label: 'Abschluss', icon: '✅' },
]`,
  `const STEPS = [
  { id: 1, label: 'Kunde', icon: '👤' },
  { id: 2, label: 'Ausführung', icon: '📅' },
  { id: 3, label: 'Leistungen', icon: '🔨' },
  { id: 4, label: 'Texte', icon: '📝' },
  { id: 5, label: 'Abschluss', icon: '✅' },
]`
);

// 2. Update INITIAL_FORM_DATA
offCode = offCode.replace(
  `  konditionen: { rabatt: '0', mwst: '8.1' },`,
  `  konditionen: { rabatt: '0', mwst: '8.1' },
  texte: { einleitungstext: '', schlusstext: '' },`
);

// 3. Update flattenBloecke
offCode = offCode.replace(
  `        einzelpreis: pos.nurInfo ? '' : pos.einzelpreis,
      })`,
  `        einzelpreis: pos.nurInfo ? '' : pos.einzelpreis,
        optional: pos.optional || false,
        nurInfo: pos.nurInfo || false,
      })`
);

// 4. Update currentStep bounds
offCode = offCode.replace(/setCurrentStep\(\(s\) => Math\.min\(s \+ 1, 4\)\)/g, `setCurrentStep((s) => Math.min(s + 1, 5))`);
offCode = offCode.replace(/\{currentStep < 4 \? \(/g, `{currentStep < 5 ? (`);

// 5. Add StepTexte component
const stepTexteOfferten = `
function StepTexte({ data, onChange }) {
  const EINLEITUNG_TEMPLATES = [
    { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
    { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Offerte zu unterbreiten:' },
    { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' }
  ]
  const SCHLUSS_TEMPLATES = [
    { label: 'Standard', text: 'Wir hoffen, dass diese Offerte Ihren Vorstellungen entspricht und stehen für Fragen jederzeit gerne zur Verfügung.' },
    { label: 'Kurz', text: 'Freundliche Grüsse' },
    { label: 'Persönlich', text: 'Wir freuen uns darauf, dieses Projekt gemeinsam mit Ihnen umzusetzen.' }
  ]

  return (
    <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Begrüssungs- & Abschlusstext</h3>
        <p className="text-sm text-text-secondary">Wähle eine Vorlage oder schreibe einen eigenen Text für das PDF.</p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-text-primary">Einleitungstext</label>
            <div className="flex gap-1">
              {EINLEITUNG_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => onChange({ ...data, einleitungstext: t.text })} className="text-xs bg-surface border border-border px-2 py-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3}
            value={data.einleitungstext}
            onChange={(e) => onChange({ ...data, einleitungstext: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            placeholder="Text eingeben..."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-text-primary">Schlusstext</label>
            <div className="flex gap-1">
              {SCHLUSS_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => onChange({ ...data, schlusstext: t.text })} className="text-xs bg-surface border border-border px-2 py-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3}
            value={data.schlusstext}
            onChange={(e) => onChange({ ...data, schlusstext: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            placeholder="Text eingeben..."
          />
        </div>
      </div>
    </div>
  )
}
`;
offCode = offCode.replace(`// ─── Main Wizard ─────────────────────────────────────────────────────────────`, stepTexteOfferten + `\n// ─── Main Wizard ─────────────────────────────────────────────────────────────`);

// 6. Update switch statement
offCode = offCode.replace(
  `      case 4:
        return (
          <StepAbschluss`,
  `      case 4:
        return (
          <StepTexte
            data={formData.texte}
            onChange={(texte) => setFormData((prev) => ({ ...prev, texte }))}
          />
        )
      case 5:
        return (
          <StepAbschluss`
);

fs.writeFileSync(offertenPath, offCode);


// -------------------------------------------------------------
// RECHNUNGEN WIZARD
// -------------------------------------------------------------

const rechPath = path.join(__dirname, 'src', 'components', 'RechnungenWizard.jsx');
let rCode = fs.readFileSync(rechPath, 'utf8');

// 1. Update STEPS
rCode = rCode.replace(
  `const STEPS = [
  { id: 1, label: 'Referenz', icon: '📎' },
  { id: 2, label: 'Rechnungsdetails', icon: '📅' },
  { id: 3, label: 'Leistungen', icon: '🔨' },
  { id: 4, label: 'Abschluss', icon: '✅' },
]`,
  `const STEPS = [
  { id: 1, label: 'Referenz', icon: '📎' },
  { id: 2, label: 'Rechnungsdetails', icon: '📅' },
  { id: 3, label: 'Leistungen', icon: '🔨' },
  { id: 4, label: 'Texte', icon: '📝' },
  { id: 5, label: 'Abschluss', icon: '✅' },
]`
);

// 2. Update INITIAL_FORM_DATA
rCode = rCode.replace(
  `  konditionen: { rabatt: '0', mwst: '8.1' },`,
  `  konditionen: { rabatt: '0', mwst: '8.1' },
  texte: { einleitungstext: '', schlusstext: '' },`
);

// 3. Update flattenBloecke
rCode = rCode.replace(
  `        einzelpreis: pos.nurInfo ? '' : pos.einzelpreis,
      })`,
  `        einzelpreis: pos.nurInfo ? '' : pos.einzelpreis,
        optional: pos.optional || false,
        nurInfo: pos.nurInfo || false,
      })`
);

// 3.b Fix Akonto in RechnungenWizard.jsx Step 2
rCode = rCode.replace(
  `          {data.typ === 'akontorechnung' && (
            <div className="bg-primary-50 border border-primary-200 text-primary-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
              <span className="text-xl">⚠️</span>
              <p className="mt-0.5">
                Bei einer Akontorechnung wird der Gesamtbetrag der ausgewählten Offerte anhand des angegebenen Prozentsatzes berechnet.
              </p>
            </div>
          )}`,
  `          {data.typ === 'akontorechnung' && (
            <div className="bg-primary-50 border border-primary-200 px-4 py-4 rounded-xl flex flex-col gap-3 animate-fade-in">
              <div className="text-primary-800 text-sm flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <p className="mt-0.5">
                  Bitte gib den gewünschten Akonto-Prozentsatz ein. Der Rechnungsbetrag wird dann basierend auf den selektierten Leistungen automatisch berechnet.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary-700 uppercase tracking-wider mb-1">
                  Akonto-Prozentsatz <span className="text-red-500">*</span>
                </label>
                <div className="relative max-w-[200px]">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={data.akonto || ''}
                    onChange={(e) => onChange({ ...data, akonto: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-primary-200 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 pr-8"
                    placeholder="z.B. 30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">%</span>
                </div>
              </div>
            </div>
          )}`
);

// 4. Update currentStep bounds
rCode = rCode.replace(/setCurrentStep\(\(s\) => Math\.min\(s \+ 1, 4\)\)/g, `setCurrentStep((s) => Math.min(s + 1, 5))`);
rCode = rCode.replace(/\{currentStep < 4 \? \(/g, `{currentStep < 5 ? (`);

// 5. Add StepTexte component
const stepTexteRech = `
function StepTexte({ data, onChange }) {
  const EINLEITUNG_TEMPLATES = [
    { label: 'Standard', text: 'Gerne stellen wir Ihnen folgende Arbeiten in Rechnung:' },
    { label: 'Förmlich', text: 'Für die erbrachten Leistungen erlauben wir uns, Ihnen folgende Rechnung zu stellen:' },
    { label: 'Akonto', text: 'Gemäss unserer Vereinbarung stellen wir Ihnen folgende Akontorechnung:' }
  ]
  const SCHLUSS_TEMPLATES = [
    { label: 'Standard', text: 'Wir danken Ihnen für den geschätzten Auftrag und das entgegengebrachte Vertrauen.' },
    { label: 'Kurz', text: 'Freundliche Grüsse' },
    { label: 'Zahlungsziel', text: 'Wir bitten um Überweisung des Rechnungsbetrags innert der angegebenen Zahlungsfrist.' }
  ]

  return (
    <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Begrüssungs- & Abschlusstext</h3>
        <p className="text-sm text-text-secondary">Wähle eine Vorlage oder schreibe einen eigenen Text für das PDF.</p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-text-primary">Einleitungstext</label>
            <div className="flex gap-1">
              {EINLEITUNG_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => onChange({ ...data, einleitungstext: t.text })} className="text-xs bg-surface border border-border px-2 py-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3}
            value={data.einleitungstext}
            onChange={(e) => onChange({ ...data, einleitungstext: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            placeholder="Text eingeben..."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-text-primary">Schlusstext</label>
            <div className="flex gap-1">
              {SCHLUSS_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => onChange({ ...data, schlusstext: t.text })} className="text-xs bg-surface border border-border px-2 py-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3}
            value={data.schlusstext}
            onChange={(e) => onChange({ ...data, schlusstext: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            placeholder="Text eingeben..."
          />
        </div>
      </div>
    </div>
  )
}
`;
rCode = rCode.replace(`// ─── Main Wizard ─────────────────────────────────────────────────────────────`, stepTexteRech + `\n// ─── Main Wizard ─────────────────────────────────────────────────────────────`);

// 6. Update switch statement
rCode = rCode.replace(
  `      case 4:
        return (
          <StepAbschluss`,
  `      case 4:
        return (
          <StepTexte
            data={formData.texte}
            onChange={(texte) => setFormData((prev) => ({ ...prev, texte }))}
          />
        )
      case 5:
        return (
          <StepAbschluss`
);

fs.writeFileSync(rechPath, rCode);
console.log('Update complete');
