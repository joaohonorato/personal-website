import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request });
  }

  if (pathname === "/admin/login") {
    return NextResponse.next({ request });
  }

  const token = request.cookies.get("auth_token");
  if (!token?.value) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const role = request.cookies.get("user_role")?.value;

  if (role === "READER") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const adminOnlyPaths = ["/admin/users", "/admin/projects"];
  if (adminOnlyPaths.some((p) => pathname.startsWith(p)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*"],
};