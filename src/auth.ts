import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { audit, getClientIp, getUserAgent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { LoginSchema } from "@/lib/validations/auth";
import { BUSINESS_RULES } from "@/constants/business-rules";
import authConfig from "./auth.config";

/**
 * Custom credential errors so the login form can show specific messages
 * without leaking which condition failed (e.g. "user not found" vs "wrong password").
 */
export class AccountLockedError extends CredentialsSignin {
  code = "account-locked";
}
export class AccountDisabledError extends CredentialsSignin {
  code = "account-disabled";
}
export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
}

const { maxFailedLoginAttempts, lockoutMinutes, sessionLifetimeDays } = BUSINESS_RULES.security;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Cast through `Adapter` because next-auth and @auth/prisma-adapter pull
  // slightly different versions of @auth/core. The runtime shape is identical.
  adapter: PrismaAdapter(prisma) as Adapter,
  // JWT strategy is required when using Credentials provider with Auth.js v5.
  // We still write Session/Account/AuditLog rows for audit + future expansion.
  session: { strategy: "jwt", maxAge: sessionLifetimeDays * 24 * 60 * 60 },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentialsError();

        const { email, password } = parsed.data;
        const ipAddress = getClientIp(request as Request);
        const userAgent = getUserAgent(request as Request);

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Don't disclose whether the email exists — same error either way
        if (!user || !user.passwordHash) {
          await audit({
            action: "LOGIN_FAILED",
            entityType: "User",
            metadata: { email: email.toLowerCase(), reason: "user_not_found" },
            ipAddress,
            userAgent,
          });
          throw new InvalidCredentialsError();
        }

        if (!user.isActive || user.deletedAt) {
          await audit({
            gymId: user.gymId,
            userId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            metadata: { reason: "account_disabled" },
            ipAddress,
            userAgent,
          });
          throw new AccountDisabledError();
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await audit({
            gymId: user.gymId,
            userId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            metadata: { reason: "locked", lockedUntil: user.lockedUntil.toISOString() },
            ipAddress,
            userAgent,
          });
          throw new AccountLockedError();
        }

        const valid = await verifyPassword(user.passwordHash, password);

        if (!valid) {
          const newAttempts = user.failedLoginAttempts + 1;
          const shouldLock = newAttempts >= maxFailedLoginAttempts;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
                : null,
            },
          });
          await audit({
            gymId: user.gymId,
            userId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            metadata: {
              reason: shouldLock ? "lockout_triggered" : "wrong_password",
              attempts: newAttempts,
            },
            ipAddress,
            userAgent,
          });
          if (shouldLock) throw new AccountLockedError();
          throw new InvalidCredentialsError();
        }

        // ✓ success — reset counters, stamp last-login, audit, return user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
          },
        });
        await audit({
          gymId: user.gymId,
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          ipAddress,
          userAgent,
        });

        logger.info({ userId: user.id, role: user.role }, "user logged in");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          gymId: user.gymId,
          branchId: user.branchId,
        };
      },
    }),
  ],
});
