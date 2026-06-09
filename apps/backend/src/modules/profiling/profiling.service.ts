import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { createNotification } from "../notifications/notifications.service";

export async function submitProfiling(uid: string, data: Record<string, unknown>) {
  const normalizedData = normalizeProfilingData(data);

  await db.collection("kkProfiling").doc(uid).set({
    ...normalizedData,
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
  const normalizedData = normalizeProfilingData(data);
  await assertCanUpdateYearsInBarangay(uid, normalizedData);

  await db.collection("kkProfiling").doc(uid).update({
    ...normalizedData,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function normalizeProfilingData(data: Record<string, unknown>) {
  const normalizedData = { ...data };

  if ("contactNumber" in normalizedData) {
    normalizedData.contactNumber = normalizeProfileContactNumber(
      normalizedData.contactNumber
    );
  }

  if ("purok" in normalizedData) {
    normalizedData.purok = String(normalizedData.purok || "").trim();
  }

  if ("digitalIdEmergencyContactPhone" in normalizedData) {
    normalizedData.digitalIdEmergencyContactPhone = normalizeEmergencyContactPhone(
      normalizedData.digitalIdEmergencyContactPhone
    );
  }

  if ("kkAssemblyTimesAttended" in normalizedData) {
    normalizedData.kkAssemblyTimesAttended = normalizeNonNegativeInteger(
      normalizedData.kkAssemblyTimesAttended
    );
  }

  if ("yearsInBarangay" in normalizedData) {
    const yearsInBarangay = parseNonNegativeInteger(
      normalizedData.yearsInBarangay
    );
    if (yearsInBarangay === null) {
      delete normalizedData.yearsInBarangay;
    } else {
      normalizedData.yearsInBarangay = yearsInBarangay;
    }
  }

  return normalizedData;
}

async function assertCanUpdateYearsInBarangay(
  uid: string,
  normalizedData: Record<string, unknown>
) {
  if (!Object.prototype.hasOwnProperty.call(normalizedData, "yearsInBarangay")) {
    return;
  }

  const nextYears = parseNonNegativeInteger(normalizedData.yearsInBarangay);
  if (nextYears === null) {
    return;
  }

  const snap = await db.collection("kkProfiling").doc(uid).get();
  const existingYears = parseNonNegativeInteger(snap.data()?.yearsInBarangay);

  if (existingYears !== null && existingYears !== nextYears) {
    const error = new Error(
      "Years in Barangay can only be submitted once from the youth app. Contact SK admin if this value needs correction."
    ) as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }
}

function normalizeEmergencyContactPhone(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function normalizeProfileContactNumber(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function normalizeNonNegativeInteger(value: unknown) {
  return parseNonNegativeInteger(value) ?? 0;
}

function parseNonNegativeInteger(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}
