import { db } from "../../config/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { generateIdNumber } from "../../../utils/generateIdNumber";

type AnyRecord = Record<string, any>;
type YouthListSortKey = "fullName" | "createdAt" | "verificationStatus" | "ageGroup";

interface YouthMemberFilters {
  search?: string;
  verificationStatus?: string;
  profilingStatus?: string;
  ageGroup?: string;
  gender?: string;
  purok?: string;
  archiveScope?: string;
  dateFrom?: string;
  dateTo?: string;
  sortKey?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

interface VerificationQueueFilters {
  search?: string;
  ageGroup?: string;
  documentType?: string;
  dateSubmitted?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

const DOCUMENT_LABELS: Record<string, string> = {
  certificate_of_residency: "Certificate of Residency",
  school_id: "School ID",
  proof_of_voter_registration: "Proof of Voter Registration",
  valid_government_id: "Valid Government ID",
  id_photo: "ID Photo",
};

const REQUIRED_DOCUMENTS_BY_GROUP: Record<string, string[]> = {
  "Early Youth (15-17)": ["certificate_of_residency", "school_id", "id_photo"],
  "Late Youth (18-24)": ["proof_of_voter_registration", "valid_government_id", "id_photo"],
  "Young Adult (25-30)": ["proof_of_voter_registration", "valid_government_id", "id_photo"],
};

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

function normalizeString(value: any) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeProfilePayload(data: Record<string, unknown>) {
  const allowedKeys = [
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "birthday",
    "age",
    "gender",
    "civilStatus",
    "contactNumber",
    "region",
    "province",
    "city",
    "barangay",
    "purok",
    "yearsInBarangay",
    "youthAgeGroup",
    "educationalBackground",
    "youthClassification",
    "workStatus",
    "registeredSkVoter",
    "votedLastSkElections",
    "registeredNationalVoter",
    "attendedKkAssembly",
    "kkAssemblyTimesAttended",
  ];

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowedKeys.includes(key))
  );
}

function getDocumentLabel(type: string) {
  return DOCUMENT_LABELS[type] || type.split("_").join(" ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRequiredDocumentTypes(profile: AnyRecord) {
  const ageGroup = String(profile?.youthAgeGroup || "");
  return REQUIRED_DOCUMENTS_BY_GROUP[ageGroup] || ["valid_government_id", "id_photo"];
}

function normalizeDocumentStatus(document: AnyRecord) {
  return String(
    document.reviewStatus ||
      document.status ||
      document.documentStatus ||
      "pending"
  );
}

function getLatestDocumentsByType(documents: AnyRecord[]) {
  const latestByType = new Map<string, AnyRecord>();

  for (const document of [...documents].sort((a, b) =>
    String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || ""))
  )) {
    const type = String(document.documentType || "");
    if (type && !latestByType.has(type)) {
      latestByType.set(type, document);
    }
  }

  return latestByType;
}

function computeQueueStatus(profile: AnyRecord, documents: AnyRecord[]) {
  const finalStatus = String(profile?.status || "pending");
  if (finalStatus === "verified") return "verified";
  if (finalStatus === "rejected") return "rejected";

  if (documents.some((document) => normalizeDocumentStatus(document) === "resubmission_requested")) {
    return "resubmission_requested";
  }

  if (
    documents.some((document) =>
      ["approved", "rejected"].includes(normalizeDocumentStatus(document))
    )
  ) {
    return "in_review";
  }

  return "pending";
}

function buildVerificationDocuments(profile: AnyRecord, rawDocuments: AnyRecord[]) {
  const latestByType = getLatestDocumentsByType(rawDocuments);
  const requiredTypes = getRequiredDocumentTypes(profile);
  const idPhotoSource =
    latestByType.get("id_photo") ||
    latestByType.get("valid_government_id") ||
    latestByType.get("school_id");

  const requiredDocuments = requiredTypes.map((type) => {
    const source = latestByType.get(type);
    return {
      id: source?.id || `required-${type}`,
      documentType: type,
      label: getDocumentLabel(type),
      fileUrl: source?.fileUrl || null,
      uploadedAt: source?.uploadedAt,
      reviewStatus: source ? normalizeDocumentStatus(source) : "missing",
      reviewNote: source?.reviewNote || null,
      reviewRequestedAt: source?.reviewRequestedAt,
      reviewedAt: source?.reviewedAt,
      reviewedBy: source?.reviewedBy,
      required: true,
      present: Boolean(source),
    };
  });

  const supplementalDocuments = [...latestByType.values()]
    .filter((document) => !requiredTypes.includes(String(document.documentType || "")))
    .map((document) => ({
      id: document.id,
      documentType: String(document.documentType || ""),
      label: getDocumentLabel(String(document.documentType || "")),
      fileUrl: document.fileUrl || null,
      uploadedAt: document.uploadedAt,
      reviewStatus: normalizeDocumentStatus(document),
      reviewNote: document.reviewNote || null,
      reviewRequestedAt: document.reviewRequestedAt,
      reviewedAt: document.reviewedAt,
      reviewedBy: document.reviewedBy,
      required: false,
      present: true,
    }));

  return {
    requiredDocuments,
    supplementalDocuments,
    missingDocuments: requiredDocuments.filter((document) => !document.present),
    idPhotoPreviewUrl: idPhotoSource?.fileUrl || null,
  };
}

async function getUsersAndProfiles() {
  const [usersSnap, profilesSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("kkProfiling").get(),
  ]);

  const users: AnyRecord[] = usersSnap.docs.map((doc) =>
    serializeRecord({ uid: doc.id, ...doc.data() })
  );
  const profiles: AnyRecord[] = profilesSnap.docs.map((doc) =>
    serializeRecord({ userId: doc.id, ...doc.data() })
  );
  const profileMap = new Map<string, AnyRecord>(
    profiles.map((profile) => [String(profile.userId), profile])
  );

  return { users, profiles, profileMap };
}

export async function getDashboardStats() {
  const [
    { users, profiles, profileMap },
    rewardsSnap,
    merchantsSnap,
    transactionsSnap,
    documentsSnap,
  ] = await Promise.all([
    getUsersAndProfiles(),
    db.collection("rewards").get(),
    db.collection("merchants").get(),
    db.collection("transactions").orderBy("createdAt", "desc").limit(50).get(),
    db.collection("documents").orderBy("uploadedAt", "desc").limit(50).get(),
  ]);

  const members: AnyRecord[] = users.map((user) => ({
    ...user,
    profile: profileMap.get(user.uid),
    status: profileMap.get(user.uid)?.status,
  }));

  const recentMembers = [...members]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 8);

  const approvedMerchants = merchantsSnap.docs.filter((doc) => doc.data().status === "approved").length;
  const pendingMerchants = merchantsSnap.docs.filter((doc) => doc.data().status === "pending").length;
  const archivedUsers = members.filter((member) => {
    const profile = member.profile || {};
    const numericAge = Number(profile.age);
    if (!Number.isNaN(numericAge) && numericAge > 30) return true;
    if (profile.birthday) {
      const birthday = new Date(profile.birthday);
      if (!Number.isNaN(birthday.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
          age -= 1;
        }
        return age > 30;
      }
    }
    return false;
  }).length;

  const completedProfiles = profiles.filter((profile) => Boolean(profile.submittedAt)).length;
  const incompleteProfiles = Math.max(users.length - completedProfiles, 0);
  const profilingCompletionRate = users.length
    ? Math.round((completedProfiles / users.length) * 100)
    : 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactionDocs: AnyRecord[] = transactionsSnap.docs.map((doc) =>
    serializeRecord({ id: doc.id, ...doc.data() })
  );
  const pointsEarnTransactions = transactionDocs.filter((transaction) => transaction.type === "earn");
  const pointsAwardedToday = pointsEarnTransactions
    .filter((transaction) => new Date(String(transaction.createdAt)) >= startOfToday)
    .reduce((sum, transaction) => sum + Number(transaction.points || 0), 0);
  const pointsAwardedThisWeek = pointsEarnTransactions
    .filter((transaction) => new Date(String(transaction.createdAt)) >= startOfWeek)
    .reduce((sum, transaction) => sum + Number(transaction.points || 0), 0);
  const pointsAwardedThisMonth = pointsEarnTransactions
    .filter((transaction) => new Date(String(transaction.createdAt)) >= startOfMonth)
    .reduce((sum, transaction) => sum + Number(transaction.points || 0), 0);

  const ageGroups = [
    "Early Youth (15-17)",
    "Late Youth (18-24)",
    "Young Adult (25-30)",
  ].map((label) => ({
    name: label,
    value: profiles.filter((profile) => profile.youthAgeGroup === label).length,
  }));

  const genderMap = new Map<string, number>();
  for (const profile of profiles) {
    const key = String(profile.gender || "Unspecified");
    genderMap.set(key, (genderMap.get(key) || 0) + 1);
  }
  const genderSplit = [...genderMap.entries()].map(([name, value]) => ({ name, value }));

  const merchantMap = new Map<string, AnyRecord>(
    merchantsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() })])
  );
  const userMap = new Map<string, AnyRecord>(users.map((user) => [String(user.uid), user]));

  const registrationActivities = users.map((user) => ({
    id: `registration-${user.uid}`,
    type: "registration",
    title: "New registration",
    description: `${user.UserName || user.email || "A user"} joined the system`,
    timestamp: user.createdAt,
  }));

  const verificationActivities = profiles
    .filter((profile) => profile.verificationActionAt)
    .map((profile) => ({
      id: `verification-${profile.userId}`,
      type: "verification",
      title:
        profile.status === "verified"
          ? "Profile verified"
          : profile.status === "rejected"
            ? "Profile rejected"
            : "Verification updated",
      description: `${profile.firstName || "User"} ${profile.lastName || ""}`.trim(),
      timestamp: profile.verificationActionAt,
      status: profile.status,
    }));

  const documentActivities = documentsSnap.docs.map((doc) => {
    const record: AnyRecord = serializeRecord({ id: doc.id, ...doc.data() });
    const user = userMap.get(String(record.profileId || ""));
    return {
      id: `document-${record.id}`,
      type: "document",
      title: "Verification document submitted",
      description: `${user?.UserName || user?.email || "A member"} uploaded ${String(
        record.documentType || "a document"
      ).split("_").join(" ")}`,
      timestamp: record.uploadedAt,
    };
  });

  const transactionActivities = transactionDocs.map((transaction) => {
    const merchant = merchantMap.get(String(transaction.merchantId || ""));
    const user = userMap.get(String(transaction.userId || ""));
    return {
      id: `transaction-${transaction.id}`,
      type: "transaction",
      title: transaction.type === "redeem" ? "Reward redeemed" : "Points awarded",
      description: `${user?.UserName || user?.email || "Member"} at ${merchant?.name || "merchant"} • ${Number(
        transaction.points || 0
      )} pts`,
      timestamp: transaction.createdAt,
      status: transaction.type,
    };
  });

  const recentActivity = [
    ...verificationActivities,
    ...documentActivities,
    ...transactionActivities,
    ...registrationActivities,
  ]
    .filter((activity) => Boolean(activity.timestamp))
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
    .slice(0, 10);

  return {
    totalUsers: users.length,
    profileSubmitted: profiles.filter((profile) => profile.submittedAt).length,
    pending: profiles.filter((profile) => profile.status === "pending").length,
    verified: profiles.filter((profile) => profile.status === "verified").length,
    rejected: profiles.filter((profile) => profile.status === "rejected").length,
    archivedUsers,
    profilingCompletionRate,
    incompleteProfiles,
    verificationQueue: profiles.filter((profile) => profile.status === "pending").length,
    pointsActivity: {
      today: pointsAwardedToday,
      thisWeek: pointsAwardedThisWeek,
      thisMonth: pointsAwardedThisMonth,
    },
    merchantStats: {
      approved: approvedMerchants,
      pending: pendingMerchants,
      total: merchantsSnap.size,
    },
    demographics: {
      ageGroups,
      genderSplit,
    },
    totalRewards: rewardsSnap.size,
    totalMerchants: merchantsSnap.size,
    recentMembers,
    recentActivity,
  };
}

export async function getVerificationProfiles(filters: VerificationQueueFilters = {}) {
  const [{ users, profileMap }, documentsSnap] = await Promise.all([
    getUsersAndProfiles(),
    db.collection("documents").get(),
  ]);

  const documentMap = new Map<string, AnyRecord[]>();
  for (const doc of documentsSnap.docs) {
    const document = serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord;
    const profileId = String(document.profileId || "");
    if (!documentMap.has(profileId)) {
      documentMap.set(profileId, []);
    }
    documentMap.get(profileId)!.push(document);
  }

  const search = normalizeString(filters.search);
  const ageGroup = String(filters.ageGroup || "").trim();
  const documentType = String(filters.documentType || "").trim();
  const queueStatus = normalizeString(filters.status);
  const dateSubmitted = filters.dateSubmitted ? new Date(filters.dateSubmitted) : null;
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 12, 1), 100);
  const page = Math.max(Number(filters.page) || 1, 1);

  const profiles = users
    .filter((user) => user.role === "youth")
    .map((user) => {
      const profile = profileMap.get(user.uid) || {};
      const documents = documentMap.get(String(user.uid)) || [];
      const documentSummary = buildVerificationDocuments(profile, documents);
      const computedQueueStatus = computeQueueStatus(profile, documents);
      const submittedAt = String(profile.submittedAt || "");
      return {
        userId: user.uid,
        fullName: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" "),
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || user.email || "",
        contactNumber: profile.contactNumber || "",
        city: profile.city || "",
        province: profile.province || "",
        barangay: profile.barangay || "",
        age: Number(profile.age || 0) || null,
        youthAgeGroup: profile.youthAgeGroup || "",
        status: profile.status || "pending",
        queueStatus: computedQueueStatus,
        submittedAt,
        idPhotoUrl: documentSummary.idPhotoPreviewUrl,
        requiredDocuments: documentSummary.requiredDocuments,
        missingDocuments: documentSummary.missingDocuments,
        documentCounts: {
          approved: documentSummary.requiredDocuments.filter((document) => document.reviewStatus === "approved").length,
          pending: documentSummary.requiredDocuments.filter((document) => document.reviewStatus === "pending").length,
          rejected: documentSummary.requiredDocuments.filter((document) => document.reviewStatus === "rejected").length,
          resubmissionRequested: documentSummary.requiredDocuments.filter(
            (document) => document.reviewStatus === "resubmission_requested"
          ).length,
        },
      };
    })
    .filter(
      (profile) =>
        profile.requiredDocuments.some((document) => document.present) ||
        profile.documentCounts.approved > 0 ||
        profile.documentCounts.pending > 0 ||
        profile.documentCounts.rejected > 0 ||
        profile.documentCounts.resubmissionRequested > 0 ||
        profile.status === "verified" ||
        profile.status === "rejected"
    )
    .filter((profile) => {
      const matchesSearch =
        !search ||
        normalizeString(profile.fullName).includes(search) ||
        normalizeString(profile.email).includes(search) ||
        normalizeString(profile.contactNumber).includes(search) ||
        normalizeString(profile.city).includes(search);
      const matchesAgeGroup = !ageGroup || ageGroup === "all" ? true : profile.youthAgeGroup === ageGroup;
      const matchesDocumentType =
        !documentType || documentType === "all"
          ? true
          : profile.requiredDocuments.some((document) => document.documentType === documentType);
      const matchesStatus =
        !queueStatus || queueStatus === "all" ? true : normalizeString(profile.queueStatus) === queueStatus;
      const matchesDate =
        !dateSubmitted
          ? true
          : (() => {
              const submittedDate = profile.submittedAt ? new Date(profile.submittedAt) : null;
              return submittedDate
                ? submittedDate.toDateString() === dateSubmitted.toDateString()
                : false;
            })();

      return matchesSearch && matchesAgeGroup && matchesDocumentType && matchesStatus && matchesDate;
    })
    .sort((a, b) => String(a.submittedAt || "").localeCompare(String(b.submittedAt || "")));

  const total = profiles.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const records = profiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const ageGroupOptions = Array.from(
    new Set(
      profiles
        .map((profile) => String(profile.youthAgeGroup || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  const documentTypeOptions = Array.from(
    new Set(
      profiles.flatMap((profile) => profile.requiredDocuments.map((document) => document.documentType))
    )
  );

  return {
    profiles: records,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
    filters: {
      ageGroupOptions,
      documentTypeOptions,
    },
    summary: {
      total,
      pending: profiles.filter((profile) => profile.queueStatus === "pending").length,
      inReview: profiles.filter((profile) => profile.queueStatus === "in_review").length,
      resubmissionRequested: profiles.filter((profile) => profile.queueStatus === "resubmission_requested").length,
    },
  };
}

export async function getVerificationProfile(userId: string) {
  const [profileSnap, userSnap, documentsSnap] = await Promise.all([
    db.collection("kkProfiling").doc(userId).get(),
    db.collection("users").doc(userId).get(),
    db.collection("documents").where("profileId", "==", userId).get(),
  ]);

  if (!profileSnap.exists) return null;

  const profile: AnyRecord = serializeRecord({ userId, ...profileSnap.data() });
  const user: AnyRecord = userSnap.exists ? serializeRecord({ uid: userSnap.id, ...userSnap.data() }) : {};
  const documents = documentsSnap.docs
    .map((doc) => serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord)
    .sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")));
  const documentSummary = buildVerificationDocuments(profile, documents);
  const queueStatus = computeQueueStatus(profile, documents);

  return {
    ...profile,
    email: profile.email || user.email || "",
    fullName: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" "),
    queueStatus,
    documents: documents.map((document) => ({
      id: document.id,
      documentType: String(document.documentType || ""),
      label: getDocumentLabel(String(document.documentType || "")),
      fileUrl: document.fileUrl || null,
      uploadedAt: document.uploadedAt,
      reviewStatus: normalizeDocumentStatus(document),
      reviewNote: document.reviewNote || null,
      reviewRequestedAt: document.reviewRequestedAt,
      reviewedAt: document.reviewedAt,
      reviewedBy: document.reviewedBy,
      required: getRequiredDocumentTypes(profile).includes(String(document.documentType || "")),
    })),
    requiredDocuments: documentSummary.requiredDocuments,
    supplementalDocuments: documentSummary.supplementalDocuments,
    missingDocuments: documentSummary.missingDocuments,
    idPhotoUrl: documentSummary.idPhotoPreviewUrl,
  };
}

export async function approveVerification(userId: string, adminEmail: string) {
  const verificationProfile = await getVerificationProfile(userId);
  if (!verificationProfile) {
    throw new Error("Profile not found");
  }

  const hasMissingRequiredDocuments = verificationProfile.requiredDocuments.some(
    (document: AnyRecord) => !document.present
  );
  if (hasMissingRequiredDocuments) {
    throw new Error("Required documents are still missing");
  }

  const hasUnapprovedRequiredDocuments = verificationProfile.requiredDocuments.some(
    (document: AnyRecord) => document.reviewStatus !== "approved"
  );
  if (hasUnapprovedRequiredDocuments) {
    throw new Error("All required documents must be approved before verification");
  }

  await db.collection("kkProfiling").doc(userId).set(
    {
      verified: true,
      status: "verified",
      verificationQueueStatus: "verified",
      verifiedAt: FieldValue.serverTimestamp(),
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
      verificationLastAction: "approved",
      verificationRejectReason: null,
      verificationRejectNote: null,
      verificationResubmissionMessage: null,
    },
    { merge: true }
  );
}

export async function rejectVerification(
  userId: string,
  adminEmail: string,
  reason: string,
  note?: string
) {
  await db.collection("kkProfiling").doc(userId).set(
    {
      verified: false,
      status: "rejected",
      verificationQueueStatus: "rejected",
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
      verificationLastAction: "rejected",
      verificationRejectReason: reason,
      verificationRejectNote: note || null,
    },
    { merge: true }
  );
}

export async function reviewVerificationDocument(
  userId: string,
  documentId: string,
  action: "approved" | "rejected",
  adminEmail: string,
  note?: string
) {
  const documentRef = db.collection("documents").doc(documentId);
  const documentSnap = await documentRef.get();

  if (!documentSnap.exists) {
    throw new Error("Document not found");
  }

  const document = documentSnap.data() as AnyRecord;
  if (String(document.profileId || "") !== userId) {
    throw new Error("Document does not belong to this profile");
  }

  await documentRef.set(
    {
      reviewStatus: action,
      reviewNote: note || null,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: adminEmail,
      reviewRequestedAt: null,
    },
    { merge: true }
  );

  await db.collection("kkProfiling").doc(userId).set(
    {
      verificationQueueStatus: action === "rejected" ? "in_review" : "in_review",
      verificationLastAction: "document_reviewed",
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
    },
    { merge: true }
  );
}

export async function requestVerificationResubmission(
  userId: string,
  documentIds: string[],
  message: string,
  adminEmail: string
) {
  if (!documentIds.length) {
    throw new Error("At least one document must be selected");
  }

  const batch = db.batch();
  const documents = await Promise.all(documentIds.map((documentId) => db.collection("documents").doc(documentId).get()));

  for (const documentSnap of documents) {
    if (!documentSnap.exists) {
      throw new Error("One or more documents were not found");
    }

    const document = documentSnap.data() as AnyRecord;
    if (String(document.profileId || "") !== userId) {
      throw new Error("One or more documents do not belong to this profile");
    }

    batch.set(
      documentSnap.ref,
      {
        reviewStatus: "resubmission_requested",
        reviewNote: message,
        reviewRequestedAt: FieldValue.serverTimestamp(),
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminEmail,
      },
      { merge: true }
    );
  }

  batch.set(
    db.collection("kkProfiling").doc(userId),
    {
      verified: false,
      status: "pending",
      verificationQueueStatus: "resubmission_requested",
      verificationResubmissionMessage: message,
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
      verificationLastAction: "resubmission_requested",
      verificationRejectReason: null,
      verificationRejectNote: null,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function bulkApproveVerifications(userIds: string[], adminEmail: string) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const approved: string[] = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const userId of uniqueIds) {
    try {
      await approveVerification(userId, adminEmail);
      approved.push(userId);
    } catch (error: any) {
      failed.push({ userId, error: error.message || "Approval failed" });
    }
  }

  return {
    approved,
    failed,
  };
}

export async function getAllRewards() {
  const [rewardsSnap, merchantsSnap] = await Promise.all([
    db.collection("rewards").get(),
    db.collection("merchants").get(),
  ]);
  const merchantMap = new Map<string, AnyRecord>(
    merchantsSnap.docs.map((doc) => [
      doc.id,
      serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord,
    ])
  );

  return rewardsSnap.docs.map((doc) => {
    const reward: AnyRecord = serializeRecord({ id: doc.id, ...doc.data() });
    const merchant = merchantMap.get(String(reward.merchantId || ""));
    return {
      ...reward,
      merchantName: merchant?.name || "Unknown Merchant",
    };
  });
}

export async function createReward(data: Record<string, unknown>) {
  const ref = await db.collection("rewards").add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getMerchants(status?: string) {
  const snap = status
    ? await db.collection("merchants").where("status", "==", status).get()
    : await db.collection("merchants").get();

  const ownerIds = snap.docs.map((doc) => String(doc.data().ownerId || "")).filter(Boolean);
  const ownerDocs = await Promise.all(
    [...new Set(ownerIds)].map(async (ownerId) => {
      const userSnap = await db.collection("users").doc(ownerId).get();
      return userSnap.exists ? serializeRecord({ uid: userSnap.id, ...userSnap.data() }) : null;
    })
  );
  const ownerMap = new Map<string, AnyRecord>(
    ownerDocs.filter(Boolean).map((owner) => [String(owner!.uid), owner as AnyRecord])
  );

  const merchants: AnyRecord[] = snap.docs.map((doc) => {
    const merchant: AnyRecord = serializeRecord({ id: doc.id, ...doc.data() });
    const owner = ownerMap.get(String(merchant.ownerId || ""));
    return {
      ...merchant,
      ownerEmail: owner?.email,
      ownerName: owner?.UserName,
    };
  });

  return merchants;
}

export async function getMerchantDetails(merchantId: string) {
  const merchants = await getMerchants();
  return merchants.find((merchant) => merchant.id === merchantId) || null;
}

export async function getPendingMerchants() {
  return getMerchants("pending");
}

export async function approveMerchant(merchantId: string) {
  await db.collection("merchants").doc(merchantId).update({
    status: "approved",
    approvedAt: FieldValue.serverTimestamp(),
  });
}

export async function getYouthMembers(filters: YouthMemberFilters = {}) {
  const [{ users, profileMap }, pointsSnap] = await Promise.all([
    getUsersAndProfiles(),
    db.collection("points").get(),
  ]);
  const pointsMap = new Map<string, AnyRecord>(
    pointsSnap.docs.map((doc) => [
      doc.id,
      serializeRecord({ userId: doc.id, ...doc.data() }) as AnyRecord,
    ])
  );

  const members: AnyRecord[] = users
    .filter((user) => user.role === "youth")
    .map((user) => ({
      ...user,
      profile: profileMap.get(user.uid),
      fullName: [
        profileMap.get(user.uid)?.firstName,
        profileMap.get(user.uid)?.middleName,
        profileMap.get(user.uid)?.lastName,
      ]
        .filter(Boolean)
        .join(" "),
      idNumber: profileMap.get(user.uid)?.idNumber || null,
      age: Number(profileMap.get(user.uid)?.age || 0) || null,
      barangay: profileMap.get(user.uid)?.barangay || null,
      purok: profileMap.get(user.uid)?.purok || null,
      contactNumber: profileMap.get(user.uid)?.contactNumber || null,
      gender: profileMap.get(user.uid)?.gender || null,
      ageGroup: profileMap.get(user.uid)?.youthAgeGroup || null,
      profilingStatus: profileMap.get(user.uid)?.submittedAt ? "completed" : "incomplete",
      verificationStatus:
        profileMap.get(user.uid)?.documentsSubmitted
          ? profileMap.get(user.uid)?.status || "pending"
          : "not_submitted",
      isArchived: Boolean(profileMap.get(user.uid)?.archived),
      points: pointsMap.get(user.uid)
        ? {
            totalPoints: Number(pointsMap.get(user.uid)?.balance || 0),
            earnedPoints: Number(
              pointsMap.get(user.uid)?.earnedPoints || pointsMap.get(user.uid)?.balance || 0
            ),
            redeemedPoints: Number(pointsMap.get(user.uid)?.redeemedPoints || 0),
          }
        : { totalPoints: 0, earnedPoints: 0, redeemedPoints: 0 },
    }));

  const search = normalizeString(filters.search);
  const verificationStatus = normalizeString(filters.verificationStatus);
  const profilingStatus = normalizeString(filters.profilingStatus);
  const ageGroup = String(filters.ageGroup || "").trim();
  const gender = String(filters.gender || "").trim();
  const purok = String(filters.purok || "").trim();
  const archiveScope = normalizeString(filters.archiveScope) || "active";
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
  const sortKey = (["fullName", "createdAt", "verificationStatus", "ageGroup"].includes(
    String(filters.sortKey)
  )
    ? filters.sortKey
    : "createdAt") as YouthListSortKey;
  const sortDir = filters.sortDir === "asc" ? "asc" : "desc";
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 10, 1), 100);
  const page = Math.max(Number(filters.page) || 1, 1);

  const filteredMembers = members.filter((member) => {
    const joinedDate = member.createdAt ? new Date(member.createdAt) : null;
    const matchesSearch =
      !search ||
      normalizeString(member.fullName).includes(search) ||
      normalizeString(member.UserName).includes(search) ||
      normalizeString(member.email).includes(search) ||
      normalizeString(member.contactNumber).includes(search) ||
      normalizeString(member.idNumber).includes(search);
    const matchesVerification =
      !verificationStatus || verificationStatus === "all"
        ? true
        : normalizeString(member.verificationStatus) === verificationStatus;
    const matchesProfiling =
      !profilingStatus || profilingStatus === "all"
        ? true
        : normalizeString(member.profilingStatus) === profilingStatus;
    const matchesAgeGroup = !ageGroup || ageGroup === "all" ? true : member.ageGroup === ageGroup;
    const matchesGender = !gender || gender === "all" ? true : member.gender === gender;
    const matchesPurok = !purok || purok === "all" ? true : member.purok === purok;
    const matchesArchive =
      archiveScope === "all" ||
      (archiveScope === "active" && !member.isArchived) ||
      (archiveScope === "archived" && member.isArchived);
    const matchesFrom =
      !dateFrom ||
      (joinedDate && !Number.isNaN(joinedDate.getTime()) && joinedDate >= dateFrom);
    const matchesTo =
      !dateTo ||
      (joinedDate && !Number.isNaN(joinedDate.getTime()) && joinedDate <= dateTo);

    return (
      matchesSearch &&
      matchesVerification &&
      matchesProfiling &&
      matchesAgeGroup &&
      matchesGender &&
      matchesPurok &&
      matchesArchive &&
      matchesFrom &&
      matchesTo
    );
  });

  filteredMembers.sort((a, b) => {
    const getValue = (member: AnyRecord) => {
      if (sortKey === "fullName") return member.fullName || member.UserName || "";
      if (sortKey === "verificationStatus") return member.verificationStatus || "";
      if (sortKey === "ageGroup") return member.ageGroup || "";
      return member.createdAt || "";
    };

    const aVal = String(getValue(a));
    const bVal = String(getValue(b));
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const total = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const usersPage = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const purokOptions = Array.from(
    new Set(
      members
        .map((member) => String(member.purok || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return {
    users: usersPage,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
    filters: {
      purokOptions,
    },
    summary: {
      filteredMembers: total,
      verified: filteredMembers.filter((member) => member.verificationStatus === "verified").length,
      pending: filteredMembers.filter((member) => member.verificationStatus === "pending").length,
      archived: filteredMembers.filter((member) => member.isArchived).length,
    },
  };
}

export async function getYouthMember(userId: string) {
  const member = (await getYouthMembers({ archiveScope: "all", pageSize: 5000 })).users.find(
    (entry) => entry.uid === userId
  );
  if (!member) return null;

  const [documentsSnap, transactionsSnap, rewardsSnap] = await Promise.all([
    db.collection("documents").where("profileId", "==", userId).get(),
    db.collection("transactions").where("userId", "==", userId).get(),
    db.collection("rewards").get(),
  ]);

  const rewardsMap = new Map<string, AnyRecord>(
    rewardsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord])
  );

  const documents: AnyRecord[] = documentsSnap.docs
    .map((doc) => serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord)
    .sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")))
    .map((doc) => ({
      ...doc,
      status:
        member.profile?.status === "verified"
          ? "approved"
          : member.profile?.status === "rejected"
            ? "rejected"
            : "pending",
    }));

  const transactions: AnyRecord[] = transactionsSnap.docs
    .map((doc) => serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const pointsHistory = transactions.map((transaction) => ({
    ...transaction,
    direction:
      transaction.type === "redeem" || Number(transaction.points || 0) < 0 ? "deduct" : "add",
    pointsDelta:
      transaction.type === "redeem" || Number(transaction.points || 0) < 0
        ? -Math.abs(Number(transaction.points || 0))
        : Math.abs(Number(transaction.points || 0)),
  }));

  const redemptions = transactions
    .filter((transaction) => transaction.type === "redeem")
    .map((transaction) => {
      const reward = rewardsMap.get(String(transaction.rewardId || ""));
      return {
        id: transaction.id,
        rewardId: transaction.rewardId,
        rewardTitle: reward?.title || transaction.rewardTitle || "Reward",
        pointsUsed: Math.abs(Number(transaction.points || 0)),
        status: transaction.redemptionStatus || "claimed",
        redeemedAt: transaction.createdAt,
      };
    });

  return {
    ...member,
    documents,
    pointsHistory,
    redemptions,
  };
}

export async function updateYouthMemberProfile(
  userId: string,
  data: Record<string, unknown>,
  adminEmail: string
) {
  const profilePayload = sanitizeProfilePayload(data);
  const nextUserName = [profilePayload.firstName, profilePayload.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  await db.collection("kkProfiling").doc(userId).set(
    {
      ...profilePayload,
      updatedAt: FieldValue.serverTimestamp(),
      profileUpdatedAt: FieldValue.serverTimestamp(),
      profileUpdatedBy: adminEmail,
    },
    { merge: true }
  );

  if (nextUserName) {
    await db.collection("users").doc(userId).set(
      {
        UserName: nextUserName,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function updateYouthVerificationStatus(
  userId: string,
  status: "pending" | "verified" | "rejected",
  adminEmail: string,
  reason?: string,
  note?: string
) {
  const payload: AnyRecord = {
    status,
    verified: status === "verified",
    verificationActionAt: FieldValue.serverTimestamp(),
    verificationActionBy: adminEmail,
    verificationLastAction: status,
    verificationRejectReason: status === "rejected" ? reason || null : null,
    verificationRejectNote: status === "rejected" ? note || null : null,
  };

  if (status === "verified") {
    payload.verifiedAt = FieldValue.serverTimestamp();
  }

  if (status === "pending") {
    payload.verifiedAt = null;
  }

  await db.collection("kkProfiling").doc(userId).set(payload, { merge: true });
}

export async function archiveYouthMember(userId: string, adminEmail: string, note?: string) {
  await db.collection("kkProfiling").doc(userId).set(
    {
      archived: true,
      archivedAt: FieldValue.serverTimestamp(),
      archivedBy: adminEmail,
      archiveNote: note || null,
    },
    { merge: true }
  );
}

export async function adjustYouthPoints(
  userId: string,
  amount: number,
  reason: string,
  adminEmail: string
) {
  const pointsRef = db.collection("points").doc(userId);

  await db.runTransaction(async (transaction) => {
    const pointsSnap = await transaction.get(pointsRef);
    const currentBalance = Number(pointsSnap.data()?.balance || 0);
    const currentEarned = Number(pointsSnap.data()?.earnedPoints || currentBalance || 0);
    const currentRedeemed = Number(pointsSnap.data()?.redeemedPoints || 0);
    const nextBalance = currentBalance + amount;

    if (nextBalance < 0) {
      throw new Error("Point adjustment would make the balance negative");
    }

    transaction.set(
      pointsRef,
      {
        balance: nextBalance,
        earnedPoints: amount > 0 ? currentEarned + amount : currentEarned,
        redeemedPoints: amount < 0 ? currentRedeemed + Math.abs(amount) : currentRedeemed,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await db.collection("transactions").add({
    userId,
    type: "adjustment",
    points: amount,
    reason,
    adjustedBy: adminEmail,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getDigitalIds() {
  const members = await getDigitalIdMembers({ pageSize: 5000, status: "all" });
  return members.members;
}

export async function getDigitalIdMembers(filters: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { users: members } = await getYouthMembers({ archiveScope: "all", pageSize: 5000 });
  const search = normalizeString(filters.search);
  const status = normalizeString(filters.status) || "all";
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 12, 1), 100);
  const page = Math.max(Number(filters.page) || 1, 1);

  const digitalIds: AnyRecord[] = members
    .filter((member) => member.profile?.status === "verified" || member.profile?.digitalIdStatus)
    .map((member) => {
      const digitalIdStatus = String(
        member.profile?.digitalIdStatus ||
          (member.profile?.idNumber ? "active" : "draft")
      );
      return {
        uid: member.uid,
        UserName: member.UserName,
        email: member.email,
        firstName: member.profile?.firstName,
        lastName: member.profile?.lastName,
        fullName: [member.profile?.firstName, member.profile?.lastName].filter(Boolean).join(" "),
        youthAgeGroup: member.profile?.youthAgeGroup,
        city: member.profile?.city,
        province: member.profile?.province,
        barangay: member.profile?.barangay,
        verifiedAt: member.profile?.verifiedAt,
        memberId: member.profile?.idNumber,
        digitalIdStatus,
        digitalIdRevision: Number(member.profile?.digitalIdRevision || 1),
        digitalIdGeneratedAt: member.profile?.digitalIdGeneratedAt,
        digitalIdApprovedAt: member.profile?.digitalIdApprovedAt,
        digitalIdDeactivatedAt: member.profile?.digitalIdDeactivatedAt,
        hasDigitalId: digitalIdStatus === "active",
        profilePhotoUrl:
          member.profile?.photoUrl ||
          member.profile?.idPhotoUrl ||
          null,
      };
    })
    .filter((member) => {
      const matchesSearch =
        !search ||
        normalizeString(member.fullName).includes(search) ||
        normalizeString(member.email).includes(search) ||
        normalizeString(member.memberId).includes(search);
      const matchesStatus = status === "all" ? true : normalizeString(member.digitalIdStatus) === status;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) =>
      String(b.digitalIdApprovedAt || b.digitalIdGeneratedAt || b.verifiedAt || "").localeCompare(
        String(a.digitalIdApprovedAt || a.digitalIdGeneratedAt || a.verifiedAt || "")
      )
    );

  const total = digitalIds.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  return {
    members: digitalIds.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
    summary: {
      draft: digitalIds.filter((member) => member.digitalIdStatus === "draft").length,
      pendingApproval: digitalIds.filter((member) => member.digitalIdStatus === "pending_approval").length,
      active: digitalIds.filter((member) => member.digitalIdStatus === "active").length,
      deactivated: digitalIds.filter((member) => member.digitalIdStatus === "deactivated").length,
    },
  };
}

export async function getDigitalIdMember(userId: string) {
  const member = (await getDigitalIdMembers({ pageSize: 5000, status: "all" })).members.find(
    (entry) => entry.uid === userId
  );
  if (!member) return null;

  const [profileSnap, documentsSnap] = await Promise.all([
    db.collection("kkProfiling").doc(userId).get(),
    db.collection("documents").where("profileId", "==", userId).get(),
  ]);

  const profile = profileSnap.data() || {};
  const documents = documentsSnap.docs
    .map((doc) => serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord)
    .sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")));

  return {
    ...member,
    profile: serializeRecord({ userId, ...profile }),
    photoUrl:
      documents.find((document) => String(document.documentType || "") === "id_photo")?.fileUrl ||
      documents[0]?.fileUrl ||
      null,
  };
}

export async function generateDigitalIdDraft(userId: string, adminEmail: string) {
  const profileRef = db.collection("kkProfiling").doc(userId);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new Error("Profile not found");
  }

  const profile = profileSnap.data() as AnyRecord;
  if (profile.status !== "verified" && profile.verified !== true) {
    throw new Error("Only verified profiles can receive a digital ID");
  }

  const memberId = profile.idNumber || generateIdNumber(userId);
  await profileRef.set(
    {
      idNumber: memberId,
      digitalIdStatus: "draft",
      digitalIdGeneratedAt: FieldValue.serverTimestamp(),
      digitalIdGeneratedBy: adminEmail,
      digitalIdRevision: Number(profile.digitalIdRevision || 1),
    },
    { merge: true }
  );

  return memberId;
}

export async function submitDigitalIdForApproval(userId: string, adminEmail: string) {
  await db.collection("kkProfiling").doc(userId).set(
    {
      digitalIdStatus: "pending_approval",
      digitalIdApprovalRequestedAt: FieldValue.serverTimestamp(),
      digitalIdApprovalRequestedBy: adminEmail,
    },
    { merge: true }
  );
}

export async function approveDigitalId(userId: string, adminEmail: string) {
  await db.collection("kkProfiling").doc(userId).set(
    {
      digitalIdStatus: "active",
      digitalIdApprovedAt: FieldValue.serverTimestamp(),
      digitalIdApprovedBy: adminEmail,
      digitalIdDeactivatedAt: null,
      digitalIdDeactivatedBy: null,
      digitalIdDeactivationReason: null,
    },
    { merge: true }
  );
}

export async function deactivateDigitalId(userId: string, adminEmail: string, reason?: string) {
  await db.collection("kkProfiling").doc(userId).set(
    {
      digitalIdStatus: "deactivated",
      digitalIdDeactivatedAt: FieldValue.serverTimestamp(),
      digitalIdDeactivatedBy: adminEmail,
      digitalIdDeactivationReason: reason || null,
    },
    { merge: true }
  );
}

export async function regenerateDigitalId(userId: string, adminEmail: string) {
  const profileRef = db.collection("kkProfiling").doc(userId);
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists) {
    throw new Error("Profile not found");
  }

  const profile = profileSnap.data() as AnyRecord;
  const nextRevision = Number(profile.digitalIdRevision || 1) + 1;
  const memberId = generateIdNumber(`${userId}-${nextRevision}`);

  await profileRef.set(
    {
      idNumber: memberId,
      digitalIdStatus: "draft",
      digitalIdRevision: nextRevision,
      digitalIdGeneratedAt: FieldValue.serverTimestamp(),
      digitalIdGeneratedBy: adminEmail,
      digitalIdApprovedAt: null,
      digitalIdApprovedBy: null,
      digitalIdApprovalRequestedAt: null,
      digitalIdApprovalRequestedBy: null,
      digitalIdDeactivatedAt: null,
      digitalIdDeactivatedBy: null,
      digitalIdDeactivationReason: null,
    },
    { merge: true }
  );

  return memberId;
}

export async function getReports() {
  const { profiles } = await getUsersAndProfiles();

  const countBy = (key: string) => {
    const counts = new Map<string, number>();

    for (const profile of profiles) {
      const value = String(profile[key] || "Unknown");
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  };

  const monthly = new Map<string, { month: string; registered: number; verified: number }>();

  for (const profile of profiles) {
    const submittedAt = toIso(profile.submittedAt);
    const verifiedAt = toIso(profile.verifiedAt);

    if (submittedAt) {
      const month = new Date(submittedAt).toLocaleString("en-US", { month: "short" });
      const current = monthly.get(month) || { month, registered: 0, verified: 0 };
      current.registered += 1;
      monthly.set(month, current);
    }

    if (verifiedAt) {
      const month = new Date(verifiedAt).toLocaleString("en-US", { month: "short" });
      const current = monthly.get(month) || { month, registered: 0, verified: 0 };
      current.verified += 1;
      monthly.set(month, current);
    }
  }

  return {
    byAgeGroup: countBy("youthAgeGroup"),
    byStatus: countBy("status"),
    byClassification: countBy("youthClassification"),
    byEducation: countBy("educationalBackground"),
    monthlySummary: [...monthly.values()],
  };
}
