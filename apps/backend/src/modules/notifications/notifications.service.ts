import { FieldValue } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

type NotificationAudience = "youth" | "merchant" | "admin" | "system";
type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "system"
  | "account"
  | "transaction"
  | "promotion";

type NotificationInput = {
  recipientUid: string;
  audience?: NotificationAudience;
  type?: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
};

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
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

export async function listNotificationsForUser(uid: string) {
  const snap = await db.collection("notifications").where("recipientUid", "==", uid).get();

  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        recipientUid: String(data.recipientUid || ""),
        audience: String(data.audience || "system"),
        type: String(data.type || "info"),
        title: String(data.title || "Notification"),
        body: String(data.body || ""),
        link: data.link ? String(data.link) : null,
        metadata: data.metadata || null,
        read: Boolean(data.readAt),
        readAt: toIso(data.readAt) || null,
        createdAt: toIso(data.createdAt) || new Date().toISOString(),
      };
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
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
