
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/otp", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect logged-in users away from splash/onboarding
  if (token && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
