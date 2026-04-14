const fs = require('fs');
const path = 'c:/Users/claus/BNBGEST/lib/gmail-parser.ts';
let txt = fs.readFileSync(path, 'utf8');

const regex = /(const cleanCandidate = \(raw: string\): string =>\s*)(stripDateSuffix[\s\S]*?\.slice\(0, 80\);)/;

txt = txt.replace(regex, (m, p1, p2) => {
  return "const cleanCandidate = (raw: string): string => {\n    const c = " + p2 + "\n    if (c && (/[?=&%]|https?:/.test(c) || (c.length > 50 && !c.includes(' ')))) return '';\n    return c;\n  };";
});

fs.writeFileSync(path, txt, 'utf8');

const path2 = 'c:/Users/claus/BNBGEST/components/GmailImporter.tsx';
let txt2 = fs.readFileSync(path2, 'utf8');

const regex2 = /\.filter\(n => n\.length >= 5\)/;
txt2 = txt2.replace(regex2, ".filter(n => n.length >= 5 && !/[?=&%]|https?:/.test(n) && !(n.length > 50 && !n.includes(' ')))");

fs.writeFileSync(path2, txt2, 'utf8');

console.log('Fixed parser and importer!');
