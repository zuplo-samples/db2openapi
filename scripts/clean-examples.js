const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(process.cwd()).filter(f => /^openapi.*\.json$/.test(f));
for (const f of files) {
  try { fs.unlinkSync(path.join(process.cwd(), f)); console.log('removed', f); } catch (e) { }
}
console.log('clean-examples done');
