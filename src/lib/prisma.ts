import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev to avoid
// exhausting Postgres connection limits.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Silence per-query logs in dev too — they were adding ~5-15ms per query.
    // Set DEBUG=prisma:query to re-enable when debugging slow queries.
    log: process.env.DEBUG === "prisma:query"
      ? ["query", "error", "warn"]
      : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
