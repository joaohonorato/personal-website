import { type NextRequest, NextResponse } from "next/server";
import { callTokenRefresh, COOKIE_OPTS, type RefreshResult } from "@/lib/auth";

function applyAuthCookies(res: NextResponse, result: RefreshResult) {
  res.cookies.set("auth_token", result.accessToken, { ...COOKIE_OPTS, httpOnly: true });
  res.cookies.set("user_roles", result.roles.join(","), { ...COOKIE_OPTS, httpOnly: false });
  if (result.refreshToken) {
    res.cookies.set("refresh_token", result.refreshToken, { ...COOKIE_OPTS, httpOnly: true });
  }
}

function clearAuthCookies(res: NextResponse) {
  res.cookies.delete("auth_token");
  res.cookies.delete("refresh_token");
  res.cookies.delete("user_roles");
}

// GET /api/auth/refresh?next=/admin/posts — chamado pelo proxy.ts via redirect
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/admin";
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/admin/login?error=session_expired", request.url));
  }

  const result = await callTokenRefresh(refreshToken);
  if (!result) {
    const res = NextResponse.redirect(new URL("/admin/login?error=session_expired", request.url));
    clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.redirect(new URL(next, request.url));
  applyAuthCookies(res, result);
  return res;
}

// POST /api/auth/refresh — chamado por componentes client-side
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await callTokenRefresh(refreshToken);
  if (!result) {
    const res = NextResponse.json({ ok: false }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({ ok: true });
  applyAuthCookies(res, result);
  return res;
}
