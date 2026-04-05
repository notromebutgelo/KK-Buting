import { db, auth } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { createNotification } from "../notifications/notifications.service";

export async function createUser(uid: string, data: { UserName: string; email: string }) {
  await db.collection("users").doc(uid).set({
    uid,
    UserName: data.UserName,
    email: data.email,
    role: "youth",
    createdAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    recipientUid: uid,
    audience: "youth",
    type: "success",
    title: "Welcome to KK",
    body: "Your account has been created. Complete your KK profiling to continue with verification.",
    link: "/intro",
  });
}

export async function getUserById(uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function setUserRole(uid: string, role: string) {
  const userRecord = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, {
    ...(userRecord.customClaims || {}),
    role,
  });

  await db.collection("users").doc(uid).set(
    {
      uid,
      email: userRecord.email || "",
      UserName: userRecord.displayName || userRecord.email?.split("@")[0] || role,
      role,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
