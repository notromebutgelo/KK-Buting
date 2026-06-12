import { randomBytes } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { auth, db } from "../../config/firebase";
import { createAdminTemporaryPasswordPolicy } from "../auth/adminPasswordPolicy.service";

type AnyRecord = Record<string, any>;

export type AdminAccountStatus = "active" | "disabled";

export interface CreateAdminAccountInput {
  email: string;
  displayName: string;
}

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

function serializeAdminAccount(id: string, data: AnyRecord) {
  return {
    uid: String(data.uid || id),
    email: String(data.email || ""),
    displayName: String(data.UserName || data.displayName || data.email || "Admin"),
    role: String(data.role || ""),
    status: String(data.adminStatus || data.accountStatus || (data.disabled ? "disabled" : "active")),
    createdAt: toIso(data.createdAt) || null,
    updatedAt: toIso(data.updatedAt) || null,
    disabledAt: toIso(data.disabledAt) || null,
    disabledBy: data.disabledBy || null,
    enabledAt: toIso(data.enabledAt) || null,
    enabledBy: data.enabledBy || null,
    temporaryPasswordIssuedAt: toIso(data.temporaryPasswordIssuedAt) || null,
    temporaryPasswordIssuedBy: data.temporaryPasswordIssuedBy || null,
  };
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%";
  const bytes = randomBytes(18);
  let password = "Kk";

  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }

  password += symbols[bytes[0] % symbols.length];
  password += String(10 + (bytes[1] % 89));
  return password;
}

export async function listAdminAccounts() {
  const snap = await db.collection("users").where("role", "==", "admin").get();
  const accounts = snap.docs
    .map((doc) => serializeAdminAccount(doc.id, doc.data() || {}))
    .sort((a, b) => String(a.email).localeCompare(String(b.email)));

  return { accounts };
}

export async function createAdminAccount(
  input: CreateAdminAccountInput,
  actorEmail: string
) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim() || email.split("@")[0] || "Admin";
  const temporaryPassword = generateTemporaryPassword();

  const userRecord = await auth.createUser({
    email,
    password: temporaryPassword,
    displayName,
    emailVerified: true,
    disabled: false,
  });

  await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });
  await createAdminTemporaryPasswordPolicy(userRecord.uid, temporaryPassword);

  await db.collection("users").doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email,
      UserName: displayName,
      role: "admin",
      adminStatus: "active",
      accountStatus: "active",
      createdBy: actorEmail,
      temporaryPasswordIssuedAt: FieldValue.serverTimestamp(),
      temporaryPasswordIssuedBy: actorEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    account: {
      uid: userRecord.uid,
      email,
      displayName,
      role: "admin",
      status: "active" as const,
    },
    temporaryPassword,
  };
}

export async function resetAdminTemporaryPassword(
  uid: string,
  actorEmail: string
) {
  const userSnap = await db.collection("users").doc(uid).get();
  const data = userSnap.data() || {};

  if (!userSnap.exists || String(data.role || "") !== "admin") {
    throw new Error("Admin account not found");
  }

  const temporaryPassword = generateTemporaryPassword();
  const displayName = String(data.UserName || data.displayName || data.email || "Admin");

  await auth.updateUser(uid, {
    password: temporaryPassword,
    displayName,
  });
  await auth.setCustomUserClaims(uid, { role: "admin" });
  await createAdminTemporaryPasswordPolicy(uid, temporaryPassword);

  await userSnap.ref.set(
    {
      temporaryPasswordIssuedAt: FieldValue.serverTimestamp(),
      temporaryPasswordIssuedBy: actorEmail,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { temporaryPassword };
}

export async function updateAdminAccountStatus(
  uid: string,
  status: AdminAccountStatus,
  actor: { uid: string; email: string }
) {
  if (uid === actor.uid && status === "disabled") {
    throw new Error("You cannot disable your own admin account.");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const data = userSnap.data() || {};

  if (!userSnap.exists || String(data.role || "") !== "admin") {
    throw new Error("Admin account not found");
  }

  await auth.updateUser(uid, { disabled: status === "disabled" });
  await auth.setCustomUserClaims(uid, { role: "admin" });

  await userSnap.ref.set(
    {
      adminStatus: status,
      accountStatus: status,
      disabled: status === "disabled",
      updatedAt: FieldValue.serverTimestamp(),
      ...(status === "disabled"
        ? {
            disabledAt: FieldValue.serverTimestamp(),
            disabledBy: actor.email,
          }
        : {
            enabledAt: FieldValue.serverTimestamp(),
            enabledBy: actor.email,
          }),
    },
    { merge: true }
  );

  const nextSnap = await userSnap.ref.get();
  return serializeAdminAccount(uid, nextSnap.data() || {});
}
