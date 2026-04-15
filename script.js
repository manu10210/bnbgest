
const fs = require('fs');
let code = fs.readFileSync('components/GmailImporter.tsx', 'utf8');
code = code.replace(
  'toImport\r\n              .filter(b => !b.propertyName?.trim())',
  'toImport\r\n              .filter(b => !b.propertyName?.trim() && b.bookingType !== \'payout\' && b.bookingType !== \'review\')'
);
code = code.replace(
  'toImport\n              .filter(b => !b.propertyName?.trim())',
  'toImport\n              .filter(b => !b.propertyName?.trim() && b.bookingType !== \'payout\' && b.bookingType !== \'review\')'
);
fs.writeFileSync('components/GmailImporter.tsx', code);

