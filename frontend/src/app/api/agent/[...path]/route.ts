import { NextRequest, NextResponse } from "next/server";

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8001";

function agentHeaders(req: NextRequest, extra: Record<string, string> = {}): Record<string, string> {
  const token = req.cookies.get("auth_token")?.value ?? "";
  const h: Record<string, string> = { ...extra };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

type Params = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { path } = await params;
  const upstream = `${AGENT_URL}/${path.join("/")}`;

  const res = await fetch(upstream, {
    headers: agentHeaders(req, { Accept: "text/event-stream", "Cache-Control": "no-cache" }),
  });

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { path } = await params;
  const upstream = `${AGENT_URL}/${path.join("/")}`;
  const body = await req.text();

  const res = await fetch(upstream, {
    method: "POST",
    headers: agentHeaders(req, { "Content-Type": "application/json" }),
    body,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
