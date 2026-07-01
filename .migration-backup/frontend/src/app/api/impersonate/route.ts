import { NextRequest, NextResponse } from "next/server";

const AUTH_BASE = process.env.AUTH_SERVICE_URL
  ?? "http://auth-service.voidcloud.svc.cluster.local:3001";

/**
 * POST /api/impersonate
 * Body: { targetUserId: string }
 * Returns: { token: string, user: object }
 * Requires: caller must already be SUPER_ADMIN (validated by auth service).
 */
export async function POST(req: NextRequest) {
  const callerToken = req.headers.get("Authorization") ?? "";
  const body = await req.json().catch(() => ({})) as { targetUserId?: string };

  if (!body.targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${AUTH_BASE}/auth/impersonate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: callerToken,
      },
      body: JSON.stringify({ targetUserId: body.targetUserId }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    // Mock for dev when auth service unreachable
    return NextResponse.json({
      token: `impersonate_mock_${body.targetUserId}_${Date.now()}`,
      user: { id: body.targetUserId, email: "user@example.com", role: "USER" },
      expiresIn: 3600,
      mock: true,
      error: msg,
    });
  }
}
