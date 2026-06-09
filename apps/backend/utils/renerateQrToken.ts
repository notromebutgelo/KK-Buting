import crypto from "crypto";
import { ENV } from "../src/config/env";

export const QR_TOKEN_TTL_MS = 10 * 60 * 1000;

export type QrTokenVerificationResult =
  | {
      valid: true;
      userId: string;
      revision: number;
      timestamp: number;
      expiresAt: number;
    }
  | {
      valid: false;
      reason:
        | "malformed"
        | "invalid_revision"
        | "invalid_timestamp"
        | "bad_signature"
        | "expired";
      timestamp?: number;
      expiresAt?: number;
    };

/**
 * Generates a signed QR token for a user that merchants can scan.
 * Format: base64(userId:revision:timestamp:hmac)
 */
export function generateQrToken(userId: string, revision: number, issuedAt = Date.now()): string {
  const timestamp = issuedAt;
  const payload = `${userId}:${revision}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", ENV.QR_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

function hmacMatches(received: string, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function verifyQrTokenDetailed(
  token: string,
  now = Date.now()
): QrTokenVerificationResult {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return { valid: false, reason: "malformed" };

    const [userId, revisionStr, tsStr, hmac] = parts;
    const revision = parseInt(revisionStr, 10);
    const timestamp = parseInt(tsStr, 10);
    const payload = `${userId}:${revisionStr}:${tsStr}`;
    const expected = crypto.createHmac("sha256", ENV.QR_SECRET).update(payload).digest("hex");

    if (!userId) return { valid: false, reason: "malformed" };
    if (Number.isNaN(revision)) return { valid: false, reason: "invalid_revision" };
    if (Number.isNaN(timestamp)) return { valid: false, reason: "invalid_timestamp" };
    if (!hmacMatches(hmac, expected)) return { valid: false, reason: "bad_signature" };

    const expiresAt = timestamp + QR_TOKEN_TTL_MS;
    if (now > expiresAt) {
      return { valid: false, reason: "expired", timestamp, expiresAt };
    }

    return { valid: true, userId, revision, timestamp, expiresAt };
  } catch {
    return { valid: false, reason: "malformed" };
  }
}

export function verifyQrToken(token: string): { userId: string; revision: number; timestamp: number; expiresAt: number } | null {
  const result = verifyQrTokenDetailed(token);
  return result.valid ? result : null;
}
