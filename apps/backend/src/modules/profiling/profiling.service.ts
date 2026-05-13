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

  return normalizedData;
}

function normalizeEmergencyContactPhone(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function normalizeProfileContactNumber(value: unknown) {
  return String(value || "")
    .replace(/[^\d+()\-\s]/g, "")
    .trim();
}
