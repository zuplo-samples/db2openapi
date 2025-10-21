const fs = require('fs');
const path = require('path');

const lcovIn = path.join(process.cwd(), 'coverage', 'lcov.info');
const lcovOut = path.join(process.cwd(), 'coverage', 'lcov.abs.info');

if (!fs.existsSync(lcovIn)) {
  console.error(`LCOV input not found: ${lcovIn}`);
  process.exit(1);
}

const content = fs.readFileSync(lcovIn, 'utf8');
const lines = content.split(/\r?\n/);
const out = lines.map(line => {
  if (line.startsWith('SF:')) {
    const rel = line.slice(3);
    // If it's already absolute, leave it
    if (path.isAbsolute(rel)) return line;
    // Normalize and prefix with workspace root
    const abs = path.join(process.cwd(), rel).replace(/\\/g, '/');
    return `SF:${abs}`;
  }
  return line;
}).join('\n');

fs.writeFileSync(lcovOut, out, 'utf8');
console.log(`Wrote ${lcovOut}`);
