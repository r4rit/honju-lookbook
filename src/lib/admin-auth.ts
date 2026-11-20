import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "honju_admin_session";
export const ADMIN_SESSION_MAX_AGE = 604800; // 7 days in seconds

const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const FAILED_AUTH_DELAY_MS = 400;
const MAX_TRACKED_IPS = 2000;

interface SessionPayload {
  sub: "admin";
  iat: number;
  exp: number;
}

const failedAttemptsByIp = new Map<string, number[]>();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function getOptionalSessionSecret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function sha256Digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyAdminPin(submittedPin: string): boolean {
  const expectedPin = requireEnv("ADMIN_PIN");
  const submittedDigest = sha256Digest(submittedPin);
  const expectedDigest = sha256Digest(expectedPin);
  return timingSafeEqual(submittedDigest, expectedDigest);
}

export function createAdminSessionToken(): string {
  const secret = requireEnv("ADMIN_SESSION_SECRET");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ADMIN_SESSION_MAX_AGE;
  const payload: SessionPayload = { sub: "admin", iat, exp };

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sigB64 = createHmac("sha256", secret)
    .update(payloadB64, "utf8")
    .digest("base64url");

  return `${payloadB64}.${sigB64}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const secret = getOptionalSessionSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return false;

  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sigB64, "base64url");
  } catch {
    return false;
  }

  const expectedSig = createHmac("sha256", secret)
    .update(payloadB64, "utf8")
    .digest();

  if (providedSig.length !== expectedSig.length) {
    return false;
  }

  if (!timingSafeEqual(providedSig, expectedSig)) {
    return false;
  }

  try {
    const decodedJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(decodedJson);
    if (typeof parsed !== "object" || parsed === null) return false;

    const record = parsed as Record<string, unknown>;
    if (record.sub !== "admin") return false;
    if (typeof record.iat !== "number" || typeof record.exp !== "number") {
      return false;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    return record.exp > nowSec;
  } catch {
    return false;
  }
}

export function attachAdminSessionCookie(response: NextResponse): void {
  const token = createAdminSessionToken();
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function pruneTimestamps(timestamps: number[], now: number): number[] {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  return timestamps.filter((ts) => ts > cutoff);
}

export function checkPinRateLimit(ip: string): {
  limited: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const existing = failedAttemptsByIp.get(ip);
  if (!existing) {
    return { limited: false, retryAfterSec: 0 };
  }

  const active = pruneTimestamps(existing, now);
  if (active.length === 0) {
    failedAttemptsByIp.delete(ip);
    return { limited: false, retryAfterSec: 0 };
  }

  failedAttemptsByIp.set(ip, active);

  if (active.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = active[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + RATE_LIMIT_WINDOW_MS - now);
    return {
      limited: true,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return { limited: false, retryAfterSec: 0 };
}

export function recordFailedPinAttempt(ip: string): void {
  const now = Date.now();
  const existing = failedAttemptsByIp.get(ip) ?? [];
  const active = pruneTimestamps(existing, now);
  active.push(now);

  if (!failedAttemptsByIp.has(ip) && failedAttemptsByIp.size >= MAX_TRACKED_IPS) {
    const firstKey = failedAttemptsByIp.keys().next().value;
    if (firstKey !== undefined) {
      failedAttemptsByIp.delete(firstKey);
    }
  }

  failedAttemptsByIp.set(ip, active);
}

export function clearPinAttempts(ip: string): void {
  failedAttemptsByIp.delete(ip);
}

export function waitFailedAuthDelay(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, FAILED_AUTH_DELAY_MS);
  });
}
