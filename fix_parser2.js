const fs = require("fs");
let content = fs.readFileSync("lib/gmail-parser.ts", "utf8");

content = content.replace(/function extractPropertyName\([^)]+\): string \| undefined \{[\r\n]+(\s*\/\/[^\n]*versement[^\n]*\n)/,
`function extractPropertyName(text: string, subject?: string): string | undefined {
    // -- GUARD : emails de type "arrive le" / "part" ? jamais de nom de logement --------------
    if (subject && (
      /\\barrive\\s+(le|demain|aujourd|dans\\s+\\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject) ||
      /\\bpart\\s+(le|demain|aujourd|dans\\s+\\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject) ||
      /^(?:\\[[^\\]]+\\]\\s*)?[A-ZÀ-ŸŒÆ][a-zà-ÿœæ]+\\s+(a\\s+r[eé]serv|annul|modifi|laiss|part\\s|arrive)/i.test(subject) ||
      /\\bcheck[\\s-]?(in|out)\\b/i.test(subject)
    )) {
      return undefined;
    }

$1`);

const match2 = /const isPersonSubject = \/\^\[A-Z.*?(?:[^\n]*)subject\).*?;/s.exec(content);
if(match2) {
  const rep2 = `const isPersonSubject = /^(?:\\[[^\\]]+\\]\\s*)?[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\\s+[A-Za-zÀ-ÿ\\-]+){0,3}\\s+(a\\s+r[eé]serv|annul|modifi|laiss|part\\s|arrive)/i.test(subject)
      || /\\barrive\\s+(le|demain|aujourd|dans\\s+\\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject)
      || /^rappel\\s*[:\\-–]/i.test(subject)
      || /\\bpart\\s+(aujourd|demain|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\b/i.test(subject)
      || /\\bcheck[\\s-]?(in|out)\\b/i.test(subject);`;

  content = content.replace(match2[0], rep2);
} else {
  console.log("match2 failed");
}

fs.writeFileSync("lib/gmail-parser.ts", content);
console.log("Updated parser 2 successfully");
