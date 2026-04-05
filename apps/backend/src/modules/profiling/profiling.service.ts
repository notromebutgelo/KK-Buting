import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { createNotification } from "../notifications/notifications.service";

export async function submitProfiling(uid: string, data: Record<string, unknown>) {
  await db.collection("kkProfiling").doc(uid).set({
    ...data,
    userId: uid,
    status: "pending",
    verified: false,
    submittedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await createNotification({
    recipientUid: uid,
    audience: "youth",
    type: "info",
    title: "Profiling submitted",
    body: "Your KK profiling has been submitted. Upload your verification documents to continue.",
    link: "/verification/upload",
  });
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
