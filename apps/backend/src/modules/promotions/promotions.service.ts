import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import { createNotification } from "../notifications/notifications.service";

type AnyRecord = Record<string, any>;

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

function serializeRecord<T extends AnyRecord>(record: T): T {
  const next = { ...record } as T;
  for (const [key, value] of Object.entries(next)) {
    if (value instanceof Timestamp || value instanceof Date || typeof value?.toDate === "function") {
      (next as AnyRecord)[key] = toIso(value);
    }
  }
  return next;
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

function computeDisplayStatus(promo: AnyRecord): string {
  const base = String(promo.status || "pending");
  if (base === "approved" && isExpired(promo.expiresAt)) return "expired";
  if (base === "approved") return "active";
  return base;
}

async function getMerchantName(merchantId: string): Promise<string> {
  if (!merchantId) return "Unknown Merchant";
  const snap = await db.collection("merchants").doc(merchantId).get();
  if (!snap.exists) return "Unknown Merchant";
  const d = snap.data() || {};
  return String(d.businessName || d.name || "Unknown Merchant");
}

function normalizePromotion(data: AnyRecord, merchantName?: string): AnyRecord {
  const p = serializeRecord(data);
  return {
    id: String(p.id || ""),
    merchantId: String(p.merchantId || ""),
    merchantName: merchantName || String(p.merchantName || ""),
    title: String(p.title || ""),
    description: String(p.description || ""),
    type: String(p.type || ""),
    value: Number(p.value ?? 0),
    minPurchaseAmount: Number(p.minPurchaseAmount ?? 0),
    status: computeDisplayStatus(p),
    submittedAt: String(p.submittedAt || p.createdAt || ""),
    reviewedBy: p.reviewedBy ? String(p.reviewedBy) : null,
    reviewedAt: p.reviewedAt ? String(p.reviewedAt) : null,
    reviewNote: p.reviewNote ? String(p.reviewNote) : null,
    expiresAt: p.expiresAt ? String(p.expiresAt) : null,
  };
}

// ─── MERCHANT: create ─────────────────────────────────────────────────────────

export async function createPromotion(merchantId: string, payload: AnyRecord) {
  // Look up the merchant doc to find the admin notification target
  const merchantSnap = await db.collection("merchants").doc(merchantId).get();
  const merchantName = merchantSnap.exists
    ? String(merchantSnap.data()?.businessName || merchantSnap.data()?.name || "A merchant")
    : "A merchant";

  const ref = db.collection("promotions").doc();
  const data = {
    merchantId,
    title: String(payload.title || ""),
    description: String(payload.description || ""),
    type: String(payload.type || "discount"),
    value: Number(payload.value ?? 0),
    minPurchaseAmount: Number(payload.minPurchaseAmount ?? 0),
    status: "pending",
    submittedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    expiresAt: payload.expiresAt || null,
  };
  await ref.set(data);

  // Notify admin/superadmin users
  const adminSnap = await db.collection("users").where("role", "in", ["admin", "superadmin"]).get();
  const notifyAdmins = adminSnap.docs.map((doc) =>
    createNotification({
      recipientUid: doc.id,
      audience: "admin",
      type: "promotion",
      title: "New Promotion Submitted",
      body: `${merchantName} submitted a new promotion for review: "${payload.title}".`,
      link: "/promotions",
    })
  );
  await Promise.allSettled(notifyAdmins);

  return { id: ref.id, ...data };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function listPromotions(role: string, merchantId: string) {
  let snap;
  if (role === "superadmin" || role === "admin") {
    snap = await db.collection("promotions").get();
  } else if (role === "merchant") {
    snap = await db.collection("promotions").where("merchantId", "==", merchantId).get();
  } else {
    // youth / public: only approved+active
    snap = await db.collection("promotions").where("status", "==", "approved").get();
  }

  const merchantIds = new Set<string>();
  const promos: AnyRecord[] = snap.docs.map((doc) => {
    const d = serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord;
    merchantIds.add(String(d.merchantId || ""));
    return d;
  });

  const merchantMap = new Map<string, string>();
  await Promise.all(
    Array.from(merchantIds).map(async (mId) => {
      if (mId) merchantMap.set(mId, await getMerchantName(mId));
    })
  );

  const normalized = promos.map((p) => normalizePromotion(p, merchantMap.get(String(p.merchantId || ""))));

  // Youth sees only active (not expired) approved promos
  if (role === "youth") {
    return normalized.filter((p) => p.status === "active");
  }

  return normalized;
}

// ─── LIST BY MERCHANT ID (youth merchant detail page) ─────────────────────────

export async function listActivePromotionsByMerchant(merchantId: string) {
  const snap = await db.collection("promotions").where("merchantId", "==", merchantId).where("status", "==", "approved").get();
  const promos = snap.docs.map((doc) => serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord);
  return promos
    .map((p) => normalizePromotion(p))
    .filter((p) => p.status === "active");
}

// ─── GET SINGLE ───────────────────────────────────────────────────────────────

export async function getPromotion(promotionId: string) {
  const snap = await db.collection("promotions").doc(promotionId).get();
  if (!snap.exists) return null;
  const d = serializeRecord({ id: snap.id, ...snap.data() }) as AnyRecord;
  const merchantName = await getMerchantName(String(d.merchantId || ""));
  return normalizePromotion(d, merchantName);
}

// ─── SUPERADMIN: review (approve / reject) ────────────────────────────────────

export async function reviewPromotion(
  reviewerUid: string,
  promotionId: string,
  decision: "approved" | "rejected",
  reviewNote?: string
) {
  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Promotion not found");

  const current = serializeRecord({ id: snap.id, ...snap.data() }) as AnyRecord;
  if (!["pending", "approved", "rejected"].includes(String(current.status))) {
    throw new Error("Promotion is not in a reviewable state");
  }

  await ref.set(
    {
      status: decision,
      reviewedBy: reviewerUid,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewNote: reviewNote || null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Notify the merchant
  const merchantId = String(current.merchantId || "");
  if (merchantId) {
    const merchantSnap = await db.collection("merchants").doc(merchantId).get();
    const ownerId = String(merchantSnap.data()?.ownerId || "");
    if (ownerId) {
      await createNotification({
        recipientUid: ownerId,
        audience: "merchant",
        type: decision === "approved" ? "success" : "warning",
        title: decision === "approved" ? "Promotion Approved" : "Promotion Rejected",
        body:
          decision === "approved"
            ? `Your promotion "${current.title}" has been approved and is now active.`
            : `Your promotion "${current.title}" was rejected. ${reviewNote ? `Reason: ${reviewNote}` : ""}`,
        link: null,
      });
    }
  }

  const updated = await ref.get();
  return normalizePromotion(serializeRecord({ id: ref.id, ...updated.data() }) as AnyRecord);
}

// ─── MERCHANT: edit pending promotion ─────────────────────────────────────────

export async function updatePromotion(merchantId: string, promotionId: string, patch: AnyRecord) {
  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Promotion not found");

  const current = snap.data() || {};
  if (String(current.merchantId) !== merchantId) throw new Error("Forbidden");
  if (String(current.status) !== "pending") throw new Error("Only pending promotions can be edited");

  const allowed: AnyRecord = { updatedAt: FieldValue.serverTimestamp() };
  const fields = ["title", "description", "type", "value", "minPurchaseAmount", "expiresAt"];
  for (const key of fields) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }
  await ref.set(allowed, { merge: true });
  const updated = await ref.get();
  return normalizePromotion(serializeRecord({ id: ref.id, ...updated.data() }) as AnyRecord);
}

// ─── MERCHANT: delete pending promotion ───────────────────────────────────────

export async function deletePromotion(merchantId: string, promotionId: string) {
  const ref = db.collection("promotions").doc(promotionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Promotion not found");

  const current = snap.data() || {};
  if (String(current.merchantId) !== merchantId) throw new Error("Forbidden");
  if (String(current.status) !== "pending") throw new Error("Only pending promotions can be deleted");

  await ref.delete();
  return { deleted: true };
}
