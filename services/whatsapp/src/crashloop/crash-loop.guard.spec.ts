import { CrashLoopGuard } from './crash-loop.guard';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * CrashLoopGuard tests (Prompt 0.18).
 * Uses an isolated temp marker file so boots accumulate within the window.
 */
function makeGuard(overrides: { windowMs?: number; threshold?: number } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'crashloop-'));
  const marker = join(dir, 'boot.marker');
  const prev = { ...process.env };
  process.env.CRASHLOOP_MARKER_PATH = marker;
  process.env.CRASHLOOP_WINDOW_MS = String(overrides.windowMs ?? 10 * 60_000);
  process.env.CRASHLOOP_THRESHOLD = String(overrides.threshold ?? 5);
  const guard = new CrashLoopGuard();
  return {
    guard,
    dir,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
      process.env = prev;
    },
  };
}

describe('CrashLoopGuard (Prompt 0.18)', () => {
  it('counts boots within the sliding window', () => {
    const { guard, cleanup } = makeGuard();
    try {
      guard.onModuleInit();
      expect(guard.recentBoots).toBe(1);
      guard.onModuleInit();
      guard.onModuleInit();
      expect(guard.recentBoots).toBe(3);
      expect(guard.isCrashLooping).toBe(false);
    } finally {
      cleanup();
    }
  });

  it('flags a crash loop once boots cross the threshold', () => {
    const { guard, cleanup } = makeGuard({ threshold: 3 });
    try {
      for (let i = 0; i < 5; i++) guard.onModuleInit();
      expect(guard.recentBoots).toBe(5);
      expect(guard.isCrashLooping).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('resets the counter when boots fall outside the window', () => {
    const { guard, cleanup } = makeGuard({ windowMs: 0 }); // every boot starts a new window
    try {
      guard.onModuleInit();
      expect(guard.recentBoots).toBe(1);
      // windowMs=0 → next boot is outside window → resets to 1
      guard.onModuleInit();
      expect(guard.recentBoots).toBe(1);
    } finally {
      cleanup();
    }
  });
});
