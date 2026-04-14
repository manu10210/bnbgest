const fs = require("fs");
let c1 = fs.readFileSync("lib/gmail-parser.ts", "utf8");
c1 = c1.replace(/\[a-zà-ÿœæ\]\+\\s\+\(a\\s\+r\[eé\]serv\|annul\|modifi\|laiss\)/, "[a-zà-ÿœæ]+\\s+(a\\s+r[eé]serv|annul|modifi|laiss|r[eé]dig)");
c1 = c1.replace(/part\\s\|arrive\)/, "part\\s|arrive|r[eé]dig)");
fs.writeFileSync("lib/gmail-parser.ts", c1);

let c2 = fs.readFileSync("components/GmailImporter.tsx", "utf8");
c2 = c2.replace(/part\\s\|arrive\)/, "part\\s|arrive|r[eé]dig)");
fs.writeFileSync("components/GmailImporter.tsx", c2);
console.log("done script");
