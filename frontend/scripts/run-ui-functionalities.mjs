import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const appDir = path.join(frontendRoot, 'src', 'app');

const args = process.argv.slice(2);
const mode = args[0] ?? 'auto';

function run(command, extraArgs = []) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, extraArgs, {
            cwd: frontendRoot,
            stdio: 'inherit',
            shell: true,
        });

        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} ${extraArgs.join(' ')} exited with code ${code}`));
        });
    });
}

function normalizeSegment(segment) {
    if (segment.startsWith('[') && segment.endsWith(']')) {
        return `:${segment.slice(1, -1)}`;
    }
    return segment;
}

function collectRoutes(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const routes = [];
    const hasPage = entries.some((entry) => entry.isFile() && /page\.(ts|tsx)$/.test(entry.name));

    if (hasPage) {
        routes.push(prefix || '/');
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'api' || entry.name.startsWith('_')) continue;

        const childPrefix = prefix === ''
            ? `/${normalizeSegment(entry.name)}`
            : `${prefix}/${normalizeSegment(entry.name)}`;
        routes.push(...collectRoutes(path.join(dir, entry.name), childPrefix));
    }

    return routes;
}

function getAllRoutes() {
    if (!fs.existsSync(appDir)) {
        return [];
    }

    const routes = collectRoutes(appDir);
    return Array.from(new Set(routes.map((route) => route.replace(/\/+/g, '/')))).sort();
}

function printManualChecklist(routes) {
    console.log('\nManual UI Functionality Checklist');
    console.log('====================================');
    console.log('Run this after starting the frontend dev server with `npm run dev`.');
    console.log('\nRoutes to verify:');
    routes.forEach((route) => console.log(`  - ${route}`));
    console.log('\nManual test flow:');
    console.log('  1. Open each route in the browser and confirm the page renders correctly.');
    console.log('  2. Check navigation and visible headings for each page.');
    console.log('  3. For auth flows, verify that login/register/forgot-password/reset-password pages render and that the login form handles invalid credentials.');
    console.log('  4. Use the Playwright test with `npm run test:ui:functionalities` to automate the core auth and page render checks.');
    console.log('  5. Use `npm run test:ui:functionalities -- manual` to view this checklist only.');
    console.log('  6. Use `npm run test:ui:functionalities -- all` to run Playwright over all configured tests.');
}

async function main() {
    const routes = getAllRoutes();

    if (mode === 'manual') {
        printManualChecklist(routes);
        return;
    }

    if (mode === 'all') {
        await run('npx', ['playwright', 'test', '--project=chromium']);
        return;
    }

    await run('npx', ['playwright', 'test', 'tests/e2e/ui-functionalities.spec.ts', '--project=chromium']);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
