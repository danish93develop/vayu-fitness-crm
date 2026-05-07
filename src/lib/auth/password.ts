import { hash, verify } from "@node-rs/argon2";

// Argon2id is OWASP-recommended and is the default for @node-rs/argon2,
// so we omit `algorithm` here to avoid importing the const enum (which
// can't cross module boundaries with isolatedModules).
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(hashStr: string, password: string): Promise<boolean> {
  try {
    return await verify(hashStr, password);
  } catch {
    return false;
  }
}
