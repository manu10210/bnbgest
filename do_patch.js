const fs = require('fs');
let code = fs.readFileSync('components/GmailImporter.tsx', 'utf8');

if (!code.includes('import { motion')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, DownloadCloud, Database } from 'lucide-react';\nimport { motion, AnimatePresence } from 'framer-motion';");
}

code = code.replace("type SyncStatus = 'idle' | 'checking' | 'syncing' | 'done' | 'error';", "type SyncStatus = 'idle' | 'checking' | 'syncing' | 'importing' | 'done' | 'error';");
code = code.replace("type FilterType = 'all' | 'new' | 'cancelled';", "type FilterType = 'all' | 'new' | 'cancelled' | 'modified' | 'review' | 'payout';");

// Update importSummary interface
code = code.replace(/const \[importSummary, setImportSummary\]\s*=\s*useState<\{([^}]+)\}\s*\|\s*null>\(null\);/, 
    "const [importSummary, setImportSummary] = useState<{$1; payoutsSaved: number; expensesCreated: number} | null>(null);");

code = code.replace(/const summary = \{\s*created: 0,\s*cancelled: 0,\s*guestsCreated: 0,\s*guestsUpdated: 0,\s*skipped: 0,\s*skippedDuplicate: 0,\s*skippedNoProperty: 0,\s*tasksCreated: 0,\s*reviewsImported: 0\s*\};/, 
    "const summary = { created: 0, cancelled: 0, guestsCreated: 0, guestsUpdated: 0, skipped: 0, skippedDuplicate: 0, skippedNoProperty: 0, tasksCreated: 0, reviewsImported: 0, payoutsSaved: 0, expensesCreated: 0 };");

// Fix importSelected
code = code.replace(/const importSelected = useCallback\(\(\) => \{/g, "const importSelected = useCallback(async () => {\n  setStatus('importing');");
code = code.replace(/for \(const b of toImport\) \{/g, "for (const b of toImport) {\n      await new Promise(r => setTimeout(r, 200)); // Animation de transfert visible");

code = code.replace(/summary\.created\+\+; \/\/ compté comme une action réalisée/, "summary.payoutsSaved++;");
code = code.replace(/summary\.created\+\+;\s*\}\s*\}\s*\}\s*\/\/\s*──\s*4\.h\. Créer les dépenses/, "summary.payoutsSaved++;\n          }\n        }\n      }\n\n      // ── 4.h. Créer les dépenses");

// Update end of importSelected
code = code.replace(/setSelected\(new Set\(\)\);/, "setSelected(new Set());\n      setTimeout(() => setStatus('idle'), 2000);");

// Render updating filters
code = code.replace(/\(\['all', 'new', 'cancelled'\] as FilterType\[\]\)\.map\(f => \(/, "(['all', 'new', 'cancelled', 'modified', 'payout', 'review'] as FilterType[]).map(f => (");
code = code.replace(/f === 'all' \? `Tous \(\$\{bookings\.length\}\)` : f === 'new' \? `Nouvelles \(\$\{newCount\}\)` : 'Annulées'/, "f === 'all' ? `Tous (${bookings.length})` : f === 'new' ? `Nouvelles (${newCount})` : f === 'cancelled' ? 'Annulées' : f === 'payout' ? 'Versements' : f === 'review' ? 'Avis' : 'Modifications'");
code = code.replace(/const filtered = bookings\.filter\(b => filter === 'all' \? true : filter === 'new' \? b\.bookingType === 'new' : b\.bookingType === 'cancelled'\);/, 
    "const filtered = bookings.filter(b => filter === 'all' ? true : b.bookingType === filter);");


// Animation modal at top of render

const modalHtml = `
      {/* ── Overlay Animation Transfert Moderne ── */}
      <AnimatePresence>
        {status === 'importing' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center w-full max-w-sm"
            >
              <div className="relative flex items-center justify-between w-full mb-8 px-4">
                <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center relative">
                  <DownloadCloud className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border-2 border-violet-400" />
                </div>
                
                {/* Ligne pointillée animée */}
                <div className="flex-1 h-0.5 mx-4 overflow-hidden relative opacity-50">
                  <motion.div 
                    animate={{ x: \['-100%', '100%'\], opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500 to-transparent"
                  />
                  <div className="w-full h-full border-t-2 border-dashed border-gray-300 dark:border-gray-600" />
                </div>

                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center relative">
                  <Database className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="absolute inset-0 rounded-full border-2 border-emerald-400" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Classement en cours...</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Traitement intelligent et enregistrement sécurisé dans vos bases de données...
              </p>
              
              <motion.div 
                className="mt-6 w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden"
              >
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

code = code.replace(/\{status === 'checking' \|\| status === 'syncing' \? \(/, modalHtml + "\n      {status === 'checking' || status === 'syncing' ? (");

fs.writeFileSync('C:\\Users\\claus\\BNBGEST\\patch.js', code);
