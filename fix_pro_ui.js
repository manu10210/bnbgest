const fs = require('fs');

const pathComp = 'c:/Users/claus/BNBGEST/components/GmailImporter.tsx';
let txtComp = fs.readFileSync(pathComp, 'utf8');

const warningCode = `
                              {typeof booking.warnings !== 'undefined' && booking.warnings.length > 0 && (
                                <div className={\`w-full mt-3 p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 \${isDark ? 'border-amber-700/30 bg-amber-900/10 text-amber-300' : 'border-amber-200/60 bg-amber-50 text-amber-700'}\`}>
                                  {booking.warnings.map((w, idx) => (
                                    <div key={idx} className="flex flex-row items-start gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-80" />
                                      <span className="font-medium">{w}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
`;

txtComp = txtComp.replace('{/* Property Info Logement */}', '}</div>\n' + warningCode + '\n                              {/* Property Info Logement */}');
fs.writeFileSync(pathComp, txtComp, 'utf8');
console.log('UI Patched!');
