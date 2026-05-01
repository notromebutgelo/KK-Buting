import { FieldValue } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import {
  NotificationInput,
  normalizeNotificationRecord,
  sortNotificationsNewestFirst,
} from "./notifications.helpers";

export async function createNotification({
  recipientUid,
  audience = "system",
  type = "info",
  title,
  body,
  link = null,
  metadata = null,
}: NotificationInput) {
  if (!recipientUid) return null;

  const ref = await db.collection("notifications").add({
    recipientUid,
    audience,
    type,
    title,
    body,
    link,
    metadata,
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function listNotificationsForUser(uid: string) {
  const snap = await db.collection("notifications").where("recipientUid", "==", uid).get();

  return sortNotificationsNewestFirst(
    snap.docs.map((doc) => normalizeNotificationRecord(doc.id, doc.data() || {}))
  );
}

export async function markAllNotificationsRead(uid: string) {
  const snap = await db.collection("notifications").where("recipientUid", "==", uid).get();
  const unreadDocs = snap.docs.filter((doc) => !doc.data()?.readAt);

  if (!unreadDocs.length) {
    return { updated: 0 };
  }

  const batch = db.batch();
  for (const doc of unreadDocs) {
    batch.set(
      doc.ref,
      {
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return { updated: unreadDocs.length };
}
