import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config"; // This should be your lean, Edge-compatible config

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Logic to handle redirects for auth pages
  const isAuthRoute = nextUrl.pathname.startsWith("/auth");
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/setup", nextUrl));
    }
    return;
  }

  // Protect all other matched routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/sign-in", nextUrl));
  }
  
  // --- This is the crucial part for our workaround ---
  // If the user is logged in, add the custom header
  const businessUnitId = nextUrl.pathname.split('/')[1];
  const requestHeaders = new Headers(req.headers);
  if (businessUnitId) {
    requestHeaders.set('x-business-unit-id', businessUnitId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}