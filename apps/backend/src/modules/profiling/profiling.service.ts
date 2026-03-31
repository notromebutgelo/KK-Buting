import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function submitProfiling(uid: string, data: Record<string, unknown>) {
  await db.collection("kkProfiling").doc(uid).set({
    ...data,
    userId: uid,
    status: "pending",
    verified: false,
    submittedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getProfiling(uid: string) {
  const snap = await db.collection("kkProfiling").doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateProfiling(uid: string, data: Record<string, unknown>) {
  await db.collection("kkProfiling").doc(uid).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
