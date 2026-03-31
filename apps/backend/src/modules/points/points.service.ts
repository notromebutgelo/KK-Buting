import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function getPoints(uid: string): Promise<number> {
  const snap = await db.collection("points").doc(uid).get();
  if (!snap.exists) return 0;
  return (snap.data()?.balance as number) || 0;
}

export async function addPoints(uid: string, amount: number, merchantId: string) {
  const ref = db.collection("points").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()?.balance || 0) : 0;
    tx.set(ref, { balance: current + amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  await db.collection("transactions").add({
    userId: uid,
    merchantId,
    points: amount,
    type: "earn",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function redeemPoints(uid: string, amount: number, rewardId: string) {
  const ref = db.collection("points").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()?.balance || 0) : 0;
    if (current < amount) throw new Error("Insufficient points");
    tx.update(ref, { balance: current - amount, updatedAt: FieldValue.serverTimestamp() });
  });
  await db.collection("transactions").add({
    userId: uid,
    rewardId,
    points: amount,
    type: "redeem",
    createdAt: FieldValue.serverTimestamp(),
  });
}
