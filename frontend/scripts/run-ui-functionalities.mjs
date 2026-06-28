import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

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

async function main() {
    if (mode === 'manual') {
        console.log('Manual UI checklist:');
        console.log('1. Open http://127.0.0.1:3000/ and verify the landing hero, pricing section, and navigation links.');
        console.log('2. Visit /about, /blog, /careers, /docs, /dashboard, /login, /portal, /amercloud, /amercloud/login, /amercloud/register, /amercloud/forgot-password, and /amercloud/reset-password.');
        console.log('3. Test email/password entry, password reveal, and an invalid login on /amercloud/login.');
        console.log('4. Confirm each page renders its expected heading and form controls without a crash.');
        return;
    }

    await run('npx', ['playwright', 'test', 'tests/e2e/ui-functionalities.spec.ts', '--project=chromium']);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
