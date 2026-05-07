"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { LoginSchema, type LoginInput } from "@/lib/validations/auth";
import { audit } from "@/lib/audit";
import { auth } from "@/auth";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-credentials": "Invalid email or password.",
  "account-locked":
    "Account locked due to too many failed attempts. Try again in 15 minutes.",
  "account-disabled": "This account has been disabled. Contact your admin.",
  default: "Something went wrong. Please try again.",
};

export async function loginAction(values: LoginInput): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      // CredentialsSignin subclasses set `code` so we can map to user-facing text
      // @ts-expect-error — `code` exists on our custom CredentialsSignin subclasses
      const code: string | undefined = err.code;
      return { ok: false, error: ERROR_MESSAGES[code ?? "default"] ?? ERROR_MESSAGES.default! };
    }
    // Re-throw NEXT_REDIRECT etc.
    throw err;
  }
}

export async function logoutAction(): Promise<never> {
  const session = await auth();
  if (session?.user) {
    await audit({
      gymId: session.user.gymId,
      userId: session.user.id,
      action: "LOGOUT",
      entityType: "User",
      entityId: session.user.id,
    });
  }
  await signOut({ redirect: false });
  redirect("/login");
}
