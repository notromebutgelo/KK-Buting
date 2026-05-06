import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { generateIdNumber } from "../../../utils/generateIdNumber";
import { storage } from "../../config/firebase";
import { randomUUID } from "crypto";
import { generateQrToken } from "../../../utils/renerateQrToken";
import { createNotificationsForRoles } from "../notifications/notifications.service";

const REQUIRED_DOCUMENTS_BY_GROUP: Record<string, string[]> = {
  "Child Youth": ["certificate_of_residency", "school_id", "id_photo"],
  "Core Youth": ["proof_of_voter_registration", "valid_government_id", "id_photo"],
  "Adult Youth": ["proof_of_voter_registration", "valid_government_id", "id_photo"],
};

const DOCUMENT_LABELS: Record<string, string> = {
  certificate_of_residency: "Certificate of Residency",
  school_id: "School ID",
  proof_of_voter_registration: "Proof of Voter Registration",
  valid_government_id: "Valid Government ID",
  id_photo: "ID Photo",
};

const INLINE_DOCUMENT_LIMIT = 350_000;
const PENDING_SUPERADMIN_ID_GENERATION = "pending_superadmin_id_generation";

function toIso(value: any) {
  if (!value) return undefined;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

function normalizeYouthAgeGroup(ageGroup?: string) {
  const value = String(ageGroup || "").trim();

  if (["Early Youth (15-17)", "Child Youth", "Child Youth (15-17)"].includes(value)) {
    return "Child Youth";
  }

  if (["Late Youth (18-24)", "Core Youth", "Core Youth (18-24)"].includes(value)) {
    return "Core Youth";
  }

  if (["Young Adult", "Young Adult (25-30)", "Adult Youth", "Adult Youth (25-30)"].includes(value)) {
    return "Adult Youth";
  }

  return value;
}

function normalizeOptionalString(value: any) {
  return String(value || "").trim();
}

function hasIssuedDigitalId(profile: Record<string, any>) {
  return Boolean(
    profile?.digitalIdGeneratedAt ||
      profile?.digitalIdGeneratedBy ||
      profile?.digitalIdApprovedAt ||
      profile?.digitalIdApprovedBy
  );
}

function resolveDigitalIdStatus(profile: Record<string, any>) {
  const rawStatus = normalizeOptionalString(profile?.digitalIdStatus);

  if (rawStatus === "active" && !hasIssuedDigitalId(profile)) {
    return Boolean(profile?.verified) || String(profile?.status || "").trim() === "verified"
      ? "pending_approval"
      : "draft";
  }

  if (rawStatus) {
    return rawStatus;
  }

  if (Boolean(profile?.verified) || String(profile?.status || "").trim() === "verified") {
    return "pending_approval";
  }

  return "not_verified";
}

function hasCompleteEmergencyContact(profile: Record<string, any>) {
  return Boolean(
    normalizeOptionalString(profile.digitalIdEmergencyContactName) &&
      normalizeOptionalString(profile.digitalIdEmergencyContactRelationship) &&
      normalizeOptionalString(profile.digitalIdEmergencyContactPhone)
  );
}

function hasDigitalIdSignature(profile: Record<string, any>) {
  return Boolean(normalizeOptionalString(profile.digitalIdSignatureUrl));
}

function parseBase64FileData(fileData: string) {
  const match = fileData.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid file data format");
  }

  return {
    mimeType: match[1],
    base64Payload: match[2],
  };
}

function extractStorageFileLocation(url: string) {
  try {
    const parsed = new URL(url);
    const bucketMatch = parsed.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!bucketMatch) return null;

    return {
      bucketName: decodeURIComponent(bucketMatch[1]),
      filePath: decodeURIComponent(bucketMatch[2]),
    };
  } catch {
    return null;
  }
}

async function deleteStoredFileFromUrl(url?: string | null) {
  const normalizedUrl = normalizeOptionalString(url);
  if (!normalizedUrl || normalizedUrl.startsWith("data:")) {
    return;
  }

  const location = extractStorageFileLocation(normalizedUrl);
  if (!location) {
    return;
  }

  try {
    await storage
      .bucket(location.bucketName)
      .file(location.filePath)
      .delete({ ignoreNotFound: true });
  } catch {
    // Ignore cleanup failures so the new signature can still be saved.
  }
}

function getRequiredDocumentTypes(ageGroup?: string) {
  const normalizedAgeGroup = normalizeYouthAgeGroup(ageGroup);

  return REQUIRED_DOCUMENTS_BY_GROUP[normalizedAgeGroup] || [
    "proof_of_voter_registration",
    "valid_government_id",
    "id_photo",
  ];
}

function getDocumentLabel(type: string) {
  return DOCUMENT_LABELS[type] || type.split("_").join(" ");
}

function normalizeDocumentStatus(document: Record<string, any>) {
  return String(document.reviewStatus || document.status || "pending");
}

function getDocumentBucketCandidates() {
  const primaryBucketName = storage.bucket().name;
  const candidates = [primaryBucketName];

  if (primaryBucketName.endsWith(".appspot.com")) {
    candidates.push(primaryBucketName.replace(/\.appspot\.com$/, ".firebasestorage.app"));
  } else if (primaryBucketName.endsWith(".firebasestorage.app")) {
    candidates.push(primaryBucketName.replace(/\.firebasestorage\.app$/, ".appspot.com"));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function computeQueueStatus(profile: Record<string, any>, documents: Record<string, any>[]) {
  const explicitStatus = String(profile.verificationQueueStatus || "");
  if (explicitStatus) return explicitStatus;
  if (profile.status === "verified") return "verified";
  if (profile.status === "rejected") return "rejected";
  if (profile.verificationReferredToSuperadminAt || profile.digitalIdApprovalRequestedAt) {
    return PENDING_SUPERADMIN_ID_GENERATION;
  }
  if (documents.some((document) => normalizeDocumentStatus(document) === "resubmission_requested")) {
    return "resubmission_requested";
  }
  if (documents.length > 0) return "pending";
  return "not_submitted";
}

export async function getDigitalId(uid: string) {
  const profileSnap = await db.collection("kkProfiling").doc(uid).get();
  if (!profileSnap.exists) return null;
  const data = profileSnap.data()!;
  const documentsSnap = await db.collection("documents").where("profileId", "==", uid).get();
  const photoDocument = documentsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, any>)
    .sort((a, b) => String(toIso(b.uploadedAt) || "").localeCompare(String(toIso(a.uploadedAt) || "")))
    .find((document) =>
      ["id_photo", "valid_government_id", "school_id"].includes(String(document.documentType || ""))
    );
  const resolvedDigitalIdStatus = resolveDigitalIdStatus(data);

  if (!data.verified || resolvedDigitalIdStatus !== "active") {
    return {
      status: resolvedDigitalIdStatus,
      digitalIdStatus: resolvedDigitalIdStatus,
      verified: Boolean(data.verified),
    };
  }
  const idNumber = data.idNumber || generateIdNumber(uid);
  const revision = Number(data.digitalIdRevision || 1);
  const qrToken = generateQrToken(uid, revision);
  const qrPayload = JSON.stringify({
    digitalIdNumber: idNumber,
    uid,
    token: qrToken,
  });
  return {
    status: "verified",
    idNumber,
    memberId: idNumber,
    qrCode: qrPayload,
    qrPayload,
    qrToken,
    firstName: data.firstName,
    lastName: data.lastName,
    middleName: data.middleName,
    birthday: data.birthday,
    address: `${data.barangay}, ${data.city}, ${data.province}`,
    photoUrl: photoDocument?.fileUrl || null,
    verifiedAt: data.verifiedAt,
    digitalIdStatus: resolvedDigitalIdStatus,
    digitalIdEmergencyContactName: normalizeOptionalString(data.digitalIdEmergencyContactName),
    digitalIdEmergencyContactRelationship: normalizeOptionalString(
      data.digitalIdEmergencyContactRelationship
    ),
    digitalIdEmergencyContactPhone: normalizeOptionalString(data.digitalIdEmergencyContactPhone),
    digitalIdEmergencyContactComplete: hasCompleteEmergencyContact(data),
    digitalIdSignatureUrl: normalizeOptionalString(data.digitalIdSignatureUrl) || null,
    digitalIdSignatureSignedAt: toIso(data.digitalIdSignatureSignedAt) || null,
    digitalIdSignatureComplete: hasDigitalIdSignature(data),
  };
}

export async function getMyVerificationStatus(uid: string) {
  const [profileSnap, userSnap, documentsSnap] = await Promise.all([
    db.collection("kkProfiling").doc(uid).get(),
    db.collection("users").doc(uid).get(),
    db.collection("documents").where("profileId", "==", uid).get(),
  ]);

  if (!profileSnap.exists && !userSnap.exists) return null;

  const profile = profileSnap.exists ? profileSnap.data() || {} : {};
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const rawDocuments: Record<string, any>[] = documentsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, any>)
    .sort((a, b) => String(toIso(b.uploadedAt) || "").localeCompare(String(toIso(a.uploadedAt) || "")));

  const latestByType = new Map<string, Record<string, any>>();
  for (const document of rawDocuments) {
    const type = String(document.documentType || "");
    if (type && !latestByType.has(type)) {
      latestByType.set(type, document);
    }
  }

  const requiredTypes = getRequiredDocumentTypes(profile.youthAgeGroup);
  const requiredDocuments = requiredTypes.map((type) => {
    const source = latestByType.get(type);
    return {
      id: source?.id || `required-${type}`,
      documentType: type,
      label: getDocumentLabel(type),
      fileUrl: source?.fileUrl || null,
      uploadedAt: toIso(source?.uploadedAt),
      reviewStatus: source ? normalizeDocumentStatus(source) : "missing",
      reviewNote: source?.reviewNote || null,
      present: Boolean(source),
      required: true,
    };
  });

  const documents = rawDocuments.map((document) => ({
    id: document.id,
    documentType: String(document.documentType || ""),
    label: getDocumentLabel(String(document.documentType || "")),
    fileUrl: document.fileUrl || null,
    uploadedAt: toIso(document.uploadedAt),
    reviewStatus: normalizeDocumentStatus(document),
    reviewNote: document.reviewNote || null,
    required: requiredTypes.includes(String(document.documentType || "")),
  }));

  const queueStatus = computeQueueStatus(profile, rawDocuments);

  return {
    id: uid,
    userId: uid,
    email: profile.email || user.email || "",
    status: profile.status || "pending",
    digitalIdStatus: resolveDigitalIdStatus(profile),
    verified: Boolean(profile.verified),
    verifiedAt: toIso(profile.verifiedAt),
    submittedAt: toIso(profile.submittedAt),
    documentsSubmitted: Boolean(profile.documentsSubmitted || rawDocuments.length > 0),
    verificationQueueStatus: queueStatus,
    verificationResubmissionMessage: profile.verificationResubmissionMessage || null,
    verificationRejectReason: profile.verificationRejectReason || null,
    verificationRejectNote: profile.verificationRejectNote || null,
    firstName: profile.firstName || "",
    middleName: profile.middleName || "",
    lastName: profile.lastName || "",
    birthday: profile.birthday || "",
    age: profile.age || null,
    gender: profile.gender || "",
    contactNumber: profile.contactNumber || "",
    region: profile.region || "",
    province: profile.province || "",
    city: profile.city || "",
    barangay: profile.barangay || "",
    purok: profile.purok || "",
    civilStatus: profile.civilStatus || "",
    youthAgeGroup: normalizeYouthAgeGroup(profile.youthAgeGroup) || "",
    educationalBackground: profile.educationalBackground || "",
    youthClassification: profile.youthClassification || "",
    workStatus: profile.workStatus || "",
    digitalIdEmergencyContactName: normalizeOptionalString(
      profile.digitalIdEmergencyContactName
    ),
    digitalIdEmergencyContactRelationship: normalizeOptionalString(
      profile.digitalIdEmergencyContactRelationship
    ),
    digitalIdEmergencyContactPhone: normalizeOptionalString(
      profile.digitalIdEmergencyContactPhone
    ),
    digitalIdEmergencyContactComplete: hasCompleteEmergencyContact(profile),
    digitalIdSignatureUrl: normalizeOptionalString(profile.digitalIdSignatureUrl) || null,
    digitalIdSignatureSignedAt: toIso(profile.digitalIdSignatureSignedAt) || null,
    digitalIdSignatureComplete: hasDigitalIdSignature(profile),
    registeredSkVoter: profile.registeredSkVoter,
    votedLastSkElections: profile.votedLastSkElections,
    registeredNationalVoter: profile.registeredNationalVoter,
    attendedKkAssembly: profile.attendedKkAssembly,
    kkAssemblyTimesAttended: profile.kkAssemblyTimesAttended,
    idPhotoUrl:
      latestByType.get("id_photo")?.fileUrl ||
      latestByType.get("valid_government_id")?.fileUrl ||
      latestByType.get("school_id")?.fileUrl ||
      null,
    documents,
    requiredDocuments,
    missingDocuments: requiredDocuments.filter((document) => !document.present),
  };
}

export async function uploadDocument(uid: string, docType: string, fileUrl: string) {
  const profileRef = db.collection("kkProfiling").doc(uid);
  const [profileSnap, existingDocumentsSnap, userSnap] = await Promise.all([
    profileRef.get(),
    db.collection("documents").where("profileId", "==", uid).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const profile = profileSnap.exists ? profileSnap.data() || {} : {};
  const existingDocuments = existingDocumentsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() || {}),
  })) as Record<string, any>[];
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const requiredTypes = getRequiredDocumentTypes(profile.youthAgeGroup);
  const hadAllRequiredDocuments = requiredTypes.every((type) =>
    existingDocuments.some((document) => String(document.documentType || "") === type)
  );
  const previousQueueStatus = computeQueueStatus(profile, existingDocuments);

  await db.collection("documents").add({
    profileId: uid,
    documentType: docType,
    fileUrl,
    reviewStatus: "pending",
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewRequestedAt: null,
    uploadedAt: FieldValue.serverTimestamp(),
  });

  await profileRef.set(
    {
      documentsSubmitted: true,
      submittedAt: FieldValue.serverTimestamp(),
      status: "pending",
      verified: false,
      verificationQueueStatus: "pending",
      verificationResubmissionMessage: null,
      verificationRejectReason: null,
      verificationRejectNote: null,
      digitalIdApprovalRequestedAt: null,
      digitalIdApprovalRequestedBy: null,
      verificationReferredToSuperadminAt: null,
      verificationReferredToSuperadminBy: null,
      verificationDocumentsApprovedAt: null,
      verificationDocumentsApprovedBy: null,
    },
    { merge: true }
  );

  const hasAllRequiredDocuments =
    hadAllRequiredDocuments ||
    requiredTypes.every((type) =>
      type === docType ||
      existingDocuments.some((document) => String(document.documentType || "") === type)
    );
  const shouldNotifyAdmins =
    previousQueueStatus === "resubmission_requested" ||
    previousQueueStatus === "rejected" ||
    (!hadAllRequiredDocuments && hasAllRequiredDocuments);

  if (shouldNotifyAdmins) {
    const fullName = [profile.firstName, profile.middleName, profile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const label = fullName || user.UserName || user.email || "A youth member";

    await createNotificationsForRoles(["admin", "superadmin"], {
      audience: "admin",
      type: "info",
      title: "Verification ready for review",
      body: `${label} uploaded verification documents and is ready for admin review.`,
      link: "/verification",
      metadata: {
        userId: uid,
        documentType: docType,
      },
    });
  }
}

export async function uploadDocumentFromBase64(
  uid: string,
  docType: string,
  fileData: string
) {
  const { mimeType, base64Payload } = parseBase64FileData(fileData);
  const extension = mimeType.split("/")[1] || "jpg";
  const filePath = `verification-documents/${uid}/${docType}-${Date.now()}.${extension}`;
  const downloadToken = randomUUID();
  let lastError: Error | null = null;

  for (const bucketName of getDocumentBucketCandidates()) {
    try {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(filePath);

      await file.save(Buffer.from(base64Payload, "base64"), {
        metadata: {
          contentType: mimeType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        resumable: false,
      });

      const signedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        filePath
      )}?alt=media&token=${downloadToken}`;

      await uploadDocument(uid, docType, signedUrl);

      return signedUrl;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error || "Upload failed"));

      if (!String(error?.message || "").includes("bucket does not exist")) {
        throw error;
      }
    }
  }

  if (fileData.length <= INLINE_DOCUMENT_LIMIT) {
    await uploadDocument(uid, docType, fileData);
    return fileData;
  }

  throw new Error(
    "Firebase Storage is not available for document uploads, and this image is too large for the safe inline fallback. Enable the configured storage bucket or upload a smaller image."
  );
}

export async function uploadDigitalIdSignatureFromBase64(uid: string, fileData: string) {
  const profileRef = db.collection("kkProfiling").doc(uid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new Error("Complete your KK profiling before adding a digital ID signature.");
  }

  const profile = profileSnap.data() || {};
  const previousSignatureUrl = normalizeOptionalString(profile.digitalIdSignatureUrl);
  const { mimeType, base64Payload } = parseBase64FileData(fileData);
  const extension = mimeType.split("/")[1] || "png";
  const filePath = `digital-id-signatures/${uid}/signature-${Date.now()}.${extension}`;
  const downloadToken = randomUUID();
  let nextSignatureUrl = "";

  for (const bucketName of getDocumentBucketCandidates()) {
    try {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(filePath);

      await file.save(Buffer.from(base64Payload, "base64"), {
        metadata: {
          contentType: mimeType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        resumable: false,
      });

      nextSignatureUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        filePath
      )}?alt=media&token=${downloadToken}`;
      break;
    } catch (error: any) {
      if (!String(error?.message || "").includes("bucket does not exist")) {
        throw error;
      }
    }
  }

  if (!nextSignatureUrl) {
    if (fileData.length > INLINE_DOCUMENT_LIMIT) {
      throw new Error(
        "Firebase Storage is not available for signature uploads, and this image is too large for the safe inline fallback. Enable the configured storage bucket and try again."
      );
    }

    nextSignatureUrl = fileData;
  }

  await profileRef.set(
    {
      digitalIdSignatureUrl: nextSignatureUrl,
      digitalIdSignatureSignedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (previousSignatureUrl && previousSignatureUrl !== nextSignatureUrl) {
    await deleteStoredFileFromUrl(previousSignatureUrl);
  }

  return nextSignatureUrl;
}
