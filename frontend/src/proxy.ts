import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({ request });
  }

  if (pathname === "/admin/login") {
    return NextResponse.next({ request });
  }

  const session = request.cookies.get("admin_session");
  if (!session?.value || session.value !== process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*"],
};