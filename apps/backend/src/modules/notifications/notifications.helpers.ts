export type NotificationAudience = "youth" | "merchant" | "admin" | "system";
export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "system"
  | "account"
  | "transaction"
  | "promotion";

export type NotificationInput = {
  recipientUid: string;
  audience?: NotificationAudience;
  type?: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type NotificationRecord = {
  id: string;
  recipientUid: string;
  audience: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export function notificationValueToIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

export function normalizeNotificationRecord(
  id: string,
  data: Record<string, unknown>,
  fallbackCreatedAt = new Date().toISOString()
): NotificationRecord {
  return {
    id,
    recipientUid: String(data.recipientUid || ""),
    audience: String(data.audience || "system"),
    type: String(data.type || "info"),
    title: String(data.title || "Notification"),
    body: String(data.body || ""),
    link: data.link ? String(data.link) : null,
    metadata: (data.metadata as Record<string, unknown> | null) || null,
    read: Boolean(data.readAt),
    readAt: notificationValueToIso(data.readAt) || null,
    createdAt: notificationValueToIso(data.createdAt) || fallbackCreatedAt,
  };
}

export function sortNotificationsNewestFirst<T extends { createdAt?: string | null }>(
  notifications: T[]
): T[] {
  return [...notifications].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
}
