import { NextRequest, NextResponse } from "next/server";

const PROXMOX_HOST = process.env.PROXMOX_HOST ?? "10.51.100.10";
const PROXMOX_TOKEN_ID = process.env.PROXMOX_TOKEN_ID ?? "root@pam!Amer-Cloud";
const PROXMOX_TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET ?? "";

const BASE = `https://${PROXMOX_HOST}:8006/api2/json`;

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${BASE}/${path.join("/")}${req.nextUrl.search ?? ""}`;

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const res = await fetch(upstream, {
      method: req.method,
      headers: {
        Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Proxmox API unreachable", detail: message, upstream },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
