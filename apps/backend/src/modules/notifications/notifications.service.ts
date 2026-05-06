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

export async function createNotificationsForRoles(
  roles: string[],
  notification: Omit<NotificationInput, "recipientUid">
) {
  const uniqueRoles = Array.from(new Set(roles.map((role) => String(role || "").trim()).filter(Boolean)));
  if (!uniqueRoles.length) {
    return { notified: 0 };
  }

  const usersSnap = await db.collection("users").where("role", "in", uniqueRoles.slice(0, 10)).get();
  const recipientIds = Array.from(new Set(usersSnap.docs.map((doc) => doc.id).filter(Boolean)));

  await Promise.allSettled(
    recipientIds.map((recipientUid) =>
      createNotification({
        ...notification,
        recipientUid,
      })
    )
  );

  return { notified: recipientIds.length };
}

export async function listNotificationsForUser(uid: string) {
  const snap = await db.collection("notifications").where("recipientUid", "==", uid).get();

  return sortNotificationsNewestFirst(
    snap.docs.map((doc) => normalizeNotificationRecord(doc.id, doc.data() || {}))
  );
}

export async function markNotificationRead(notificationId: string, uid: string) {
  if (!notificationId || !uid) {
    return null;
  }

  const ref = db.collection("notifications").doc(notificationId);
  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  const data = snap.data() || {};
  if (String(data.recipientUid || "") !== uid) {
    return null;
  }

  const alreadyRead = Boolean(data.readAt);

  if (!alreadyRead) {
    await ref.set(
      {
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return normalizeNotificationRecord(notificationId, {
    ...data,
    readAt: alreadyRead ? data.readAt : new Date().toISOString(),
  });
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
