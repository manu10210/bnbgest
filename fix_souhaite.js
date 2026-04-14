const fs = require('fs');
const path1 = 'c:/Users/claus/BNBGEST/lib/gmail-parser.ts';
const path2 = 'c:/Users/claus/BNBGEST/components/GmailImporter.tsx';

let txt1 = fs.readFileSync(path1, 'utf8');
txt1 = txt1.replace(/modifi\|laiss\|r\[e.\]dig\)/g, 'modifi|laiss|r[eé]dig|souhait)');
txt1 = txt1.replace(/modifi\|laiss\|part\\s\|arrive\|r\[e.\]dig\)/g, 'modifi|laiss|part\\s|arrive|r[eé]dig|souhait|veut|aimer)');
fs.writeFileSync(path1, txt1, 'utf8');

let txt2 = fs.readFileSync(path2, 'utf8');
txt2 = txt2.replace(/modifi\|laiss\|part\\s\|arrive\|r\[e.\]dig\)/g, 'modifi|laiss|part\\s|arrive|r[eé]dig|souhait|veut|aimer)');
fs.writeFileSync(path2, txt2, 'utf8');

console.log('Fixed souhaite via modifi!');
