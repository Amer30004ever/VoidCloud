import { NextRequest, NextResponse } from "next/server";

/**
 * Multi-cluster Proxmox proxy.
 *
 * Reads cluster credentials from request headers (set by the Super Admin UI):
 *   X-Proxmox-Host        — e.g. "10.51.100.10"
 *   X-Proxmox-Token-Id    — e.g. "root@pam!Amer-Cloud"
 *   X-Proxmox-Token-Secret — the API token secret
 *   X-Proxmox-Path        — the Proxmox API path after /api2/json (e.g. "nodes/proxmox/status")
 *   X-Proxmox-Method      — optional override (GET/POST/PUT/DELETE), defaults to GET
 *
 * Falls back to env vars (primary cluster) if headers are absent.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const host   = req.headers.get("X-Proxmox-Host")         ?? process.env.PROXMOX_HOST          ?? "10.51.100.10";
  const tokId  = req.headers.get("X-Proxmox-Token-Id")     ?? process.env.PROXMOX_TOKEN_ID       ?? "root@pam!Amer-Cloud";
  const tokSec = req.headers.get("X-Proxmox-Token-Secret") ?? process.env.PROXMOX_TOKEN_SECRET   ?? "";
  const path   = req.headers.get("X-Proxmox-Path")         ?? "version";
  const method = req.headers.get("X-Proxmox-Method")       ?? "GET";

  const upstream = `https://${host}:8006/api2/json/${path}`;

  try {
    const res = await fetch(upstream, {
      method,
      headers: {
        Authorization: `PVEAPIToken=${tokId}=${tokSec}`,
        "Content-Type": "application/json",
      },
      body: method !== "GET" && method !== "HEAD" ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, status: res.status, data: json });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return NextResponse.json(
      { ok: false, error: isTimeout ? "Connection timed out (10s)" : `Cannot reach ${host}:8006 — ${msg}` },
      { status: 503 }
    );
  }
}

// Test connectivity to a Proxmox cluster
export async function GET(req: NextRequest) {
  const host   = req.nextUrl.searchParams.get("host")   ?? process.env.PROXMOX_HOST        ?? "10.51.100.10";
  const tokId  = req.nextUrl.searchParams.get("tokenId") ?? process.env.PROXMOX_TOKEN_ID    ?? "";
  const tokSec = req.nextUrl.searchParams.get("secret")  ?? process.env.PROXMOX_TOKEN_SECRET ?? "";

  const upstream = `https://${host}:8006/api2/json/version`;
  try {
    const res = await fetch(upstream, {
      method: "GET",
      headers: { Authorization: `PVEAPIToken=${tokId}=${tokSec}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, version: json?.data?.version, release: json?.data?.release });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
