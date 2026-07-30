const fs = require('fs');

let code = fs.readFileSync('src/views/RechnungDetailView.jsx', 'utf8');

// 1. Add Import
code = code.replace(
  /import { supabase } from '\.\.\/lib\/supabase'/,
  `import { supabase } from '../lib/supabase'\nimport RechnungDuplicateModal from '../components/RechnungDuplicateModal'`
);

// 2. Add State
code = code.replace(
  /const \[showActionMenu, setShowActionMenu\] = useState\(false\)/,
  `const [showActionMenu, setShowActionMenu] = useState(false)\n  const [showDuplicateModal, setShowDuplicateModal] = useState(false)`
);

// 3. Replace handleDuplicate logic
code = code.replace(
  /const handleDuplicate = async \(\) => \{[\s\S]*?\}\n\s+const handlePayment = async/g,
  `const handleDuplicate = () => {\n    setShowDuplicateModal(true)\n  }\n\n  const handlePayment = async`
);

// 4. Add the Modal JSX at the end of the return statement, right before the showPaymentForm
code = code.replace(
  /\{showPaymentForm && \(/,
  `{showDuplicateModal && (
        <RechnungDuplicateModal
          currentRechnung={rechnung}
          onClose={() => setShowDuplicateModal(false)}
          onSuccess={(newId) => {
            setShowDuplicateModal(false)
            if (onNavigate) {
              onNavigate('rechnungen', { rechnungId: newId })
            } else {
              window.location.reload()
            }
          }}
        />
      )}

      {showPaymentForm && (`
);

fs.writeFileSync('src/views/RechnungDetailView.jsx', code);
console.log('Patched RechnungDetailView.jsx for Duplicate Modal');
