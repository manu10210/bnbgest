
const fs = require('fs');
let code = fs.readFileSync('components/GmailImporter.tsx', 'utf8');
code = code.replace(
  '/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\\\\s+[A-Za-zÀ-ÿ\\\\-]+){0,3}\\\\s+(a\\\\s+r[eé]serv|annul|modifi|laiss|part\\\\s|arrive|r[eé]dig|souhait|veut|aimer)/i',
  '/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\\\\s+[A-Za-zÀ-ÿ\\\\-]+){0,3}\\\\s+(a\\\\s+r[eé]serv|annul|modifi|laiss|part\\\\s|arrive|r[eé]dig|souhait|veut|aimer|not|eval|éval)/i'
);
code = code.replace(
  '\\\\bcheck[\\\\s-]?(in|out)\\\\b/i.test(b.subject || \\'\\');',
  '\\\\bcheck[\\\\s-]?(in|out)\\\\b/i.test(b.subject || \\'\\') || /\\\\b(avis|review|[eé]valuation|commentaire|étoile|stars?)\\\\b/i.test(b.subject || \\'\\');'
);
fs.writeFileSync('components/GmailImporter.tsx', code);

code = fs.readFileSync('lib/gmail-parser.ts', 'utf8');
code = code.replace(
  '/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\\\\s+[A-Za-zÀ-ÿ\\\\-]+){0,3}\\\\s+(a\\\\s+r[eé]serv|annul|modifi|laiss|part\\\\s|arrive|r[eé]dig|souhait|veut|aimer)/i',
  '/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\\\\s+[A-Za-zÀ-ÿ\\\\-]+){0,3}\\\\s+(a\\\\s+r[eé]serv|annul|modifi|laiss|part\\\\s|arrive|r[eé]dig|souhait|veut|aimer|not|eval|éval)/i'
);
code = code.replace(
  '\\\\bcheck[\\\\s-]?(in|out)\\\\b/i.test(subject);',
  '\\\\bcheck[\\\\s-]?(in|out)\\\\b/i.test(subject) || /\\\\b(avis|review|[eé]valuation|commentaire|étoile|stars?)\\\\b/i.test(subject);'
);
fs.writeFileSync('lib/gmail-parser.ts', code);

