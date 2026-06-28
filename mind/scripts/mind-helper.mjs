import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const ignoreEntries = new Set(['.git', 'node_modules', 'frontend/node_modules', 'backend/node_modules', '.next', '.vscode', '.github', 'dist', 'coverage']);

function getMindFiles(baseDir = repoRoot) {
    const mindDir = path.join(baseDir, 'mind');
    return {
        mindDir,
        readme: path.join(mindDir, 'README.md'),
        chatSummary: path.join(mindDir, 'chat-summary.md'),
        errors: path.join(mindDir, 'errors.md'),
        learning: path.join(mindDir, 'learning.md'),
        tasks: path.join(mindDir, 'tasks.md'),
        updatesLog: path.join(mindDir, 'updates-log.md'),
    };
}

function formatDate(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatTimestamp(date = new Date()) {
    return date.toISOString();
}

function ensureHeader(content, header) {
    if (content && content.trim().startsWith(header.trim())) {
        return content;
    }
    return `${header}\n\n${content || ''}`.trim() + '\n';
}

async function ensureDirectory(directory) {
    try {
        await fs.mkdir(directory, { recursive: true });
    } catch (error) {
        console.error('Unable to create directory:', directory, error);
        process.exit(1);
    }
}

function lineIndent(level) {
    return '  '.repeat(level);
}

async function buildProjectTree(directory, depth = 0, maxDepth = 2) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const items = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (ignoreEntries.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.gitignore') continue;

        const display = entry.name + (entry.isDirectory() ? '/' : '');
        items.push({ name: display, path: path.join(directory, entry.name), isDirectory: entry.isDirectory() });
    }

    let tree = '';
    for (const item of items) {
        tree += `${lineIndent(depth)}- ${item.name}\n`;
        if (item.isDirectory && depth + 1 < maxDepth) {
            tree += await buildProjectTree(item.path, depth + 1, maxDepth);
        }
    }

    return tree;
}

async function readFileOrDefault(filePath, fallback) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch {
        return fallback;
    }
}

async function writeFileIfChanged(filePath, content) {
    const current = await readFileOrDefault(filePath, null);
    if (current === content) {
        return false;
    }
    await fs.writeFile(filePath, content, 'utf8');
    return true;
}

function getGitStatusSummary(cwd = repoRoot) {
    try {
        const result = execSync('git status --short', { cwd, encoding: 'utf8' }).trim();
        if (!result) {
            return 'Git status is clean. No modified or untracked files detected.';
        }
        const lines = result.split(/\r?\n/).slice(0, 15);
        return ['Git status detected changed files:', ...lines].join('\n');
    } catch {
        return 'Git status unavailable. Ensure git is installed and this repository is initialized.';
    }
}

function parseArgs(argv) {
    const options = {
        summary: '',
        action: '',
        insight: '',
        task: '',
        taskStatus: 'in-progress',
        lesson: '',
        error: '',
        fix: '',
        baseDir: repoRoot,
        help: false,
        dryRun: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const value = argv[i + 1];

        switch (arg) {
            case '--summary':
                options.summary = value || '';
                i += 1;
                break;
            case '--action':
                options.action = value || '';
                i += 1;
                break;
            case '--insight':
                options.insight = value || '';
                i += 1;
                break;
            case '--task':
                options.task = value || '';
                i += 1;
                break;
            case '--task-status':
                options.taskStatus = value || 'in-progress';
                i += 1;
                break;
            case '--lesson':
                options.lesson = value || '';
                i += 1;
                break;
            case '--error':
                options.error = value || '';
                i += 1;
                break;
            case '--fix':
                options.fix = value || '';
                i += 1;
                break;
            case '--base-dir':
                options.baseDir = value ? path.resolve(value) : repoRoot;
                i += 1;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            default:
                console.error(`Unknown argument: ${arg}`);
                process.exit(1);
        }
    }

    return options;
}

function printHelp() {
    console.log(`Usage: node mind/scripts/mind-helper.mjs [options]

Options:
  --summary <text>       Summary of the change or request
  --action <text>        Action taken by the AI/helper
  --insight <text>       Key insight from the change
  --task <text>          Task description to record
  --task-status <text>   Task status: in-progress | todo | done | pending
  --lesson <text>        Lesson learned
  --error <text>         Error or issue discovered
  --fix <text>           Fix applied for the error
  --base-dir <path>      Override repository base directory
  --dry-run              Preview without writing files
  --help, -h             Show this help message

Examples:
  node mind/scripts/mind-helper.mjs --summary "Added Mind update support" --task "Use helper after changes" --task-status done
  npm run mind:update -- --summary "Captured helper improvements"
`);
}

function insertAfter(content, marker, insertion) {
    const index = content.indexOf(marker);
    if (index === -1) {
        return `${content.trim()}\n\n${insertion}`;
    }
    const insertPoint = index + marker.length;
    return `${content.slice(0, insertPoint)}${insertion}${content.slice(insertPoint)}`;
}

function normalizeTaskSection(status) {
    return {
        done: '## ✅ Done',
        'in-progress': '## 🎯 In Progress',
        todo: '## 📋 To-Do',
        pending: '## 🔄 In Review/Pending',
    }[status] || '## 🎯 In Progress';
}

async function ensureMindFilesExist(baseDir = repoRoot) {
    const files = getMindFiles(baseDir);
    await ensureDirectory(files.mindDir);

    const defaults = {
        [files.chatSummary]: `# 💬 AI Chat Summary\n\n## Session Start: ${formatDate()}\n\n### Current State\n- Project phase: Initializing AI memory helper script and verifying mind system.\n- Active tasks: Mind helper creation.\n- Known issues: None recorded.\n\n### Interaction Log\n\n### Key Insights Discovered\n\n### Things Done/Completed\n\n### Things Fixed/Resolved\n\n### Things Noticed\n\n### Pending Follow-ups\n`,
        [files.errors]: `# ❌ Known Errors & Fixes\n\n## Error Registry\n\n## Common Mistake Patterns\n- Document recurring issues in /mind/errors.md.\n- Update task and error logs after changes.\n\n## Prevention Checklist\n- Keep the AI memory helper updated.\n- Use the helper after meaningful code or documentation changes.\n`,
        [files.learning]: `# 📚 Learning Repository\n\n## Behavioral Patterns\n- Maintain concise, factual updates.\n- Keep file path references aligned with project structure.\n- Update memory files after every interaction.\n\n## Lessons Learned\n\n## Code Patterns & Best Practices\n- Use plain JS helpers in containers when possible.\n- Prefer direct node execution over ts-node inside constrained deployment environments.\n\n## Project-Specific Knowledge\n- Backend admin reset scripts exist under /backend/scripts/.\n- Operational cluster wrappers live under /mind/scripts/ops/.\n`,
        [files.tasks]: `# ✅ Task Management Board\n\n## 🎯 In Progress\n\n## 📋 To-Do\n\n## ✅ Done\n\n## 🔄 In Review/Pending\n\n## 📊 Task Statistics\n- Total tasks: 0\n- Completed: 0\n- In progress: 0\n- To-do: 0\n- Completion rate: 0%\n`,
        [files.updatesLog]: `# 📝 Updates Log\n\n`,
    };

    let changed = false;
    for (const [filePath, defaultContent] of Object.entries(defaults)) {
        const existing = await readFileOrDefault(filePath, '');
        if (!existing.trim()) {
            await fs.writeFile(filePath, defaultContent, 'utf8');
            changed = true;
        }
    }

    const chatSummaryText = await readFileOrDefault(files.chatSummary, '');
    if (!chatSummaryText.includes('### Interaction Log')) {
        const updated = ensureHeader(chatSummaryText, '# 💬 AI Chat Summary');
        await fs.writeFile(files.chatSummary, updated, 'utf8');
        changed = true;
    }

    return changed;
}

async function generateREADME(baseDir = repoRoot) {
    const files = getMindFiles(baseDir);
    const projectTree = await buildProjectTree(baseDir, 0, 2);
    const content = `# 🗂️ Project Navigation Map\n\n## File Structure Reference\n${projectTree}\n## Key Directories\n- /mind/ - AI memory and learning system\n- /backend/ - Backend NestJS application and API services\n- /frontend/ - Web frontend application and tests\n- /kubernetes/ - Kubernetes manifests, deployment scripts, and environment setup\n- /mind/scripts/ - Reusable operational helper scripts\n- /docs/ - Architecture, roadmaps, and supporting documentation\n\n## Important Files & Their Purposes\n- /mind/README.md - Navigation map for the AI memory system\n- /mind/chat-summary.md - Running conversation log and summary\n- /mind/errors.md - Known errors and their fixes\n- /mind/learning.md - Lessons learned and behavioral patterns\n- /mind/tasks.md - Task management board\n- /mind/updates-log.md - Chronological log of updates made by the AI\n- /backend/scripts/reset-admin-password.ts - Backend admin password reset helper\n- /frontend/scripts/run-ui-functionalities.mjs - UI test runner for manual and Playwright execution\n- /mind/scripts/mind-helper.mjs - Project helper for maintaining the AI memory system\n\n## Quick Access References\n- AI Context: /mind/chat-summary.md\n- Errors: /mind/errors.md\n- Tasks: /mind/tasks.md\n- Learning: /mind/learning.md\n- Run Mind helper: npm run mind:update\n`;

    return await writeFileIfChanged(files.readme, content);
}

function buildUpdateEntry(options) {
    const summary = options.summary || 'Recorded a Mind workflow update.';
    const action = options.action || 'Recorded the change in Mind files.';
    const insight = options.insight ? `- ${options.insight}\n` : '';
    const taskText = options.task ? `- Task: ${options.task} (${options.taskStatus})\n` : '';
    const errorText = options.error ? `- Error: ${options.error}\n- Fix: ${options.fix || 'N/A'}\n` : '';

    return {
        chat: `#### ${formatTimestamp()} - User Request:\n${summary}\n\n#### ${formatTimestamp()} - AI Response & Actions:\n${action}\n${taskText}${errorText}\n`,
        insight,
        errorBlock: options.error
            ? `### ERROR-${String(Date.now()).slice(-4)} - ${formatDate()}\n- **Error:** ${options.error}\n- **Cause:** ${options.summary || 'Recorded during a Mind helper update.'}\n- **Fix Applied:** ${options.fix || 'Documented in the Mind helper.'}\n- **Prevention:** Use the Mind helper after meaningful updates.\n- **Related Files:** /mind/ and /mind/scripts/mind-helper.mjs\n- **Status:** ${options.fix ? 'Fixed' : 'In-Progress'}\n\n`
            : '',
        lessonBlock: options.lesson
            ? `### ${formatDate()} - Lesson:\n- **What happened:** ${options.summary || 'A Mind workflow update occurred.'}\n- **What was learned:** ${options.lesson}\n- **Applied to:** ${options.action || 'Mind helper improvements.'}\n\n`
            : '',
        taskEntry: options.task
            ? `- ${options.task} - ${options.taskStatus === 'done' ? `Completed: ${formatDate()}` : `Started: ${formatDate()}`} - Priority: Medium\n  - Notes: ${options.action || 'Recorded by Mind helper.'}\n  - Status: ${options.taskStatus}\n`
            : '',
        updateEntry: `## ${formatDate()}\n- ${summary}\n\n`,
    };
}

function addTaskToSection(content, sectionHeading, entry) {
    if (!content.includes(sectionHeading)) {
        return `${content.trim()}\n\n${sectionHeading}\n${entry}`;
    }
    return content.replace(sectionHeading, `${sectionHeading}\n${entry}`);
}

function computeTaskStats(tasksContent) {
    const count = (regex) => (tasksContent.match(regex) || []).length;
    const total = count(/^\s*- .*$/gm);
    const done = count(/^\s*- .*Completed:/gm);
    const inProgress = count(/^\s*- .*Started:/gm);
    const todo = count(/^\s*- .*Priority: Medium$/gm);
    const completionRate = total ? Math.round((done / total) * 100) : 0;
    return `## 📊 Task Statistics\n- Total tasks: ${total}\n- Completed: ${done}\n- In progress: ${inProgress}\n- To-do: ${todo}\n- Completion rate: ${completionRate}%\n`;
}

async function updateMindRecords(options) {
    const files = getMindFiles(options.baseDir || repoRoot);
    const chat = await readFileOrDefault(files.chatSummary, '');
    const errors = await readFileOrDefault(files.errors, '');
    const learning = await readFileOrDefault(files.learning, '');
    const tasks = await readFileOrDefault(files.tasks, '');
    const updates = await readFileOrDefault(files.updatesLog, '');
    const entry = buildUpdateEntry(options);

    const updatedChat = insertAfter(chat, '### Interaction Log\n', `${entry.chat}`);
    const updatedChatWithInsight = options.insight
        ? insertAfter(updatedChat, '### Key Insights Discovered\n', `${entry.insight}`)
        : updatedChat;

    let updatedErrors = errors;
    if (options.error && !errors.includes(options.error)) {
        updatedErrors = insertAfter(errors, '## Common Mistake Patterns\n', `${entry.errorBlock}`);
    }

    let updatedLearning = learning;
    if (options.lesson && !learning.includes(options.lesson)) {
        updatedLearning = insertAfter(learning, '## Lessons Learned\n', `${entry.lessonBlock}`);
    }

    let updatedTasks = tasks;
    if (options.task) {
        const section = normalizeTaskSection(options.taskStatus);
        updatedTasks = addTaskToSection(updatedTasks, section, entry.taskEntry);
        const stats = computeTaskStats(updatedTasks);
        updatedTasks = updatedTasks.replace(/## 📊 Task Statistics[\s\S]*/m, stats);
    }

    const updatedUpdates = `# 📝 Updates Log\n\n${entry.updateEntry}${updates.replace('# 📝 Updates Log\n\n', '')}`;

    await fs.writeFile(files.chatSummary, updatedChatWithInsight, 'utf8');
    await fs.writeFile(files.errors, updatedErrors, 'utf8');
    await fs.writeFile(files.learning, updatedLearning, 'utf8');
    await fs.writeFile(files.tasks, updatedTasks, 'utf8');
    await fs.writeFile(files.updatesLog, updatedUpdates, 'utf8');
}

async function appendUpdatesLog(note, baseDir = repoRoot) {
    const files = getMindFiles(baseDir);
    const existing = await readFileOrDefault(files.updatesLog, '');
    const timestamp = `${formatDate()} ${new Date().toTimeString().slice(0, 8)} UTC`;
    const newEntry = `## ${timestamp}\n- ${note}\n\n`;
    await fs.writeFile(files.updatesLog, existing + newEntry, 'utf8');
}

async function appendChatSummary(note, baseDir = repoRoot) {
    const files = getMindFiles(baseDir);
    const existing = await readFileOrDefault(files.chatSummary, '');
    const timestamp = `${formatDate()} ${new Date().toTimeString().slice(0, 8)} UTC`;
    const entry = `#### ${timestamp} - AI Action:\n${note}\n\n`;
    await fs.writeFile(files.chatSummary, existing + entry, 'utf8');
}

async function updateMindFiles(options = {}) {
    const baseDir = path.resolve(options.baseDir || repoRoot);
    await ensureMindFilesExist(baseDir);
    const readmeUpdated = await generateREADME(baseDir);
    if (options.summary || options.action || options.insight || options.task || options.lesson || options.error || options.fix) {
        await updateMindRecords({ ...options, baseDir });
    }
    const gitSummary = getGitStatusSummary(baseDir);
    return { baseDir, readmeUpdated, gitSummary };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }

    const baseDir = path.resolve(options.baseDir || repoRoot);
    await ensureDirectory(path.join(baseDir, 'mind'));
    await ensureMindFilesExist(baseDir);

    const readmeUpdated = await generateREADME(baseDir);
    const gitSummary = getGitStatusSummary(baseDir);

    if (options.dryRun) {
        console.log('Dry run mode enabled. No files will be written.');
        console.log('Payload:', options);
    }

    if (options.summary || options.action || options.insight || options.task || options.lesson || options.error || options.fix) {
        if (!options.dryRun) {
            await updateMindRecords({ ...options, baseDir });
        }
    }

    const note = `Mind helper executed. Regenerated /mind/README.md${readmeUpdated ? '' : ' (no content changes)'} and validated /mind files.\n${gitSummary}`;
    if (!options.dryRun) {
        await appendUpdatesLog(note.replace(/\n/g, '\n- '), baseDir);
        await appendChatSummary(`Mind helper script executed. Reviewed /mind structure and git status summary.`, baseDir);
    }

    console.log('Mind helper completed successfully.');
    console.log(gitSummary);
}

export { updateMindFiles, ensureMindFilesExist };

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('Failed to run mind helper:', error);
        process.exit(1);
    });
}
