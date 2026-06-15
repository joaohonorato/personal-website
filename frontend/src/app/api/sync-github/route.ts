import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/api/github/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    });

    if (!res.ok) throw new Error(`Spring Boot API error: ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[POST /api/sync-github]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}