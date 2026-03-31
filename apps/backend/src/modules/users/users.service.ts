import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function getAllUsers() {
  const snap = await db.collection("users").orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateUser(uid: string, data: Record<string, unknown>) {
  await db.collection("users").doc(uid).update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

export async function getUserProfile(uid: string) {
  const [userSnap, profileSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("kkProfiling").doc(uid).get(),
  ]);
  const user = userSnap.exists ? userSnap.data() : {};
  const profile = profileSnap.exists ? profileSnap.data() : {};
  return { ...user, ...profile, id: uid };
}
