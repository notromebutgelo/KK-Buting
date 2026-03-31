import crypto from "crypto";

/**
 * Generates a signed QR token for a user that merchants can scan.
 * Format: base64(userId:revision:timestamp:hmac)
 */
export function generateQrToken(userId: string, revision: number): string {
  const timestamp = Date.now();
  const payload = `${userId}:${revision}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", process.env.QR_SECRET || "kk-secret").update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyQrToken(token: string): { userId: string; revision: number; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [userId, revisionStr, tsStr, hmac] = parts;
    const revision = parseInt(revisionStr, 10);
    const timestamp = parseInt(tsStr, 10);
    const payload = `${userId}:${revisionStr}:${tsStr}`;
    const expected = crypto.createHmac("sha256", process.env.QR_SECRET || "kk-secret").update(payload).digest("hex");
    if (hmac !== expected) return null;
    if (Number.isNaN(revision)) return null;
    // Expire after 10 minutes
    if (Date.now() - timestamp > 10 * 60 * 1000) return null;
    return { userId, revision, timestamp };
  } catch {
    return null;
  }
}
