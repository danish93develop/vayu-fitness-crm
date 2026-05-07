import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Edge-safe Auth.js instance for middleware. The `authorized` callback in
// auth.config.ts decides which paths require login.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run middleware on every route except:
  //   /api/auth/*  — Auth.js internal endpoints
  //   _next/*      — Next internals
  //   *.png/.svg/.* — static assets
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
