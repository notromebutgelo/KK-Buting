import { FieldValue } from "firebase-admin/firestore";

import { auth, db } from "../../config/firebase";
import {
  NotificationInput,
  normalizeNotificationRecord,
  sortNotificationsNewestFirst,
} from "./notifications.helpers";

function normalizeRole(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function listRecipientUidsFromRoleDocuments(roles: string[]) {
  const recipientIds = new Set<string>();

  await Promise.allSettled(
    roles.map(async (role) => {
      const snap = await db.collection("users").where("role", "==", role).get();
      for (const doc of snap.docs) {
        if (doc.id) {
          recipientIds.add(doc.id);
        }
      }
    })
  );

  return [...recipientIds];
}

async function listRecipientUidsFromAuthClaims(roles: string[]) {
  if (!auth || typeof auth.listUsers !== "function") {
    return [];
  }

  const roleSet = new Set(roles.map((role) => normalizeRole(role)).filter(Boolean));
  if (!roleSet.size) {
    return [];
  }

  const recipientIds = new Set<string>();
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users || []) {
      const role = normalizeRole(user.customClaims?.role);
      if (roleSet.has(role) && user.uid) {
        recipientIds.add(user.uid);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return [...recipientIds];
}

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
  const uniqueRoles = Array.from(
    new Set(roles.map((role) => normalizeRole(role)).filter(Boolean))
  );
  if (!uniqueRoles.length) {
    return { notified: 0 };
  }

  const [documentRecipients, authRecipients] = await Promise.allSettled([
    listRecipientUidsFromRoleDocuments(uniqueRoles),
    listRecipientUidsFromAuthClaims(uniqueRoles),
  ]);

  const recipientIds = Array.from(
    new Set([
      ...(documentRecipients.status === "fulfilled" ? documentRecipients.value : []),
      ...(authRecipients.status === "fulfilled" ? authRecipients.value : []),
    ])
  );

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
