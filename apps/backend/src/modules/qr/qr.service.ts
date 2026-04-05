import { db } from "../../config/firebase";
import { generateQrToken, verifyQrToken } from "../../../utils/renerateQrToken";
import { addPoints, logMerchantScanFailure } from "../points/points.service";
import { getMerchantByOwnerId } from "../merchants/merhcants.service";

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

function getPointsFromAmount(amountSpent: number, pointsRate: number) {
  return Math.max(1, Math.floor(amountSpent / Math.max(1, pointsRate)));
}

async function resolveMerchant(ownerId: string) {
  const merchant = await getMerchantByOwnerId(ownerId);
  if (!merchant) {
    throw new Error("Merchant profile not found");
  }

  if (merchant.status === "pending") {
    throw new Error("Merchant account is pending approval");
  }

  if (merchant.status === "suspended") {
    throw new Error("Merchant account is suspended");
  }

  if (merchant.status !== "approved") {
    throw new Error("Merchant account is not approved");
  }

  return merchant;
}

async function validateYouthQr(rawValue: string) {
  const token = extractScanToken(rawValue);
  const result = verifyQrToken(token);
  if (!result) throw new Error("Invalid or expired QR code");

  const { userId, revision } = result;
  const [profileSnap, userSnap] = await Promise.all([
    db.collection("kkProfiling").doc(userId).get(),
    db.collection("users").doc(userId).get(),
  ]);

  const profile = profileSnap.data() || {};
  const user = userSnap.data() || {};

  if (profile.digitalIdStatus !== "active") {
    throw new Error("Digital ID is not active");
  }

  if (Number(profile.digitalIdRevision || 1) !== revision) {
    throw new Error("QR code is no longer valid");
  }

  return {
    userId,
    memberId: String(profile.idNumber || profile.memberId || profile.digitalIdNumber || userId),
    userName: String(
      user.UserName ||
        [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "Youth Member"
    ),
    token,
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
    throw new Error("amountSpent must be greater than 0");
  }

  const merchant = await resolveMerchant(merchantOwnerId);
  try {
    const youth = await validateYouthQr(rawValue);
    const pointsRate = Number(merchant.pointsRate || 10);
    const pointsAwarded = getPointsFromAmount(amountSpent, pointsRate);

    await addPoints(youth.userId, pointsAwarded, String(merchant.id), {
      amountSpent,
      memberId: youth.memberId,
      transactionStatus: "success",
      reason: "Merchant QR redeem",
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR redeem failed";
    await logMerchantScanFailure(String(merchant.id), {
      amountSpent,
      reason: message,
    });
    throw error;
  }
}
