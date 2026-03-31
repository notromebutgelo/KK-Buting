import { db, auth } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function createUser(uid: string, data: { UserName: string; email: string }) {
  await db.collection("users").doc(uid).set({
    uid,
    UserName: data.UserName,
    email: data.email,
    role: "youth",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getUserById(uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function setUserRole(uid: string, role: string) {
  await auth.setCustomUserClaims(uid, { role });
  await db.collection("users").doc(uid).update({ role });
}
