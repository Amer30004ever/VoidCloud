import { NextRequest, NextResponse } from "next/server";

/**
 * Maintenance mode API.
 * Stores state in a simple in-memory singleton (resets on server restart).
 * In production, back this with Redis via the notification service.
 *
 * GET  /api/maintenance — { active: bool, message: string, startedAt?: string }
 * POST /api/maintenance — { active: bool, message?: string } → toggle
 */

interface MaintenanceState {
  active: boolean;
  message: string;
  startedAt: string | null;
  endEta: string | null;
  affectedServices: string[];
}

// Module-level singleton (survives hot-reload via globalThis)
const g = globalThis as typeof globalThis & { __maintenance?: MaintenanceState };
if (!g.__maintenance) {
  g.__maintenance = { active: false, message: "", startedAt: null, endEta: null, affectedServices: [] };
}

export async function GET() {
  return NextResponse.json(g.__maintenance);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Partial<MaintenanceState>;
  const current = g.__maintenance!;

  const next: MaintenanceState = {
    active: body.active ?? !current.active,
    message: body.message ?? current.message ?? "We're performing scheduled maintenance. Back shortly.",
    startedAt: body.active !== false ? (current.startedAt ?? new Date().toISOString()) : null,
    endEta: body.endEta ?? current.endEta,
    affectedServices: body.affectedServices ?? current.affectedServices,
  };

  if (!next.active) {
    next.startedAt = null;
    next.endEta = null;
  }

  g.__maintenance = next;
  return NextResponse.json({ ok: true, state: next });
}
