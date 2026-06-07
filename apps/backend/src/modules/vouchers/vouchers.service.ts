import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import { createNotification } from "../notifications/notifications.service";
import { generateUniqueToken } from "./vouchers.tokens";

type AnyRecord = Record<string, any>;
type YouthVoucherSummary = AnyRecord & {
  status: string;
  claimedByMe: boolean;
};

const TARGETED_VOUCHER = "targeted";
const PUBLIC_VOUCHER = "public";
const MAX_TARGET_RECIPIENTS = 500;
const DEFAULT_EXPIRED_VISIBILITY_DAYS = 30;
const MAX_EXPIRED_VISIBILITY_DAYS = 365;
const EXPIRED_VISIBILITY_DURATION = "duration";
const EXPIRED_VISIBILITY_MANUAL = "manual";

function makeError(message: string, status: number): Error {
  const err = new Error(message) as any;
  err.status = status;
  return err;
}

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

function normalizeTargetUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    )
  );
}

function resolveVisibilityType(value: unknown) {
  return String(value || "").trim().toLowerCase() === TARGETED_VOUCHER
    ? TARGETED_VOUCHER
    : PUBLIC_VOUCHER;
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function normalizeExpiredVisibilityMode(value: unknown) {
  return String(value || "").trim().toLowerCase() === EXPIRED_VISIBILITY_MANUAL
    ? EXPIRED_VISIBILITY_MANUAL
    : EXPIRED_VISIBILITY_DURATION;
}

function normalizeExpiredVisibilityDays(value: unknown) {
  const numericValue = Number(value ?? DEFAULT_EXPIRED_VISIBILITY_DAYS);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_EXPIRED_VISIBILITY_DAYS;
  }

  return Math.min(
    Math.max(Math.trunc(numericValue), 1),
    MAX_EXPIRED_VISIBILITY_DAYS
  );
}

function getExpiredReferenceTime(voucher: AnyRecord) {
  const referenceValue = voucher.expiresAt || voucher.expiredAt;
  if (!referenceValue) return null;

  const timestamp = new Date(String(referenceValue)).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getExpiredVisibleUntil(voucher: AnyRecord) {
  if (normalizeExpiredVisibilityMode(voucher.expiredVisibilityMode) !== EXPIRED_VISIBILITY_DURATION) {
    return null;
  }

  const referenceTime = getExpiredReferenceTime(voucher);
  if (!referenceTime) return null;

  const days = normalizeExpiredVisibilityDays(voucher.expiredVisibilityDays);
  return new Date(referenceTime + days * 24 * 60 * 60 * 1000).toISOString();
}

function isExpiredVoucherVisibleToYouth(voucher: AnyRecord) {
  if (normalizeBoolean(voucher.expiredHiddenFromYouth)) {
    return false;
  }

  if (normalizeExpiredVisibilityMode(voucher.expiredVisibilityMode) === EXPIRED_VISIBILITY_MANUAL) {
    return true;
  }

  const visibleUntil = getExpiredVisibleUntil(voucher);
  if (!visibleUntil) {
    return true;
  }

  return new Date(visibleUntil).getTime() >= Date.now();
}

function canUserAccessVoucher(voucher: AnyRecord, uid: string) {
  if (resolveVisibilityType(voucher.visibilityType) === PUBLIC_VOUCHER) {
    return true;
  }

  return normalizeTargetUserIds(voucher.targetUserIds).includes(uid);
}

function normalizeVoucher(
  data: AnyRecord,
  options: { includeTargetUserIds?: boolean } = {}
): AnyRecord {
  const v = serializeRecord(data);
  const computedStatus = isExpired(v.expiresAt) ? "expired" : String(v.status || "active");
  const visibilityType = resolveVisibilityType(v.visibilityType);
  const expiredVisibilityMode = normalizeExpiredVisibilityMode(v.expiredVisibilityMode);
  const expiredVisibilityDays = normalizeExpiredVisibilityDays(v.expiredVisibilityDays);
  const expiredVisibleUntil = getExpiredVisibleUntil({
    ...v,
    expiredVisibilityMode,
    expiredVisibilityDays,
  });
  const targetUserIds =
    visibilityType === TARGETED_VOUCHER ? normalizeTargetUserIds(v.targetUserIds) : [];

  return {
    id: String(v.id || ""),
    title: String(v.title || ""),
    description: String(v.description || ""),
    type: String(v.type || ""),
    pointsCost: Number(v.pointsCost ?? 0),
    eligibilityConditions: v.eligibilityConditions || {},
    stock: v.stock == null ? null : Number(v.stock),
    claimedCount: Array.isArray(v.claimedBy) ? v.claimedBy.length : Number(v.claimedCount ?? 0),
    visibilityType,
    targetedRecipientCount: targetUserIds.length,
    notificationsEnabled: Boolean(v.notificationsEnabled),
    ...(options.includeTargetUserIds ? { targetUserIds } : {}),
    status: computedStatus,
    expiredVisibilityMode,
    expiredVisibilityDays,
    expiredHiddenFromYouth: normalizeBoolean(v.expiredHiddenFromYouth),
    expiredAt: toIso(v.expiredAt) || null,
    expiredVisibleUntil,
    createdBy: String(v.createdBy || ""),
    createdAt: String(v.createdAt || ""),
    expiresAt: v.expiresAt ? String(v.expiresAt) : null,
  };
}

async function assertValidTargetUsers(targetUserIds: string[]) {
  if (!targetUserIds.length) {
    throw new Error("Select at least one youth member for a targeted voucher");
  }
  if (targetUserIds.length > MAX_TARGET_RECIPIENTS) {
    throw new Error(`Targeted vouchers support up to ${MAX_TARGET_RECIPIENTS} recipients`);
  }

  const userDocs = await Promise.all(
    targetUserIds.map((uid) => db.collection("users").doc(uid).get())
  );
  const invalidRecipient = userDocs.find(
    (doc) => !doc.exists || String(doc.data()?.role || "").toLowerCase() !== "youth"
  );

  if (invalidRecipient) {
    throw new Error("Every targeted recipient must be an existing youth member");
  }
}

async function notifyTargetRecipients(
  targetUserIds: string[],
  voucher: { id: string; title: string; description?: string }
) {
  await Promise.allSettled(
    targetUserIds.map((recipientUid) =>
      createNotification({
        recipientUid,
        audience: "youth",
        type: "info",
        title: "New Voucher Available",
        body: voucher.description
          ? `${voucher.title}: ${voucher.description}`
          : `${voucher.title} is now available in your KK Vouchers account.`,
        link: "/vouchers",
        metadata: {
          voucherId: voucher.id,
          visibilityType: TARGETED_VOUCHER,
        },
      })
    )
  );
}

async function attachTargetRecipientSummaries(vouchers: AnyRecord[]) {
  const targetUserIds = Array.from(
    new Set(vouchers.flatMap((voucher) => normalizeTargetUserIds(voucher.targetUserIds)))
  );
  const userDocs = await Promise.all(
    targetUserIds.map((uid) => db.collection("users").doc(uid).get())
  );
  const userMap = new Map(
    userDocs
      .filter((doc) => doc.exists)
      .map((doc) => [
        doc.id,
        {
          uid: doc.id,
          fullName: String(doc.data()?.UserName || doc.data()?.displayName || ""),
          email: String(doc.data()?.email || ""),
        },
      ])
  );

  return vouchers.map((voucher) => ({
    ...voucher,
    targetRecipients: normalizeTargetUserIds(voucher.targetUserIds).map(
      (uid) => userMap.get(uid) || { uid, fullName: "", email: "" }
    ),
  }));
}

// ─── SUPERADMIN: create ────────────────────────────────────────────────────────

export async function createVoucher(createdBy: string, payload: AnyRecord) {
  const ref = db.collection("vouchers").doc();
  const visibilityType = resolveVisibilityType(payload.visibilityType);
  const targetUserIds =
    visibilityType === TARGETED_VOUCHER
      ? normalizeTargetUserIds(payload.targetUserIds)
      : [];
  const notificationsEnabled =
    visibilityType === TARGETED_VOUCHER && normalizeBoolean(payload.notificationsEnabled);

  if (visibilityType === TARGETED_VOUCHER) {
    await assertValidTargetUsers(targetUserIds);
  }

  const status = String(payload.status || "active");
  const data = {
    title: String(payload.title || ""),
    description: String(payload.description || ""),
    type: String(payload.type || ""),
    pointsCost: Number(payload.pointsCost ?? 0),
    eligibilityConditions: payload.eligibilityConditions || {},
    stock: payload.stock == null ? null : Number(payload.stock),
    claimedBy: [],
    visibilityType,
    targetUserIds,
    notificationsEnabled,
    expiredVisibilityMode: normalizeExpiredVisibilityMode(payload.expiredVisibilityMode),
    expiredVisibilityDays: normalizeExpiredVisibilityDays(payload.expiredVisibilityDays),
    expiredHiddenFromYouth: normalizeBoolean(payload.expiredHiddenFromYouth),
    status,
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: payload.expiresAt || null,
    expiredAt: status === "expired" ? FieldValue.serverTimestamp() : null,
  };
  await ref.set(data);

  if (
    visibilityType === TARGETED_VOUCHER &&
    notificationsEnabled &&
    data.status === "active" &&
    !isExpired(data.expiresAt)
  ) {
    await notifyTargetRecipients(targetUserIds, {
      id: ref.id,
      title: data.title,
      description: data.description,
    });
  }

  return normalizeVoucher(
    { id: ref.id, ...data, createdAt: new Date().toISOString() },
    { includeTargetUserIds: true }
  );
}

// ─── LIST for youth (active + expired, with claimedByMe flag) ────────────────

export async function listYouthVouchers(uid: string) {
  const snap = await db.collection("vouchers").get();
  const vouchers: YouthVoucherSummary[] = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as AnyRecord)
    .filter((voucher) => canUserAccessVoucher(voucher, uid))
    .map((doc) => {
      const data = doc;
      const claimedByMe = Array.isArray(data.claimedBy) && data.claimedBy.includes(uid);
      const normalized = normalizeVoucher(data);
      return {
        ...(normalized as AnyRecord),
        status: String(normalized.status || "active"),
        claimedByMe,
      };
    });

  return vouchers.filter(
    (voucher) =>
      voucher.status === "active" ||
      voucher.claimedByMe ||
      (voucher.status === "expired" && isExpiredVoucherVisibleToYouth(voucher))
  );
}

// ─── LIST ALL (for superadmin) ─────────────────────────────────────────────────

export async function listAllVouchers() {
  const snap = await db.collection("vouchers").get();
  const vouchers = snap.docs.map((doc) =>
    normalizeVoucher(
      { id: doc.id, ...doc.data() },
      { includeTargetUserIds: true }
    )
  );
  return attachTargetRecipientSummaries(vouchers);
}

// ─── GET SINGLE ───────────────────────────────────────────────────────────────

export async function getVoucher(
  voucherId: string,
  viewer: { uid: string; role: string }
) {
  const snap = await db.collection("vouchers").doc(voucherId).get();
  if (!snap.exists) return null;
  const rawVoucher = { id: snap.id, ...snap.data() } as AnyRecord;
  const isPrivileged = ["admin", "superadmin"].includes(
    String(viewer.role || "").toLowerCase()
  );

  if (!isPrivileged && !canUserAccessVoucher(rawVoucher, viewer.uid)) {
    return null;
  }

  const voucher = normalizeVoucher(rawVoucher, {
    includeTargetUserIds: isPrivileged,
  });
  if (!isPrivileged) {
    return voucher;
  }

  return (await attachTargetRecipientSummaries([voucher]))[0];
}

// ─── PATCH (superadmin update / expire) ───────────────────────────────────────

export async function updateVoucher(voucherId: string, patch: AnyRecord) {
  const ref = db.collection("vouchers").doc(voucherId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Voucher not found");

  const existing = snap.data() as AnyRecord;
  const previousVisibilityType = resolveVisibilityType(existing.visibilityType);
  const visibilityType =
    patch.visibilityType === undefined
      ? previousVisibilityType
      : resolveVisibilityType(patch.visibilityType);
  const previousTargetUserIds = normalizeTargetUserIds(existing.targetUserIds);
  const targetUserIds =
    visibilityType === TARGETED_VOUCHER
      ? patch.targetUserIds === undefined
        ? previousTargetUserIds
        : normalizeTargetUserIds(patch.targetUserIds)
      : [];
  const notificationsEnabled =
    visibilityType === TARGETED_VOUCHER &&
    (patch.notificationsEnabled === undefined
      ? Boolean(existing.notificationsEnabled)
      : normalizeBoolean(patch.notificationsEnabled));

  if (visibilityType === TARGETED_VOUCHER) {
    await assertValidTargetUsers(targetUserIds);
  }

  const allowed: AnyRecord = { updatedAt: FieldValue.serverTimestamp() };
  const fields = [
    "title",
    "description",
    "type",
    "pointsCost",
    "eligibilityConditions",
    "stock",
    "status",
    "expiresAt",
    "expiredHiddenFromYouth",
  ];
  for (const key of fields) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }
  if (patch.expiredVisibilityMode !== undefined) {
    allowed.expiredVisibilityMode = normalizeExpiredVisibilityMode(patch.expiredVisibilityMode);
  }
  if (patch.expiredVisibilityDays !== undefined) {
    allowed.expiredVisibilityDays = normalizeExpiredVisibilityDays(patch.expiredVisibilityDays);
  }
  if (
    patch.status === "expired" &&
    !isExpired(existing.expiresAt) &&
    String(existing.status || "active") !== "expired"
  ) {
    allowed.expiredAt = FieldValue.serverTimestamp();
  }
  if (patch.status !== undefined && String(patch.status || "") !== "expired") {
    allowed.expiredAt = null;
  }
  allowed.visibilityType = visibilityType;
  allowed.targetUserIds = targetUserIds;
  allowed.notificationsEnabled = notificationsEnabled;

  await ref.set(allowed, { merge: true });
  const updated = await ref.get();
  const updatedData = { id: ref.id, ...updated.data() } as AnyRecord;
  const nextStatus = String(updatedData.status || "active");
  const newlyTargetedUserIds = targetUserIds.filter(
    (uid) => !previousTargetUserIds.includes(uid)
  );
  const becameActive =
    String(existing.status || "active") !== "active" && nextStatus === "active";
  const notificationsJustEnabled =
    !Boolean(existing.notificationsEnabled) && notificationsEnabled;
  const recipientsToNotify =
    becameActive || notificationsJustEnabled || previousVisibilityType !== TARGETED_VOUCHER
      ? targetUserIds
      : newlyTargetedUserIds;

  if (
    visibilityType === TARGETED_VOUCHER &&
    notificationsEnabled &&
    nextStatus === "active" &&
    !isExpired(updatedData.expiresAt) &&
    recipientsToNotify.length > 0
  ) {
    await notifyTargetRecipients(recipientsToNotify, {
      id: ref.id,
      title: String(updatedData.title || ""),
      description: String(updatedData.description || ""),
    });
  }

  return (await attachTargetRecipientSummaries([
    normalizeVoucher(updatedData, { includeTargetUserIds: true }),
  ]))[0];
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
    if (!canUserAccessVoucher(v, uid)) {
      throw new Error("This voucher is not available to your account");
    }

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
      const userGroup = String(profile.youthAgeGroup || profile.ageGroup || "").toLowerCase();
      const reqGroup = String(cond.ageGroup).toLowerCase();
      if (userGroup !== reqGroup) {
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
  const voucherSnap = await db.collection("vouchers").doc(voucherId).get();
  if (!voucherSnap.exists) return null;

  const voucher = serializeRecord({ id: voucherSnap.id, ...voucherSnap.data() }) as AnyRecord;
  if (!canUserAccessVoucher(voucher, uid)) {
    return null;
  }

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
  const alreadyClaimed =
    Array.isArray(voucher.claimedBy) && voucher.claimedBy.includes(uid);
  if (!alreadyClaimed) return null;

  // Backfill: generate a token and create the missing voucherClaims document
  const token = await generateUniqueToken();
  const claimRef = db.collection("voucherClaims").doc();
  const claimData = {
    claimId: claimRef.id,
    uid,
    voucherId,
    voucherTitle: String(voucher.title || ""),
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
    voucherTitle: String(voucher.title || ""),
    status: "claimed",
    claimedAt: null,
    redeemedAt: null,
  };
}

// ─── REDEEM PREVIEW (admin/superadmin) ───────────────────────────────────────

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
  if (!voucherSnap.exists || !canUserAccessVoucher(voucher, String(claim.uid || ""))) {
    throw makeError("This voucher is no longer available to this youth member.", 403);
  }

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

  const voucherSnap = await db.collection("vouchers").doc(String(claim.voucherId || "")).get();
  if (
    !voucherSnap.exists ||
    !canUserAccessVoucher(voucherSnap.data() || {}, String(claim.uid || ""))
  ) {
    throw makeError("This voucher is no longer available to this youth member.", 403);
  }

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
