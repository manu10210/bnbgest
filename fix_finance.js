const fs = require('fs');
let code = fs.readFileSync('lib/gmail-parser.ts', 'utf8');

const parseCode = \const clean = m[1]
        .replace(/[€$£]/g, '')
        .replace(/[\\\\s\\\\xa0\\\\u202f]+/g, ' ')
        .trim();
      const normalized = clean.replace(/(\\\\d)\\\\s+(\\\\d)/g, '\\\\').replace(',', '.');
      const val = parseFloat(normalized);
      if (!isNaN(val) && val > 0) return val;\;

code = code.replace(/const clean = m\\[1\\]\\..+?parseFloat\\(clean\\);\\s*if\\s*\\(\\!isNaN.+?return val;/gs, parseCode);

fs.writeFileSync('lib/gmail-parser.ts', code);
