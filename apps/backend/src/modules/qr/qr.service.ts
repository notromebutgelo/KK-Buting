import { db } from "../../config/firebase";
import { generateQrToken, verifyQrToken } from "../../../utils/renerateQrToken";
import { addPoints } from "../points/points.service";
import { POINTS_PER_TRANSACTION } from "@kk-system/shared";

export async function generateUserQr(uid: string): Promise<string> {
  const profileSnap = await db.collection("kkProfiling").doc(uid).get();
  const profile = profileSnap.data() || {};
  if (profile.digitalIdStatus !== "active") {
    throw new Error("Digital ID is not active");
  }

  const token = generateQrToken(uid, Number(profile.digitalIdRevision || 1));
  return token;
}

export async function processQrScan(token: string, merchantId: string) {
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
