import { randomBytes } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

type AnyRecord = Record<string, any>;

type RewardFilters = {
  category?: string;
  merchantId?: string;
  search?: string;
};

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

function serializeRecord<T extends AnyRecord>(record: T): T {
  const next = { ...record } as T;

  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Timestamp || value instanceof Date || typeof value?.toDate === "function") {
      (next as AnyRecord)[key] = toIso(value);
    }
  }

  return next;
}

function normalizeString(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function buildMerchantName(merchant: AnyRecord | null | undefined) {
  if (!merchant) return "Unknown Merchant";
  return String(merchant.businessName || merchant.name || "Unknown Merchant");
}

function buildMerchantImage(merchant: AnyRecord | null | undefined) {
  if (!merchant) return "";
  return String(merchant.logoUrl || merchant.imageUrl || merchant.bannerUrl || "");
}

function buildRewardImage(reward: AnyRecord, merchant: AnyRecord | null | undefined) {
  return String(reward.imageUrl || merchant?.bannerUrl || merchant?.imageUrl || merchant?.logoUrl || "");
}

function resolveRewardExpiryDate(reward: AnyRecord) {
  const value = reward.expiryDate || reward.expiresAt || null;
  return value ? String(value) : null;
}

function isRewardExpired(expiryDate: string | null) {
  if (!expiryDate) return false;
  const time = new Date(expiryDate).getTime();
  return !Number.isNaN(time) && time < Date.now();
}

function resolveRewardStatus(reward: AnyRecord) {
  const expiryDate = resolveRewardExpiryDate(reward);
  const stock = reward.unlimitedStock ? null : Number(reward.stock ?? reward.remainingStock ?? 0);
  const isActive = reward.isActive !== false;

  if (isRewardExpired(expiryDate)) return "expired";
  if (!isActive) return "inactive";
  if (!reward.unlimitedStock && stock != null && stock <= 0) return "inactive";
  return "active";
}

function normalizeReward(record: AnyRecord, merchant?: AnyRecord | null) {
  const reward = serializeRecord(record);
  const expiryDate = resolveRewardExpiryDate(reward);
  const stock = reward.unlimitedStock ? null : Number(reward.stock ?? reward.remainingStock ?? 0);

  return {
    id: String(reward.id || ""),
    title: String(reward.title || "Reward"),
    description: String(reward.description || ""),
    points: Number(reward.points || 0),
    category: String(reward.category || "others"),
    merchantId: String(reward.merchantId || ""),
    merchantName: buildMerchantName(merchant),
    merchantLogoUrl: buildMerchantImage(merchant),
    imageUrl: buildRewardImage(reward, merchant),
    stock,
    unlimitedStock: Boolean(reward.unlimitedStock),
    expiryDate,
    status: resolveRewardStatus(reward),
    validDays: Math.max(1, Number(reward.validDays || 30)),
    createdAt: String(reward.createdAt || reward.updatedAt || ""),
    updatedAt: String(reward.updatedAt || reward.createdAt || ""),
  };
}

async function getMerchantMap() {
  const merchantsSnap = await db.collection("merchants").get();
  return new Map<string, AnyRecord>(
    merchantsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord])
  );
}

async function getYouthMemberId(uid: string) {
  const [profileSnap, userSnap] = await Promise.all([
    db.collection("kkProfiling").doc(uid).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const profile = profileSnap.data() || {};
  const user = userSnap.data() || {};
  return String(profile.idNumber || profile.memberId || profile.digitalIdNumber || user.memberId || uid);
}

function computeVoucherExpiry(reward: AnyRecord, redeemedAt: Date) {
  const validDays = Math.max(1, Number(reward.validDays || 30));
  const voucherExpiry = new Date(redeemedAt);
  voucherExpiry.setDate(voucherExpiry.getDate() + validDays);

  const rewardExpiry = resolveRewardExpiryDate(reward);
  if (!rewardExpiry) return voucherExpiry.toISOString();

  const rewardExpiryTime = new Date(rewardExpiry).getTime();
  if (Number.isNaN(rewardExpiryTime)) return voucherExpiry.toISOString();

  return new Date(Math.min(voucherExpiry.getTime(), rewardExpiryTime)).toISOString();
}

function buildRedemptionCode() {
  return `KK-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function listPublicRewards(filters: RewardFilters = {}) {
  const rewardsSnap = await db.collection("rewards").get();
  const merchantMap = await getMerchantMap();
  const category = normalizeString(filters.category);
  const merchantId = String(filters.merchantId || "").trim();
  const search = normalizeString(filters.search);

  return rewardsSnap.docs
    .map((doc) => {
      const reward = serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord;
      const merchant = merchantMap.get(String(reward.merchantId || ""));
      return normalizeReward(reward, merchant);
    })
    .filter((reward) => reward.status === "active")
    .filter((reward) => !category || category === "all" || normalizeString(reward.category) === category)
    .filter((reward) => !merchantId || reward.merchantId === merchantId)
    .filter((reward) => {
      if (!search) return true;
      return (
        normalizeString(reward.title).includes(search) ||
        normalizeString(reward.description).includes(search) ||
        normalizeString(reward.merchantName).includes(search)
      );
    })
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

export async function getPublicReward(rewardId: string) {
  const rewardSnap = await db.collection("rewards").doc(rewardId).get();
  if (!rewardSnap.exists) return null;

  const reward = serializeRecord({ id: rewardSnap.id, ...rewardSnap.data() }) as AnyRecord;
  const merchantSnap = reward.merchantId
    ? await db.collection("merchants").doc(String(reward.merchantId)).get()
    : null;
  const merchant = merchantSnap?.exists ? (serializeRecord({ id: merchantSnap.id, ...merchantSnap.data() }) as AnyRecord) : null;
  const normalized = normalizeReward(reward, merchant);

  if (normalized.status !== "active") return null;
  return normalized;
}

export async function redeemPublicReward(uid: string, rewardId: string) {
  const rewardRef = db.collection("rewards").doc(rewardId);
  const pointsRef = db.collection("points").doc(uid);
  const profileRef = db.collection("kkProfiling").doc(uid);
  const transactionRef = db.collection("transactions").doc();
  const userHistoryRef = db.collection("users").doc(uid).collection("pointsHistory").doc(transactionRef.id);
  const redeemedAt = new Date();
  const redeemedAtIso = redeemedAt.toISOString();
  const memberId = await getYouthMemberId(uid);

  let result: AnyRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const [rewardSnap, pointsSnap, profileSnap] = await Promise.all([
      transaction.get(rewardRef),
      transaction.get(pointsRef),
      transaction.get(profileRef),
    ]);

    if (!rewardSnap.exists) {
      throw new Error("Reward not found");
    }

    const reward = serializeRecord({ id: rewardSnap.id, ...rewardSnap.data() }) as AnyRecord;
    const status = resolveRewardStatus(reward);
    if (status !== "active") {
      throw new Error("This reward is not available right now");
    }

    const merchantId = String(reward.merchantId || "");
    const merchantRef = merchantId ? db.collection("merchants").doc(merchantId) : null;
    const merchantSnap = merchantRef ? await transaction.get(merchantRef) : null;
    const merchant = merchantSnap?.exists
      ? (serializeRecord({ id: merchantSnap.id, ...merchantSnap.data() }) as AnyRecord)
      : null;

    const pointsCost = Number(reward.points || 0);
    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      throw new Error("This reward has an invalid points cost");
    }

    const currentBalance = Number(pointsSnap.data()?.balance || 0);
    const currentRedeemed = Number(pointsSnap.data()?.redeemedPoints || 0);
    if (currentBalance < pointsCost) {
      throw new Error("Insufficient points");
    }

    if (!reward.unlimitedStock) {
      const stock = Number(reward.stock ?? reward.remainingStock ?? 0);
      if (!Number.isFinite(stock) || stock <= 0) {
        throw new Error("This reward is out of stock");
      }

      transaction.set(
        rewardRef,
        {
          stock: stock - 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const merchantName = buildMerchantName(merchant);
    const voucherExpiry = computeVoucherExpiry(reward, redeemedAt);
    const code = buildRedemptionCode();
    const profile = profileSnap.data() || {};

    transaction.set(
      pointsRef,
      {
        balance: currentBalance - pointsCost,
        redeemedPoints: currentRedeemed + pointsCost,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const transactionPayload = {
      userId: uid,
      memberId: String(profile.idNumber || profile.memberId || profile.digitalIdNumber || memberId),
      rewardId: rewardRef.id,
      rewardTitle: String(reward.title || "Reward"),
      rewardImageUrl: buildRewardImage(reward, merchant),
      merchantId,
      merchantName,
      redemptionCode: code,
      validDays: Math.max(1, Number(reward.validDays || 30)),
      expiresAt: voucherExpiry,
      points: pointsCost,
      type: "redeem",
      status: "success",
      redemptionStatus: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(transactionRef, transactionPayload);
    transaction.set(userHistoryRef, {
      ...transactionPayload,
      pointsDelta: -Math.abs(pointsCost),
    });

    result = {
      id: transactionRef.id,
      rewardId: rewardRef.id,
      rewardTitle: String(reward.title || "Reward"),
      merchantId,
      merchantName,
      code,
      pointsCost,
      redeemedAt: redeemedAtIso,
      expiresAt: voucherExpiry,
      status: "active",
      remainingPoints: currentBalance - pointsCost,
      imageUrl: buildRewardImage(reward, merchant),
    };
  });

  return result;
}

export async function listMyRewardRedemptions(uid: string, statusFilter?: string) {
  const [transactionsSnap, rewardsSnap, merchantsSnap] = await Promise.all([
    db.collection("transactions").where("userId", "==", uid).get(),
    db.collection("rewards").get(),
    db.collection("merchants").get(),
  ]);

  const rewardsMap = new Map<string, AnyRecord>(
    rewardsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord])
  );
  const merchantMap = new Map<string, AnyRecord>(
    merchantsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord])
  );
  const normalizedStatus = normalizeString(statusFilter);

  return transactionsSnap.docs
    .map((doc) => serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord)
    .filter((transaction) => String(transaction.type || "") === "redeem")
    .map((transaction) => {
      const reward = rewardsMap.get(String(transaction.rewardId || ""));
      const merchant =
        merchantMap.get(String(transaction.merchantId || "")) ||
        merchantMap.get(String(reward?.merchantId || ""));
      const expiresAt = String(transaction.expiresAt || computeVoucherExpiry(reward || {}, new Date(transaction.createdAt || Date.now())));
      const expiresAtTime = new Date(expiresAt).getTime();
      const computedStatus =
        String(transaction.redemptionStatus || "").toLowerCase() === "claimed"
          ? "claimed"
          : !Number.isNaN(expiresAtTime) && expiresAtTime < Date.now()
            ? "expired"
            : "active";

      return {
        id: String(transaction.id),
        rewardId: String(transaction.rewardId || ""),
        rewardTitle: String(transaction.rewardTitle || reward?.title || "Reward"),
        merchantId: String(transaction.merchantId || reward?.merchantId || ""),
        merchantName: String(transaction.merchantName || buildMerchantName(merchant)),
        imageUrl: String(transaction.rewardImageUrl || buildRewardImage(reward || {}, merchant)),
        pointsCost: Math.abs(Number(transaction.points || 0)),
        status: computedStatus,
        code: String(transaction.redemptionCode || ""),
        redeemedAt: String(toIso(transaction.createdAt) || transaction.createdAt || ""),
        expiresAt,
        claimedAt: toIso(transaction.claimedAt) || String(transaction.claimedAt || ""),
      };
    })
    .filter((redemption) => !normalizedStatus || normalizedStatus === "all" || redemption.status === normalizedStatus)
    .sort((a, b) => String(b.redeemedAt || "").localeCompare(String(a.redeemedAt || "")));
}
