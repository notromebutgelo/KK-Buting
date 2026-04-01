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
  const [pointsSnap, transactionsSnap] = await Promise.all([
    db.collection("points").doc(uid).get(),
    db.collection("transactions").where("userId", "==", uid).get(),
  ]);

  const pointsData = pointsSnap.data() || {};
  const transactions = transactionsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
    .map((transaction) => ({
      id: String(transaction.id),
      type: String(transaction.type || "earn") as "earn" | "redeem",
      points: Math.abs(Number(transaction.points || 0)),
      description:
        String(transaction.type || "earn") === "redeem"
          ? "Reward redemption"
          : "Points earned from merchant scan",
      createdAt: toIso(transaction.createdAt) || new Date().toISOString(),
    }))
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
