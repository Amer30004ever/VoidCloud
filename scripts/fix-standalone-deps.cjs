const fs = require('fs');
const path = require('path');

const standaloneNodeModules = path.join(__dirname, '..', 'frontend', '.next', 'standalone', 'frontend', 'node_modules');
const rootNodeModules = path.join(__dirname, '..', 'node_modules');

if (!fs.existsSync(standaloneNodeModules)) {
  console.log('No standalone node_modules to fix');
  process.exit(0);
}

function copyPackage(src, dest, copied = new Set()) {
  if (copied.has(src)) return;
  copied.add(src);
  
  try {
    const stat = fs.lstatSync(src);
    if (stat.isSymbolicLink()) {
      const target = fs.realpathSync(src);
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(target, dest, { recursive: true });
      console.log('Copied (resolved) ' + path.basename(src));
    } else {
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true });
      console.log('Copied ' + path.basename(src));
    }
    
    // Copy dependencies recursively
    const pkgJson = path.join(src, 'package.json');
    if (fs.existsSync(pkgJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
        for (const [name, version] of Object.entries(deps)) {
          const depSrc = path.join(rootNodeModules, name);
          const depDest = path.join(dest, 'node_modules', name);
          if (fs.existsSync(depSrc)) {
            copyPackage(depSrc, depDest, copied);
          }
        }
      } catch (e) {
        console.log('  Warning reading deps: ' + e.message);
      }
    }
  } catch (e) {
    console.log('WARNING: Could not copy ' + path.basename(src) + ': ' + e.message);
  }
}

// Read standalone package.json
const standalonePkg = path.join(__dirname, '..', 'frontend', '.next', 'standalone', 'frontend', 'package.json');
let neededPackages = ['next'];

if (fs.existsSync(standalonePkg)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(standalonePkg, 'utf8'));
    neededPackages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  } catch (e) {
    console.log('Could not read package.json: ' + e.message);
  }
}

for (const pkg of neededPackages) {
  const source = path.join(rootNodeModules, pkg);
  const dest = path.join(standaloneNodeModules, pkg);
  if (fs.existsSync(source)) {
    copyPackage(source, dest);
  } else {
    console.log('WARNING: ' + pkg + ' not found in root node_modules');
  }
}

console.log('Done copying dependencies');
