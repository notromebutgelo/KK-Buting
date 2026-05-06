import { db, auth } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import {
  createNotification,
  createNotificationsForRoles,
} from "../notifications/notifications.service";

export type UserRecord = Record<string, any> & {
  id: string;
  uid?: string;
  email?: string;
  role?: string;
  UserName?: string;
  createdAt?: unknown;
};

export async function createUser(uid: string, data: { UserName: string; email: string }) {
  await auth.setCustomUserClaims(uid, { role: "youth" });

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

  await createNotificationsForRoles(["admin", "superadmin"], {
    audience: "admin",
    type: "account",
    title: "New youth registration",
    body: `${data.UserName || data.email} created a new youth account and is ready for profiling follow-up.`,
    link: "/youth",
    metadata: {
      userId: uid,
      email: data.email,
    },
  });
}

export async function getUserById(uid: string): Promise<UserRecord | null> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() || {}) };
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
