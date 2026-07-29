const fs = require('fs');
const path = require('path');

const standaloneNodeModules = path.join(__dirname, '..', 'frontend', '.next', 'standalone', 'frontend', 'node_modules');
const rootNodeModules = path.join(__dirname, '..', 'node_modules');

if (!fs.existsSync(standaloneNodeModules)) {
  console.log('No standalone node_modules to fix');
  process.exit(0);
}

const entries = fs.readdirSync(standaloneNodeModules);
for (const entry of entries) {
  const fullPath = path.join(standaloneNodeModules, entry);
  const stat = fs.lstatSync(fullPath);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(fullPath);
    console.log('Replacing symlink ' + entry + ' -> ' + target);
    fs.rmSync(fullPath);
    const source = path.join(rootNodeModules, entry);
    if (fs.existsSync(source)) {
      fs.cpSync(source, fullPath, { recursive: true });
      console.log('  Copied from ' + source);
    } else {
      console.log('  Warning: ' + source + ' not found');
    }
  }
}

console.log('Done fixing standalone node_modules');
