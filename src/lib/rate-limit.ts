/**
 * Simple in-memory rate limiter — sliding window per (key, action).
 * Good enough for a single-server local MVP. For production with multiple
 * instances, swap the Map for Redis (Upstash, Memcached, etc).
 *
 * Usage:
 *   const ok = await checkRateLimit(`payment:${userId}`, 30, 60_000);
 *   if (!ok) throw new Error("Too many attempts. Try again in a minute.");
 */

type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Best-effort cleanup so the Map doesn't grow unbounded
let lastSweep = Date.now();
const SWEEP_INTERVAL = 60_000;

function sweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, b] of buckets.entries()) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

/**
 * Returns `true` when the call is allowed, `false` when the limit is hit.
 * `key` should uniquely identify the user/action (e.g. `login:tj@x.com`).
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  sweep();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.hits >= max) return false;
  existing.hits += 1;
  return true;
}

/** Manually reset a key — useful after a successful action that should clear counters */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Pre-baked policies used across the app */
export const POLICIES = {
  /** General mutation rate per user (write actions) */
  WRITE: { max: 60, windowMs: 60_000 }, // 60 writes per minute
  /** Payment recording rate */
  PAYMENT: { max: 30, windowMs: 60_000 },
  /** Member create rate (prevents accidental bulk-creates from runaway scripts) */
  MEMBER_CREATE: { max: 30, windowMs: 60_000 },
  /** Search query rate (prevents DB hammering) */
  SEARCH: { max: 120, windowMs: 60_000 },
} as const;
