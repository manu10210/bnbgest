const fs = require('fs');
let code = fs.readFileSync('components/GmailImporter.tsx', 'utf8');

// Insert end of importing logic at the very end of importSelected logic (around line 905)
code = code.replace(/(setCurrentWizard\(queue\[0\]\);\s*\n\s*\})/, "$1\n\n      setTimeout(() => setStatus('idle'), 2500);\n      setStatus('done');");

fs.writeFileSync('components/GmailImporter.tsx', code);
