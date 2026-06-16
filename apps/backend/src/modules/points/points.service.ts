import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";

type AddPointsOptions = {
  amountSpent?: number | null;
  transactionStatus?: string;
  reason?: string | null;
  memberId?: string | null;
};

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

export async function getPoints(uid: string): Promise<number> {
  const snap = await db.collection("points").doc(uid).get();
  if (!snap.exists) return 0;
  return Number(snap.data()?.balance || 0);
}

export async function getPointsSummary(uid: string) {
  const [pointsSnap, transactionsSnap, merchantsSnap, rewardsSnap] = await Promise.all([
    db.collection("points").doc(uid).get(),
    db.collection("transactions").where("userId", "==", uid).get(),
    db.collection("merchants").get(),
    db.collection("rewards").get(),
  ]);

  const pointsData = pointsSnap.data() || {};
  const merchantsMap = new Map(
    merchantsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as Record<string, unknown>])
  );
  const rewardsMap = new Map(
    rewardsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as Record<string, unknown>])
  );
  const transactions = transactionsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
    .map((transaction) => {
      const type = String(transaction.type || "earn") as "earn" | "redeem";
      const merchantId = String(transaction.merchantId || "");
      const rewardId = String(transaction.rewardId || "");
      const merchant = merchantId ? merchantsMap.get(merchantId) : null;
      const reward = rewardId ? rewardsMap.get(rewardId) : null;
      const points = Math.abs(Number(transaction.points || 0));
      const merchantName =
        String(
          merchant?.businessName ||
            merchant?.name ||
            merchant?.shopName ||
            transaction.merchantName ||
            ""
        ).trim() || null;
      const rewardTitle =
        String(reward?.title || transaction.rewardTitle || "").trim() || null;

      return {
        id: String(transaction.id),
        type,
        direction: type === "redeem" || Number(transaction.points || 0) < 0 ? "deduct" : "add",
        points,
        merchantId: merchantId || null,
        merchantName,
        merchantLogoUrl:
          String(merchant?.logoUrl || merchant?.imageUrl || merchant?.bannerUrl || "").trim() || null,
        rewardId: rewardId || null,
        rewardTitle,
        amountSpent:
          transaction.amountSpent === undefined || transaction.amountSpent === null
            ? null
            : Number(transaction.amountSpent || 0),
        status: String(transaction.status || "success"),
        reason: String(transaction.reason || "").trim() || null,
        description:
          type === "redeem"
            ? rewardTitle
              ? `Redeemed ${rewardTitle}`
              : "Reward redemption"
            : merchantName
              ? `Points earned from ${merchantName}`
              : "Points earned from merchant scan",
        createdAt: toIso(transaction.createdAt) || new Date().toISOString(),
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const earnedPoints =
    pointsData.earnedPoints != null
      ? Number(pointsData.earnedPoints || 0)
      : transactions
          .filter((transaction) => transaction.type === "earn")
          .reduce((sum, transaction) => sum + Number(transaction.points || 0), 0);

  const redeemedPoints =
    pointsData.redeemedPoints != null
      ? Number(pointsData.redeemedPoints || 0)
      : transactions
          .filter((transaction) => transaction.type === "redeem")
          .reduce((sum, transaction) => sum + Number(transaction.points || 0), 0);

  return {
    totalPoints: Number(pointsData.balance || 0),
    earnedPoints,
    redeemedPoints,
    transactions,
  };
}

export async function addPoints(uid: string, amount: number, merchantId: string, options: AddPointsOptions = {}) {
  const pointsRef = db.collection("points").doc(uid);
  const transactionRef = db.collection("transactions").doc();
  const merchantTransactionRef = db
    .collection("merchants")
    .doc(merchantId)
    .collection("transactions")
    .doc(transactionRef.id);
  const userPointsHistoryRef = db.collection("users").doc(uid).collection("pointsHistory").doc(transactionRef.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(pointsRef);
    const current = snap.exists ? Number(snap.data()?.balance || 0) : 0;
    const currentEarned = snap.exists ? Number(snap.data()?.earnedPoints || 0) : 0;

    tx.set(
      pointsRef,
      {
        balance: current + amount,
        earnedPoints: currentEarned + amount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const transactionPayload = {
      userId: uid,
      merchantId,
      memberId: options.memberId || null,
      amountSpent: options.amountSpent ?? null,
      points: amount,
      type: "earn",
      status: options.transactionStatus || "success",
      reason: options.reason || null,
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.set(transactionRef, transactionPayload);
    tx.set(merchantTransactionRef, transactionPayload);
    tx.set(userPointsHistoryRef, {
      ...transactionPayload,
      pointsDelta: amount,
    });
  });

  return transactionRef.id;
}

export async function logMerchantScanFailure(
  merchantId: string,
  data: {
    amountSpent?: number | null;
    reason: string;
    memberId?: string | null;
    userId?: string | null;
  }
) {
  const transactionRef = db.collection("transactions").doc();
  const merchantTransactionRef = db
    .collection("merchants")
    .doc(merchantId)
    .collection("transactions")
    .doc(transactionRef.id);

  const payload = {
    userId: data.userId || null,
    merchantId,
    memberId: data.memberId || null,
    amountSpent: data.amountSpent ?? null,
    points: 0,
    type: "earn",
    status: "failed",
    reason: data.reason,
    createdAt: FieldValue.serverTimestamp(),
  };

  await Promise.all([transactionRef.set(payload), merchantTransactionRef.set(payload)]);
  return transactionRef.id;
}

export async function redeemPoints(uid: string, amount: number, rewardId: string) {
  const pointsRef = db.collection("points").doc(uid);
  const transactionRef = db.collection("transactions").doc();
  const userPointsHistoryRef = db.collection("users").doc(uid).collection("pointsHistory").doc(transactionRef.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(pointsRef);
    const current = snap.exists ? Number(snap.data()?.balance || 0) : 0;
    const currentRedeemed = snap.exists ? Number(snap.data()?.redeemedPoints || 0) : 0;
    if (current < amount) throw new Error("Insufficient points");

    tx.set(
      pointsRef,
      {
        balance: current - amount,
        redeemedPoints: currentRedeemed + amount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const transactionPayload = {
      userId: uid,
      rewardId,
      points: amount,
      type: "redeem",
      status: "success",
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.set(transactionRef, transactionPayload);
    tx.set(userPointsHistoryRef, {
      ...transactionPayload,
      pointsDelta: -Math.abs(amount),
    });
  });
}
