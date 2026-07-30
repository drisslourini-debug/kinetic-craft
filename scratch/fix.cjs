const fs = require('fs');
let code = fs.readFileSync('src/views/RechnungDetailView.jsx', 'utf8');

const regex = /catch \(err\) \{\r?\n\s+try \{\r?\n\s+await supabase\.from\('rechnungen'\)\.update\(\{ is_archived: true \}\)/;

const fixedContent = `catch (err) {
      console.error(\`Failed to update \${field}:\`, err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDuplicate = () => {
    setShowDuplicateModal(true)
  }

  const handleArchive = async () => {
    if (!window.confirm('Rechnung wirklich archivieren?')) return
    setIsUpdating(true)
    try {
      await supabase.from('rechnungen').update({ is_archived: true })`;

code = code.replace(regex, fixedContent);
fs.writeFileSync('src/views/RechnungDetailView.jsx', code);
