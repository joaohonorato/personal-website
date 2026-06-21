import { type NextRequest, NextResponse } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(b64));
    return typeof exp === "number" && exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next({ request });
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isTokenExpired(token)) {
    const loginUrl = new URL("/admin/login?error=session_expired", request.url);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("auth_token");
    res.cookies.delete("user_roles");
    return res;
  }

  const userRoles = (request.cookies.get("user_roles")?.value ?? "").split(",").filter(Boolean);

  if (userRoles.includes("READER") && userRoles.length === 1) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const adminOnlyPaths = ["/admin/users", "/admin/projects", "/admin/sync"];
  if (adminOnlyPaths.some((p) => pathname.startsWith(p)) && !userRoles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*"],
};
