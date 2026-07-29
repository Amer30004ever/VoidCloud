const fs = require("fs");
const path = require("path");

const servicesDir = path.join(__dirname, "services");
const serviceDirs = fs.readdirSync(servicesDir).filter((dir) => {
  const pkgPath = path.join(servicesDir, dir, "package.json");
  return fs.existsSync(pkgPath);
});

const merged = { name: "voidcloud-all", private: true, dependencies: {} };

for (const svc of serviceDirs) {
  const pkgPath = path.join(servicesDir, svc, "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    Object.assign(merged.dependencies, pkg.dependencies || {});
    Object.assign(merged.dependencies, pkg.devDependencies || {});
  } catch (e) {
    console.error(`Skipping ${pkgPath}:`, e.message);
  }
}

const outPath = path.join(servicesDir, "combined-package.json");
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
console.log(`Written ${outPath} with ${Object.keys(merged.dependencies).length} dependencies`);
