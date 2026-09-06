import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value ||
      request.cookies.get(REFRESH_COOKIE)?.value ||
      request.cookies.get("session")?.value,
  );

  if ((pathname.startsWith("/admin") || pathname.startsWith("/barber") || pathname.startsWith("/account")) && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/barber", "/barber/:path*", "/account", "/account/:path*"],
};
