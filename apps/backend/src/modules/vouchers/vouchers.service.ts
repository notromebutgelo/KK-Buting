import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import { createNotification } from "../notifications/notifications.service";
import { generateUniqueToken } from "./vouchers.tokens";

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

function normalizeVoucher(data: AnyRecord): AnyRecord {
  const v = serializeRecord(data);
  const computedStatus = isExpired(v.expiresAt) ? "expired" : String(v.status || "active");
  return {
    id: String(v.id || ""),
    title: String(v.title || ""),
    description: String(v.description || ""),
    type: String(v.type || ""),
    pointsCost: Number(v.pointsCost ?? 0),
    eligibilityConditions: v.eligibilityConditions || {},
    stock: v.stock == null ? null : Number(v.stock),
    claimedCount: Array.isArray(v.claimedBy) ? v.claimedBy.length : Number(v.claimedCount ?? 0),
    status: computedStatus,
    createdBy: String(v.createdBy || ""),
    createdAt: String(v.createdAt || ""),
    expiresAt: v.expiresAt ? String(v.expiresAt) : null,
  };
}

// ─── SUPERADMIN: create ────────────────────────────────────────────────────────

export async function createVoucher(createdBy: string, payload: AnyRecord) {
  const ref = db.collection("vouchers").doc();
  const data = {
    title: String(payload.title || ""),
    description: String(payload.description || ""),
    type: String(payload.type || ""),
    pointsCost: Number(payload.pointsCost ?? 0),
    eligibilityConditions: payload.eligibilityConditions || {},
    stock: payload.stock == null ? null : Number(payload.stock),
    claimedBy: [],
    status: String(payload.status || "active"),
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: payload.expiresAt || null,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

// ─── LIST for youth (active + expired, with claimedByMe flag) ────────────────

export async function listYouthVouchers(uid: string) {
  const snap = await db.collection("vouchers").get();
  return snap.docs
    .map((doc) => {
      const data = { id: doc.id, ...doc.data() } as AnyRecord;
      const claimedByMe = Array.isArray(data.claimedBy) && data.claimedBy.includes(uid);
      const normalized = normalizeVoucher(data);
      return { ...normalized, claimedByMe };
    })
    .filter((v) => v.status === "active" || v.status === "expired" || v.claimedByMe);
}

// ─── LIST ALL (for superadmin) ─────────────────────────────────────────────────

export async function listAllVouchers() {
  const snap = await db.collection("vouchers").get();
  return snap.docs.map((doc) => normalizeVoucher({ id: doc.id, ...doc.data() }));
}

// ─── GET SINGLE ───────────────────────────────────────────────────────────────

export async function getVoucher(voucherId: string) {
  const snap = await db.collection("vouchers").doc(voucherId).get();
  if (!snap.exists) return null;
  return normalizeVoucher({ id: snap.id, ...snap.data() });
}

// ─── PATCH (superadmin update / expire) ───────────────────────────────────────

export async function updateVoucher(voucherId: string, patch: AnyRecord) {
  const ref = db.collection("vouchers").doc(voucherId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Voucher not found");

  const allowed: AnyRecord = { updatedAt: FieldValue.serverTimestamp() };
  const fields = ["title", "description", "type", "pointsCost", "eligibilityConditions", "stock", "status", "expiresAt"];
  for (const key of fields) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }
  await ref.set(allowed, { merge: true });
  const updated = await ref.get();
  return normalizeVoucher({ id: ref.id, ...updated.data() });
}

// ─── CLAIM ────────────────────────────────────────────────────────────────────

export async function claimVoucher(uid: string, voucherId: string) {
  const voucherRef = db.collection("vouchers").doc(voucherId);
  const pointsRef = db.collection("points").doc(uid);
  const profileRef = db.collection("kkProfiling").doc(uid);
  const userRef = db.collection("users").doc(uid);

  let voucherTitle = "";

  await db.runTransaction(async (tx) => {
    const [voucherSnap, pointsSnap, profileSnap, userSnap] = await Promise.all([
      tx.get(voucherRef),
      tx.get(pointsRef),
      tx.get(profileRef),
      tx.get(userRef),
    ]);

    if (!voucherSnap.exists) throw new Error("Voucher not found");

    const v = serializeRecord({ id: voucherSnap.id, ...voucherSnap.data() }) as AnyRecord;
    const computedStatus = isExpired(v.expiresAt) ? "expired" : String(v.status || "active");
    if (computedStatus !== "active") throw new Error("This voucher is not available");

    // Duplicate claim check
    const alreadyClaimed = Array.isArray(v.claimedBy) && v.claimedBy.includes(uid);
    if (alreadyClaimed) throw new Error("You have already claimed this voucher");

    // Stock check
    if (v.stock != null) {
      const remaining = Number(v.stock);
      if (remaining <= 0) throw new Error("This voucher is out of stock");
    }

    // Eligibility check
    const cond = v.eligibilityConditions || {};
    const profile = profileSnap.data() || {};
    const user = userSnap.data() || {};

    if (cond.isVerified) {
      const isVerified =
        Boolean(profile.verified) ||
        String(profile.status || "").toLowerCase() === "verified" ||
        String(user.verificationStatus || "").toLowerCase() === "verified";
      if (!isVerified) {
        throw new Error("You must be a verified KK member to claim this voucher");
      }
    }

    const age = Number(profile.age || 0);
    if (cond.minAge && age < Number(cond.minAge)) {
      throw new Error(`You must be at least ${cond.minAge} years old to claim this voucher`);
    }
    if (cond.maxAge && age > Number(cond.maxAge)) {
      throw new Error(`You must be ${cond.maxAge} years old or younger to claim this voucher`);
    }
    if (cond.ageGroup) {
      const userGroup = String(profile.ageGroup || "").toLowerCase();
      const reqGroup = String(cond.ageGroup).toLowerCase();
      if (userGroup && userGroup !== reqGroup) {
        throw new Error(`This voucher is only for ${cond.ageGroup} members`);
      }
    }

    // Points deduction if required
    const pointsCost = Number(v.pointsCost ?? 0);
    if (pointsCost > 0) {
      const currentBalance = Number(pointsSnap.data()?.balance ?? 0);
      const currentRedeemed = Number(pointsSnap.data()?.redeemedPoints ?? 0);
      if (currentBalance < pointsCost) throw new Error("Insufficient points");

      tx.set(
        pointsRef,
        {
          balance: currentBalance - pointsCost,
          redeemedPoints: currentRedeemed + pointsCost,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Write points ledger entry
      const txRef = db.collection("transactions").doc();
      const histRef = db.collection("users").doc(uid).collection("pointsHistory").doc(txRef.id);
      const txPayload = {
        userId: uid,
        voucherId,
        points: pointsCost,
        type: "redeem",
        status: "success",
        reason: `Voucher claim: ${v.title}`,
        createdAt: FieldValue.serverTimestamp(),
        pointsDelta: -Math.abs(pointsCost),
      };
      tx.set(txRef, txPayload);
      tx.set(histRef, txPayload);
    }

    // Update voucher: add uid to claimedBy, decrement stock
    const updates: AnyRecord = {
      claimedBy: FieldValue.arrayUnion(uid),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (v.stock != null) {
      updates.stock = Number(v.stock) - 1;
    }
    tx.set(voucherRef, updates, { merge: true });

    voucherTitle = String(v.title || "voucher");
  });

  // Generate a unique claim token and write the voucherClaims record
  const token = await generateUniqueToken();
  const claimRef = db.collection("voucherClaims").doc();
  await claimRef.set({
    claimId: claimRef.id,
    uid,
    voucherId,
    voucherTitle,
    token,
    status: "claimed",
    claimedAt: FieldValue.serverTimestamp(),
    redeemedAt: null,
    redeemedBy: null,
  });

  await createNotification({
    recipientUid: uid,
    audience: "youth",
    type: "success",
    title: "Voucher Claimed",
    body: `You successfully claimed the voucher: ${voucherTitle}. Your claim code is ${token}.`,
    link: "/vouchers",
  });

  return { claimId: claimRef.id, token, voucherId, voucherTitle };
}

// ─── GET MY CLAIM (youth) ─────────────────────────────────────────────────────

export async function getMyVoucherClaim(uid: string, voucherId: string) {
  const snap = await db
    .collection("voucherClaims")
    .where("uid", "==", uid)
    .where("voucherId", "==", voucherId)
    .limit(1)
    .get();

  if (!snap.empty) {
    const data = serializeRecord({ id: snap.docs[0].id, ...snap.docs[0].data() }) as AnyRecord;
    return {
      claimId: data.claimId || data.id,
      token: String(data.token || ""),
      voucherId: String(data.voucherId || ""),
      voucherTitle: String(data.voucherTitle || ""),
      status: String(data.status || "claimed"),
      claimedAt: data.claimedAt ? String(data.claimedAt) : null,
      redeemedAt: data.redeemedAt ? String(data.redeemedAt) : null,
    };
  }

  // No claim doc found — check if the user is in the voucher's claimedBy array
  // (happens when the voucher was claimed before the token system was deployed)
  const voucherSnap = await db.collection("vouchers").doc(voucherId).get();
  if (!voucherSnap.exists) return null;

  const v = serializeRecord({ id: voucherSnap.id, ...voucherSnap.data() }) as AnyRecord;
  const alreadyClaimed = Array.isArray(v.claimedBy) && v.claimedBy.includes(uid);
  if (!alreadyClaimed) return null;

  // Backfill: generate a token and create the missing voucherClaims document
  const token = await generateUniqueToken();
  const claimRef = db.collection("voucherClaims").doc();
  const claimData = {
    claimId: claimRef.id,
    uid,
    voucherId,
    voucherTitle: String(v.title || ""),
    token,
    status: "claimed",
    claimedAt: FieldValue.serverTimestamp(),
    redeemedAt: null,
    redeemedBy: null,
  };
  await claimRef.set(claimData);

  return {
    claimId: claimRef.id,
    token,
    voucherId,
    voucherTitle: String(v.title || ""),
    status: "claimed",
    claimedAt: null,
    redeemedAt: null,
  };
}

// ─── REDEEM PREVIEW (admin/superadmin) ───────────────────────────────────────

function makeError(message: string, status: number): Error {
  const err = new Error(message) as any;
  err.status = status;
  return err;
}

export async function redeemVoucherPreview(token: string) {
  const normalized = token.trim().toUpperCase();
  const snap = await db
    .collection("voucherClaims")
    .where("token", "==", normalized)
    .limit(1)
    .get();

  if (snap.empty) throw makeError("No voucher found with this code. Please check and try again.", 404);

  const claim = serializeRecord({ id: snap.docs[0].id, ...snap.docs[0].data() }) as AnyRecord;

  if (claim.status === "redeemed") throw makeError("This voucher was already redeemed. No action needed.", 409);
  if (claim.status === "expired") throw makeError("This claim code has expired.", 410);

  const [userSnap, voucherSnap] = await Promise.all([
    db.collection("users").doc(claim.uid).get(),
    db.collection("vouchers").doc(claim.voucherId).get(),
  ]);

  const user = userSnap.data() || {};
  const voucher = voucherSnap.data() || {};

  return {
    claimId: claim.claimId || claim.id,
    token: normalized,
    voucherId: String(claim.voucherId || ""),
    voucherTitle: String(claim.voucherTitle || voucher.title || ""),
    youthName: String(user.UserName || user.displayName || ""),
    youthEmail: String(user.email || ""),
    claimedAt: claim.claimedAt ? String(claim.claimedAt) : null,
    status: String(claim.status || "claimed"),
  };
}

// ─── REDEEM CONFIRM (admin/superadmin) ────────────────────────────────────────

export async function redeemVoucherConfirm(token: string, adminUid: string) {
  const normalized = token.trim().toUpperCase();
  const snap = await db
    .collection("voucherClaims")
    .where("token", "==", normalized)
    .limit(1)
    .get();

  if (snap.empty) throw makeError("No voucher found with this code.", 404);

  const claim = serializeRecord({ id: snap.docs[0].id, ...snap.docs[0].data() }) as AnyRecord;

  if (claim.status === "redeemed") throw makeError("This voucher was already redeemed.", 409);
  if (claim.status === "expired") throw makeError("This claim code has expired.", 410);

  await db.collection("voucherClaims").doc(snap.docs[0].id).set(
    {
      status: "redeemed",
      redeemedAt: FieldValue.serverTimestamp(),
      redeemedBy: adminUid,
    },
    { merge: true }
  );

  await createNotification({
    recipientUid: claim.uid,
    audience: "youth",
    type: "success",
    title: "Voucher Redeemed",
    body: `Your voucher "${claim.voucherTitle}" has been redeemed successfully.`,
    link: "/vouchers",
  });

  return { success: true };
}

// ─── GET VOUCHER CLAIMS (superadmin) ─────────────────────────────────────────

export async function getVoucherClaims(voucherId: string) {
  const snap = await db
    .collection("voucherClaims")
    .where("voucherId", "==", voucherId)
    .get();

  const claims = snap.docs.map((doc) =>
    serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord
  );

  // Sort by claimedAt desc
  claims.sort((a, b) =>
    String(b.claimedAt || "").localeCompare(String(a.claimedAt || ""))
  );

  // Join with users
  const uids = [...new Set(claims.map((c) => String(c.uid || "")))].filter(Boolean);
  const userDocs = await Promise.all(uids.map((uid) => db.collection("users").doc(uid).get()));
  const userMap: Record<string, AnyRecord> = {};
  for (const doc of userDocs) {
    if (doc.exists) userMap[doc.id] = doc.data() as AnyRecord;
  }

  return claims.map((c) => {
    const user = userMap[String(c.uid || "")] || {};
    return {
      claimId: String(c.claimId || c.id),
      token: String(c.token || ""),
      uid: String(c.uid || ""),
      youthName: String(user.UserName || user.displayName || ""),
      youthEmail: String(user.email || ""),
      voucherId: String(c.voucherId || ""),
      voucherTitle: String(c.voucherTitle || ""),
      status: String(c.status || "claimed"),
      claimedAt: c.claimedAt ? String(c.claimedAt) : null,
      redeemedAt: c.redeemedAt ? String(c.redeemedAt) : null,
      redeemedBy: c.redeemedBy ? String(c.redeemedBy) : null,
    };
  });
}
