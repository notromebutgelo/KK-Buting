import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";

const scrypt = promisify(scryptCallback);
const ADMIN_SECURITY_COLLECTION = "adminSecurity";
const HASH_KEY_LENGTH = 64;

type AdminSecurityRecord = {
  uid: string;
  mustChangePassword?: boolean;
  temporaryPasswordHash?: string;
  temporaryPasswordSalt?: string;
  temporaryPasswordIssuedAt?: FirebaseFirestore.FieldValue | string | null;
  lastTemporaryPasswordMatchAt?: FirebaseFirestore.FieldValue | string | null;
  passwordChangedAt?: FirebaseFirestore.FieldValue | string | null;
  updatedAt?: FirebaseFirestore.FieldValue | string | null;
};

async function hashPassword(password: string, salt: string) {
  const derivedKey = (await scrypt(password, salt, HASH_KEY_LENGTH)) as Buffer;
  return derivedKey.toString("hex");
}

async function buildTemporaryPasswordRecord(uid: string, password: string): Promise<AdminSecurityRecord> {
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);

  return {
    uid,
    mustChangePassword: true,
    temporaryPasswordSalt: salt,
    temporaryPasswordHash: hash,
    temporaryPasswordIssuedAt: FieldValue.serverTimestamp(),
    passwordChangedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function createAdminTemporaryPasswordPolicy(uid: string, password: string) {
  const record = await buildTemporaryPasswordRecord(uid, password);
  await db.collection(ADMIN_SECURITY_COLLECTION).doc(uid).set(record, { merge: true });
}

async function getAdminSecurityRecord(uid: string) {
  const snap = await db.collection(ADMIN_SECURITY_COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as AdminSecurityRecord;
}

async function doesPasswordMatchTemporaryPassword(password: string, record: AdminSecurityRecord) {
  const hash = String(record.temporaryPasswordHash || "");
  const salt = String(record.temporaryPasswordSalt || "");

  if (!hash || !salt) {
    return false;
  }

  const computedHash = await hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computedHash, "hex"));
}

export async function syncAdminPasswordRequirement(uid: string, password: string) {
  const record = await getAdminSecurityRecord(uid);

  if (!record || record.mustChangePassword === false) {
    return false;
  }

  const matchesTemporaryPassword = await doesPasswordMatchTemporaryPassword(password, record);
  const nextMustChangePassword = matchesTemporaryPassword;

  if (record.mustChangePassword !== nextMustChangePassword) {
    await db.collection(ADMIN_SECURITY_COLLECTION).doc(uid).set(
      {
        mustChangePassword: nextMustChangePassword,
        updatedAt: FieldValue.serverTimestamp(),
        ...(matchesTemporaryPassword
          ? { lastTemporaryPasswordMatchAt: FieldValue.serverTimestamp() }
          : { passwordChangedAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );
  }

  return nextMustChangePassword;
}

export async function getAdminPasswordRequirement(uid: string) {
  const record = await getAdminSecurityRecord(uid);
  return Boolean(record?.mustChangePassword);
}

export async function markAdminPasswordChanged(uid: string) {
  await db.collection(ADMIN_SECURITY_COLLECTION).doc(uid).set(
    {
      mustChangePassword: false,
      passwordChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
