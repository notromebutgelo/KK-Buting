import { db } from "../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { generateIdNumber } from "../../../utils/generateIdNumber";
import { storage } from "../../config/firebase";
import { randomUUID } from "crypto";
import { generateQrToken } from "../../../utils/renerateQrToken";

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

function computeQueueStatus(profile: Record<string, any>, documents: Record<string, any>[]) {
  const explicitStatus = String(profile.verificationQueueStatus || "");
  if (explicitStatus) return explicitStatus;
  if (profile.status === "verified") return "verified";
  if (profile.status === "rejected") return "rejected";
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
  if (!data.verified || data.digitalIdStatus !== "active") {
    return { status: data.digitalIdStatus || "not_verified" };
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
    digitalIdStatus: data.digitalIdStatus,
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
  await db.collection("kkProfiling").doc(uid).set(
    {
      documentsSubmitted: true,
      submittedAt: FieldValue.serverTimestamp(),
      status: "pending",
      verified: false,
      verificationQueueStatus: "pending",
      verificationResubmissionMessage: null,
      verificationRejectReason: null,
      verificationRejectNote: null,
    },
    { merge: true }
  );
}

export async function uploadDocumentFromBase64(
  uid: string,
  docType: string,
  fileData: string
) {
  const match = fileData.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid file data format");
  }

  const mimeType = match[1];
  const base64Payload = match[2];
  const extension = mimeType.split("/")[1] || "jpg";
  const filePath = `verification-documents/${uid}/${docType}-${Date.now()}.${extension}`;
  const downloadToken = randomUUID();

  try {
    const bucket = storage.bucket();
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
    if (error?.message?.includes("bucket does not exist")) {
      // Fallback for local/dev setups where Firebase Storage is not provisioned yet.
      await uploadDocument(uid, docType, fileData);
      return fileData;
    }
    throw error;
  }
}
