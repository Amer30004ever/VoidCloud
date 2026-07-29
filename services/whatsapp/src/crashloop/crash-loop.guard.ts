import { Injectable, Logger, OnModuleInit, BeforeApplicationShutdown } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export interface CrashLoopState {
  boots: number;
  firstBootAt: number;
  lastBootAt: number;
  windowStart: number;
}

/**
 * Crash-loop guard (Prompt 0.18).
 *
 * The whatsapp-service previously crash-looped (290 restarts over ~10 days).
 * Root cause then was an unhandled openwa/Puppeteer webhook exception combined
 * with a liveness probe that killed slow cold-starts — both of which silently
 * accumulated restarts. This guard makes recurrence *visible* and *loud*:
 *
 *  - On every boot it records a monotonic boot marker and counts restarts that
 *    fall inside a sliding window (default 10 min).
 *  - If the count crosses `threshold` (default 5), it logs a high-severity
 *    alert (structured JSON on stderr) that the platform's log/alert pipeline
 *    can page on — instead of silently burning restarts.
 *
 * The marker is a heartbeat file under the pod's tmp dir; it survives a
 * container restart (same pod) but not a pod reschedule, which matches the
 * "catch a reappearance" intent without needing an external store.
 */
@Injectable()
export class CrashLoopGuard implements OnModuleInit, BeforeApplicationShutdown {
  private readonly logger = new Logger('CrashLoopGuard');
  private readonly markerPath = process.env.CRASHLOOP_MARKER_PATH
    ?? join(process.env.TMPDIR ?? '/tmp', 'whatsapp-boot.marker');
  private readonly windowMs = Number(process.env.CRASHLOOP_WINDOW_MS ?? 10 * 60_000);
  private readonly threshold = Number(process.env.CRASHLOOP_THRESHOLD ?? 5);

  private state: CrashLoopState = {
    boots: 0,
    firstBootAt: 0,
    lastBootAt: 0,
    windowStart: 0,
  };

  onModuleInit() {
    this.recordBoot();
  }

  beforeApplicationShutdown() {
    // A clean shutdown is not a crash; reset the boot counter so a planned
    // restart doesn't count toward a future crash-loop detection.
    try {
      if (existsSync(this.markerPath)) unlinkSync(this.markerPath);
    } catch {
      /* best effort */
    }
  }

  /** Number of boots observed within the current sliding window. */
  get recentBoots(): number {
    return this.state.boots;
  }

  get isCrashLooping(): boolean {
    return this.state.boots >= this.threshold;
  }

  private recordBoot() {
    const now = Date.now();
    let prev: Partial<CrashLoopState> = {};
    try {
      if (existsSync(this.markerPath)) {
        prev = JSON.parse(readFileSync(this.markerPath, 'utf8'));
      }
    } catch {
      prev = {};
    }

    const windowStart = prev.windowStart ?? 0;
    const inWindow = now - windowStart < this.windowMs;

    if (inWindow && windowStart > 0) {
      this.state = {
        boots: (prev.boots ?? 0) + 1,
        firstBootAt: prev.firstBootAt ?? now,
        lastBootAt: now,
        windowStart,
      };
    } else {
      // New window: start fresh but keep firstBootAt for context.
      this.state = {
        boots: 1,
        firstBootAt: now,
        lastBootAt: now,
        windowStart: now,
      };
    }

    try {
      writeFileSync(this.markerPath, JSON.stringify(this.state));
    } catch {
      /* marker is best-effort */
    }

    if (this.isCrashLooping) {
      this.emitAlert();
    } else if (this.state.boots > 1) {
      this.logger.warn(
        `Restart detected (#${this.state.boots} within ${this.windowMs / 1000}s window). ` +
          `Investigate before a crash-loop forms.`,
      );
    }
  }

  private emitAlert() {
    const alert = {
      severity: 'critical',
      service: 'whatsapp-service',
      type: 'CRASH_LOOP',
      bootsInWindow: this.state.boots,
      threshold: this.threshold,
      windowMs: this.windowMs,
      firstBootAt: new Date(this.state.firstBootAt).toISOString(),
      message:
        `whatsapp-service is restarting repeatedly (${this.state.boots} boots in ` +
        `${this.windowMs / 1000}s). Possible unhandled exception or probe mismatch. ` +
        `Check logs and the liveness/startup probe timing.`,
    };
    // JSON on stderr so the platform alert pipeline can page on it.
    process.stderr.write(`\n[CRASH_LOOP_ALERT] ${JSON.stringify(alert)}\n`);
    this.logger.error(
      `CRASH LOOP detected: ${this.state.boots} restarts in ${this.windowMs / 1000}s window ` +
        `(threshold ${this.threshold}).`,
    );
  }
}
