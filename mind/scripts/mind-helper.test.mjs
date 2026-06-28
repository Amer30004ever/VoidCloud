import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { updateMindFiles } from './mind-helper.mjs';

test('updateMindFiles creates the mind files and records a new interaction', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'mind-helper-'));

    try {
        const result = await updateMindFiles({
            baseDir: tempDir,
            summary: 'Added a reusable Mind helper export',
            action: 'Refactored mind-helper to export updateMindFiles',
            insight: 'Reusable API makes testing easier',
            task: 'Add unit test for mind-helper',
            taskStatus: 'done',
            lesson: 'Test exported helpers directly',
            error: 'Mind updates were previously not reusable',
            fix: 'Exported updateMindFiles and added a unit test',
        });

        assert.ok(result.baseDir === tempDir, 'updateMindFiles should return the base directory');
        assert.ok(result.gitSummary.includes('Git status'), 'Result should include git status summary');

        const readme = await readFile(path.join(tempDir, 'mind', 'README.md'), 'utf8');
        const chatSummary = await readFile(path.join(tempDir, 'mind', 'chat-summary.md'), 'utf8');
        const updatesLog = await readFile(path.join(tempDir, 'mind', 'updates-log.md'), 'utf8');
        const tasks = await readFile(path.join(tempDir, 'mind', 'tasks.md'), 'utf8');

        assert.match(readme, /Mind helper script for maintaining the AI memory system/);
        assert.match(chatSummary, /Added a reusable Mind helper export/);
        assert.match(updatesLog, /Added a reusable Mind helper export/);
        assert.match(tasks, /Add unit test for mind-helper/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});