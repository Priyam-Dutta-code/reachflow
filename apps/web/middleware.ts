/**
 * Soft-gates app routes on refresh-cookie presence (the real check is /me —
 * this only prevents an obviously-logged-out render flash). Auth pages
 * bounce logged-in users to the dashboard.
 */
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/leads", "/campaigns", "/analytics", "/settings", "/onboarding"];
const AUTH_ROUTES = ["/login", "/signup"];
const REFRESH_COOKIE = "rf_refresh";

function matches(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  if (matches(pathname, PROTECTED_ROUTES) && !hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (matches(pathname, AUTH_ROUTES) && hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.searchParams.delete("next");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/proxy|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
