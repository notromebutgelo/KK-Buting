import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function getAllMerchants() {
  const snap = await db.collection("merchants").where("status", "==", "approved").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMerchantById(id: string) {
  const snap = await db.collection("merchants").doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createMerchant(data: Record<string, unknown>) {
  const ref = await db.collection("merchants").add({
    ...data,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateMerchantStatus(id: string, status: "approved" | "rejected") {
  await db.collection("merchants").doc(id).update({ status, updatedAt: FieldValue.serverTimestamp() });
}
