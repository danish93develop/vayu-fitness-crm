import type { NextAuthConfig } from "next-auth";
import type { UserRoleType } from "@prisma/client";

/**
 * Edge-safe Auth.js config — used by middleware.ts.
 * Cannot import Prisma here (Node-only). Full config lives in src/auth.ts.
 *
 * The `authorized` callback decides which paths require login. Returning:
 *   - true   → request continues
 *   - false  → Auth.js redirects to the signIn page (defined under `pages`)
 *   - Response → use it as the response (for custom redirects)
 */
// Reachable without being signed in. /reset-password is a prefix because it
// has dynamic /[token] segments; /forgot-password is exact.
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

// Paths where signed-in users should still be allowed through (e.g. so they
// can reset their own password without being bounced to /dashboard).
const ALWAYS_PUBLIC = ["/forgot-password", "/reset-password"];

export default {
  pages: { signIn: "/login" },
  providers: [], // populated in src/auth.ts (Node-only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
      const isAlwaysPublic = ALWAYS_PUBLIC.some(
        (p) => path === p || path.startsWith(`${p}/`),
      );

      if (isPublic) {
        // Bounce signed-in users away from /login but let them use the
        // forgot/reset flows (they may want to reset for security reasons).
        if (isLoggedIn && !isAlwaysPublic) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // All other routes require login
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      // On initial sign-in, copy user fields into the JWT
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.gymId = user.gymId;
        token.branchId = user.branchId;
      }
      return token;
    },
    async session({ session, token }) {
      // The JWT shape is augmented in src/types/next-auth.d.ts, but the type
      // doesn't always flow through next-auth v5-beta's callback signature
      // (it surfaces as `unknown`). The casts below match the runtime values
      // we wrote in the `jwt` callback above.
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRoleType;
        session.user.gymId = token.gymId as string;
        session.user.branchId = token.branchId as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
