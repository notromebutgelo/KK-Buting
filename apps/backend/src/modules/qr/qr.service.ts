import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { generateQrToken, verifyQrToken } from "../../../utils/renerateQrToken";
import { logMerchantScanFailure } from "../points/points.service";
import { getMerchantByOwnerId } from "../merchants/merhcants.service";
import {
  assertMerchantCanRedeem,
  extractScanToken,
  getPointsFromAmount,
} from "./qr.helpers";

async function resolveMerchant(ownerId: string) {
  return assertMerchantCanRedeem(await getMerchantByOwnerId(ownerId));
}

function makeQrError(message: string, status: number): Error {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function getUsedQrTokenId(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseYouthQr(rawValue: string) {
  const token = extractScanToken(rawValue);
  const result = verifyQrToken(token);
  if (!result) throw makeQrError("Invalid or expired QR code", 400);

  return {
    token,
    ...result,
  };
}

function buildYouthSummary(
  userId: string,
  profile: Record<string, any>,
  user: Record<string, any>
) {
  return {
    userId,
    memberId: String(profile.idNumber || profile.memberId || profile.digitalIdNumber || userId),
    userName: String(
      user.UserName ||
        [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "Youth Member"
    ),
  };
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

export async function processQrScan(rawValue: string, merchantOwnerId: string, amountSpent: number) {
  return processQrRedeem(rawValue, merchantOwnerId, amountSpent);
}

export async function processQrRedeem(rawValue: string, merchantOwnerId: string, amountSpent: number) {
  if (!Number.isFinite(amountSpent) || amountSpent <= 0) {
    throw makeQrError("amountSpent must be greater than 0", 400);
  }

  const merchant = await resolveMerchant(merchantOwnerId);
  let parsedQr: ReturnType<typeof parseYouthQr> | null = null;

  try {
    parsedQr = parseYouthQr(rawValue);
    const qr = parsedQr;
    const pointsRate = Number(merchant.pointsRate || 10);
    const pointsAwarded = getPointsFromAmount(amountSpent, pointsRate);
    const usedTokenId = getUsedQrTokenId(qr.token);
    const usedTokenRef = db.collection("usedQrTokens").doc(usedTokenId);
    const profileRef = db.collection("kkProfiling").doc(qr.userId);
    const userRef = db.collection("users").doc(qr.userId);
    const pointsRef = db.collection("points").doc(qr.userId);
    const transactionRef = db.collection("transactions").doc();
    const merchantTransactionRef = db
      .collection("merchants")
      .doc(String(merchant.id))
      .collection("transactions")
      .doc(transactionRef.id);
    const userPointsHistoryRef = db
      .collection("users")
      .doc(qr.userId)
      .collection("pointsHistory")
      .doc(transactionRef.id);

    return await db.runTransaction(async (tx) => {
      const [usedTokenSnap, profileSnap, userSnap, pointsSnap] = await Promise.all([
        tx.get(usedTokenRef),
        tx.get(profileRef),
        tx.get(userRef),
        tx.get(pointsRef),
      ]);

      if (usedTokenSnap.exists) {
        throw makeQrError(
          "This QR code has already been used. Please ask the user to refresh or generate a new QR code.",
          409
        );
      }

      const profile = profileSnap.data() || {};
      const user = userSnap.data() || {};

      if (profile.digitalIdStatus !== "active") {
        throw makeQrError("Digital ID is not active", 400);
      }

      if (Number(profile.digitalIdRevision || 1) !== qr.revision) {
        throw makeQrError("QR code is no longer valid", 400);
      }

      const youth = buildYouthSummary(qr.userId, profile, user);
      const currentPoints = pointsSnap.exists ? Number(pointsSnap.data()?.balance || 0) : 0;
      const currentEarned = pointsSnap.exists ? Number(pointsSnap.data()?.earnedPoints || 0) : 0;

      tx.set(
        pointsRef,
        {
          balance: currentPoints + pointsAwarded,
          earnedPoints: currentEarned + pointsAwarded,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const transactionPayload = {
        userId: youth.userId,
        merchantId: String(merchant.id),
        memberId: youth.memberId,
        amountSpent,
        points: pointsAwarded,
        type: "earn",
        status: "success",
        reason: "Merchant QR redeem",
        qrTokenClaimId: usedTokenId,
        createdAt: FieldValue.serverTimestamp(),
      };

      tx.set(transactionRef, transactionPayload);
      tx.set(merchantTransactionRef, transactionPayload);
      tx.set(userPointsHistoryRef, {
        ...transactionPayload,
        pointsDelta: pointsAwarded,
      });
      tx.set(usedTokenRef, {
        tokenHash: usedTokenId,
        userId: youth.userId,
        merchantId: String(merchant.id),
        memberId: youth.memberId,
        amountSpent,
        pointsAwarded,
        pointsRate,
        qrRevision: qr.revision,
        qrIssuedAt: new Date(qr.timestamp).toISOString(),
        transactionId: transactionRef.id,
        status: "used",
        usedAt: FieldValue.serverTimestamp(),
      });

      return {
        userId: youth.userId,
        userName: youth.userName,
        memberId: youth.memberId,
        merchantId: merchant.id,
        merchantName: merchant.name,
        amountSpent,
        pointsRate,
        pointsAwarded,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR redeem failed";
    const failurePayload: {
      amountSpent: number;
      reason: string;
      userId?: string;
    } = {
      amountSpent,
      reason: message,
    };

    if (parsedQr?.userId) {
      failurePayload.userId = parsedQr.userId;
    }

    await logMerchantScanFailure(String(merchant.id), failurePayload);
    throw error;
  }
}
