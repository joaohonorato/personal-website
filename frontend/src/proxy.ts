import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next({ request });
  }

  const token = request.cookies.get("auth_token");
  if (!token?.value) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
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
