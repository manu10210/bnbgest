const fs = require('fs');
let code = fs.readFileSync('components/GmailImporter.tsx', 'utf8');

const additionalChips = `                {importSummary.payoutsSaved > 0 && (
                  <span className={\`px-2 py-0.5 rounded-full font-medium \${isDark ? 'bg-teal-800 text-teal-200' : 'bg-teal-100 text-teal-700'}\`}>
                    💰 {importSummary.payoutsSaved} versement{importSummary.payoutsSaved > 1 ? 's' : ''} enregistré{importSummary.payoutsSaved > 1 ? 's' : ''}
                  </span>
                )}
                {importSummary.expensesCreated > 0 && (
                  <span className={\`px-2 py-0.5 rounded-full font-medium \${isDark ? 'bg-rose-800 text-rose-200' : 'bg-rose-100 text-rose-700'}\`}>
                    📉 {importSummary.expensesCreated} frais Airbnb (dépenses) créé{importSummary.expensesCreated > 1 ? 's' : ''}
                  </span>
                )}`;

// Find reviewsImported logic and append
code = code.replace(/(\{\s*importSummary\.reviewsImported > 0 && \([\s\S]*?(?=\n\s*<\/(div|span)>)\s*\n\s*\})/, "$1\n" + additionalChips);

fs.writeFileSync('C:\\Users\\claus\\BNBGEST\\do_patch2.js', code);
