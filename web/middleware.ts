import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminAPI = pathname.startsWith("/api/admin");
  const isLogin = pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login");

  if ((isAdminPath || isAdminAPI) && !isLogin) {
    const token = request.cookies.get("mafren_admin")?.value;
    if (token !== "1") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};


