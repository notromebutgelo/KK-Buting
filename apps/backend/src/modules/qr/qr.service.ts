import { db } from "../../config/firebase";
import { POINTS_PER_TRANSACTION } from "../../config/points";
import { generateQrToken, verifyQrToken } from "../../../utils/renerateQrToken";
import { addPoints } from "../points/points.service";

function extractScanToken(rawValue: string) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as {
      token?: string;
      qrToken?: string;
      signedToken?: string;
    };

    return String(parsed.token || parsed.qrToken || parsed.signedToken || "").trim();
  } catch {
    return trimmed;
  }
}

export async function generateUserQr(uid: string): Promise<string> {
  const profileSnap = await db.collection("kkProfiling").doc(uid).get();
  const profile = profileSnap.data() || {};
  if (profile.digitalIdStatus !== "active") {
    throw new Error("Digital ID is not active");
  }

  const token = generateQrToken(uid, Number(profile.digitalIdRevision || 1));
  return token;
}

export async function processQrScan(rawValue: string, merchantId: string) {
  const token = extractScanToken(rawValue);
  const result = verifyQrToken(token);
  if (!result) throw new Error("Invalid or expired QR code");
  const { userId, revision } = result;
  const profileSnap = await db.collection("kkProfiling").doc(userId).get();
  const profile = profileSnap.data() || {};

  if (profile.digitalIdStatus !== "active") {
    throw new Error("Digital ID is not active");
  }

  if (Number(profile.digitalIdRevision || 1) !== revision) {
    throw new Error("QR code is no longer valid");
  }

  await addPoints(userId, POINTS_PER_TRANSACTION, merchantId);
  return { userId, pointsAwarded: POINTS_PER_TRANSACTION };
}
