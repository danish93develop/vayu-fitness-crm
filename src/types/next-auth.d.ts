import type { UserRoleType } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Extend Auth.js types to include role + tenancy info on the session.
 * Anywhere in app code, `session.user.role` is now type-safe.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRoleType;
      gymId: string;
      branchId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role: UserRoleType;
    gymId: string;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRoleType;
    gymId: string;
    branchId: string | null;
  }
}
