import { db, auth } from "../../config/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { generateIdNumber } from "../../../utils/generateIdNumber";
import { setUserRole } from "../auth/user.service";
import { createMerchantTemporaryPasswordPolicy } from "../auth/merchantPasswordPolicy.service";
import { getMerchantById } from "../merchants/merhcants.service";
import {
  createNotification,
  createNotificationsForRoles,
} from "../notifications/notifications.service";

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
  "Child Youth": ["certificate_of_residency", "school_id", "id_photo"],
  "Core Youth": ["proof_of_voter_registration", "valid_government_id", "id_photo"],
  "Adult Youth": ["proof_of_voter_registration", "valid_government_id", "id_photo"],
};

const PENDING_SUPERADMIN_ID_GENERATION = "pending_superadmin_id_generation";
const NOTIFICATION_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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

function omitUndefined<T extends AnyRecord>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function normalizeString(value: any) {
  return String(value || "").trim().toLowerCase();
}

function normalizeOptionalString(value: any) {
  return String(value || "").trim();
}

function formatNotificationDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return NOTIFICATION_DATE_FORMATTER.format(date);
}

function buildDigitalIdGenerationNotification({
  userId,
  memberName,
  memberEmail,
  approvedBy,
  referredBy,
  approvedAt,
  referredAt,
  isReminder = false,
}: {
  userId: string;
  memberName: string;
  memberEmail?: string;
  approvedBy: string;
  referredBy: string;
  approvedAt: string;
  referredAt: string;
  isReminder?: boolean;
}) {
  const displayName = memberName || memberEmail || "A verified youth member";
  const title = isReminder
    ? `Reminder: ${displayName} is waiting for Digital ID generation`
    : `Digital ID generation requested for ${displayName}`;

  const body = isReminder
    ? `${displayName}'s documents were already approved. ${referredBy} resent the Digital ID generation request on ${formatNotificationDateTime(
        referredAt
      )}. The member is still waiting in the superadmin issuance queue.`
    : `${displayName}'s documents were approved by ${approvedBy} on ${formatNotificationDateTime(
        approvedAt
      )} and referred by ${referredBy} on ${formatNotificationDateTime(
        referredAt
      )}. The member is now waiting for Digital ID generation.`;

  return {
    audience: "admin" as const,
    type: "info" as const,
    title,
    body,
    link: `/digital-ids?member=${userId}`,
    metadata: {
      notificationKind: isReminder
        ? "digital_id_generation_reminder"
        : "digital_id_generation_request",
      userId,
      memberName: displayName,
      memberEmail: memberEmail || null,
      approvedBy,
      referredBy,
      approvedAt,
      referredAt,
      verificationStatus: "verified",
      queueStatus: PENDING_SUPERADMIN_ID_GENERATION,
    },
  };
}

function hasIssuedDigitalId(profile: AnyRecord) {
  return Boolean(
    profile?.digitalIdGeneratedAt ||
      profile?.digitalIdGeneratedBy ||
      profile?.digitalIdApprovedAt ||
      profile?.digitalIdApprovedBy
  );
}

function resolveDigitalIdStatus(profile: AnyRecord) {
  const rawStatus = String(profile?.digitalIdStatus || "").trim();

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

  return String(profile?.idNumber || "").trim() ? "draft" : "";
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

function hasCompleteEmergencyContact(profile: AnyRecord) {
  return Boolean(
    normalizeOptionalString(profile?.digitalIdEmergencyContactName) &&
      normalizeOptionalString(profile?.digitalIdEmergencyContactRelationship) &&
      normalizeOptionalString(profile?.digitalIdEmergencyContactPhone)
  );
}

function hasDigitalIdSignature(profile: AnyRecord) {
  return Boolean(normalizeOptionalString(profile?.digitalIdSignatureUrl));
}

function assertCompleteEmergencyContact(profile: AnyRecord) {
  if (hasCompleteEmergencyContact(profile)) {
    return;
  }

  throw new Error(
    "Emergency contact is required before generating or activating a digital ID."
  );
}

function assertCompleteDigitalIdSignature(profile: AnyRecord) {
  if (hasDigitalIdSignature(profile)) {
    return;
  }

  throw new Error(
    "A saved member signature is required before generating or activating a digital ID."
  );
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
    "digitalIdEmergencyContactName",
    "digitalIdEmergencyContactRelationship",
    "digitalIdEmergencyContactPhone",
  ];

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowedKeys.includes(key))
  );
}

function getDocumentLabel(type: string) {
  return DOCUMENT_LABELS[type] || type.split("_").join(" ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRequiredDocumentTypes(profile: AnyRecord) {
  const ageGroup = normalizeYouthAgeGroup(profile?.youthAgeGroup);
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

function hasAllRequiredDocumentsApproved(profile: AnyRecord, documents: AnyRecord[]) {
  const latestByType = getLatestDocumentsByType(documents);
  const requiredTypes = getRequiredDocumentTypes(profile);

  return requiredTypes.every((type) => {
    const document = latestByType.get(type);
    if (!document) {
      return false;
    }

    return normalizeDocumentStatus(document) === "approved";
  });
}

function computeQueueStatus(profile: AnyRecord, documents: AnyRecord[]) {
  const finalStatus = String(profile?.status || "pending");
  if (finalStatus === "rejected") return "rejected";

  if (
    (finalStatus === "verified" && profile?.verificationReferredToSuperadminAt) ||
    (finalStatus === "verified" && profile?.digitalIdApprovalRequestedAt) ||
    (finalStatus === "verified" &&
      resolveDigitalIdStatus(profile) === "pending_approval" &&
      hasAllRequiredDocumentsApproved(profile, documents))
  ) {
    return PENDING_SUPERADMIN_ID_GENERATION;
  }

  if (finalStatus === "verified") return "verified";

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
    "Child Youth",
    "Core Youth",
    "Adult Youth",
  ].map((label) => ({
    name: label,
    value: profiles.filter((profile) => normalizeYouthAgeGroup(profile.youthAgeGroup) === label).length,
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
        digitalIdStatus: resolveDigitalIdStatus(profile),
        submittedAt,
        verificationDocumentsApprovedAt: profile.verificationDocumentsApprovedAt || null,
        verificationDocumentsApprovedBy: profile.verificationDocumentsApprovedBy || null,
        verificationReferredToSuperadminAt: profile.verificationReferredToSuperadminAt || null,
        verificationReferredToSuperadminBy: profile.verificationReferredToSuperadminBy || null,
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
      const matchesAgeGroup =
        !ageGroup || ageGroup === "all"
          ? true
          : normalizeYouthAgeGroup(profile.youthAgeGroup) === normalizeYouthAgeGroup(ageGroup);
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
        .map((profile) => normalizeYouthAgeGroup(profile.youthAgeGroup))
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
      pendingSuperadmin: profiles.filter((profile) => profile.queueStatus === PENDING_SUPERADMIN_ID_GENERATION).length,
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
  const digitalIdStatus = resolveDigitalIdStatus(profile);

  return {
    ...profile,
    digitalIdStatus,
    digitalIdEmergencyContactComplete: hasCompleteEmergencyContact(profile),
    digitalIdSignatureComplete: hasDigitalIdSignature(profile),
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
  const verificationProfileRecord = verificationProfile as AnyRecord;

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

  const existingDigitalIdStatus = resolveDigitalIdStatus(verificationProfileRecord);
  const nextDigitalIdStatus = existingDigitalIdStatus === "active" ? "active" : "pending_approval";
  const verificationUpdate: AnyRecord = {
    verified: true,
    status: "verified",
    verificationQueueStatus: PENDING_SUPERADMIN_ID_GENERATION,
    verifiedAt:
      verificationProfileRecord.verifiedAt || FieldValue.serverTimestamp(),
    verificationActionAt: FieldValue.serverTimestamp(),
    verificationActionBy: adminEmail,
    verificationLastAction: "approved_and_referred_to_superadmin",
    verificationRejectReason: null,
    verificationRejectNote: null,
    verificationResubmissionMessage: null,
    verificationDocumentsApprovedAt:
      verificationProfileRecord.verificationDocumentsApprovedAt ||
      FieldValue.serverTimestamp(),
    verificationDocumentsApprovedBy:
      verificationProfileRecord.verificationDocumentsApprovedBy || adminEmail,
    verificationReferredToSuperadminAt: FieldValue.serverTimestamp(),
    verificationReferredToSuperadminBy: adminEmail,
    digitalIdApprovalRequestedAt: FieldValue.serverTimestamp(),
    digitalIdApprovalRequestedBy: adminEmail,
    digitalIdStatus: nextDigitalIdStatus,
  };

  await db.collection("kkProfiling").doc(userId).set(
    verificationUpdate,
    { merge: true }
  );

  await createNotification({
    recipientUid: userId,
    audience: "youth",
    type: "success",
    title: "Verification complete",
    body:
      nextDigitalIdStatus === "active"
        ? "Your verification is complete and your Digital ID remains active."
        : "Your verification is complete. Your Digital ID is being prepared by the superadmin.",
    link: "/scanner/digital-id",
  });

  const memberLabel =
    verificationProfile.fullName ||
    [verificationProfileRecord.firstName, verificationProfileRecord.middleName, verificationProfileRecord.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    String(verificationProfileRecord.email || "").trim() ||
    "A verified youth member";

  await createNotificationsForRoles(["superadmin"], {
    ...buildDigitalIdGenerationNotification({
      userId,
      memberName: memberLabel,
      memberEmail: normalizeOptionalString(verificationProfileRecord.email) || undefined,
      approvedBy: verificationUpdate.verificationDocumentsApprovedBy,
      referredBy: adminEmail,
      approvedAt: new Date().toISOString(),
      referredAt: new Date().toISOString(),
    }),
  });
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

  await createNotification({
    recipientUid: userId,
    audience: "youth",
    type: "error",
    title: "Verification rejected",
    body: note?.trim() || reason,
    link: "/verification/upload",
  });
}

export async function reviewVerificationDocument(
  userId: string,
  documentId: string,
  action: "approved" | "rejected",
  adminEmail: string,
  note?: string
) {
  if (!userId || !documentId) {
    throw new Error("userId and documentId are required");
  }

  if (!["approved", "rejected"].includes(action)) {
    throw new Error("action must be approved or rejected");
  }

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

  const verificationUpdate = omitUndefined({
      verified: action === "rejected" ? false : undefined,
      status: action === "rejected" ? "pending" : undefined,
      verificationQueueStatus: "in_review",
      verificationLastAction: "document_reviewed",
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
      verificationResubmissionMessage: action === "rejected" ? null : undefined,
      verificationDocumentsApprovedAt: action === "rejected" ? null : undefined,
      verificationDocumentsApprovedBy: action === "rejected" ? null : undefined,
      verificationReferredToSuperadminAt: action === "rejected" ? null : undefined,
      verificationReferredToSuperadminBy: action === "rejected" ? null : undefined,
      digitalIdApprovalRequestedAt: action === "rejected" ? null : undefined,
      digitalIdApprovalRequestedBy: action === "rejected" ? null : undefined,
      digitalIdStatus: action === "rejected" ? "draft" : undefined,
      verifiedAt: action === "rejected" ? null : undefined,
      verificationRejectReason: action === "rejected" ? null : undefined,
      verificationRejectNote: action === "rejected" ? null : undefined,
    });

  await db.collection("kkProfiling").doc(userId).set(
    verificationUpdate,
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
      digitalIdStatus: "draft",
      digitalIdApprovalRequestedAt: null,
      digitalIdApprovalRequestedBy: null,
      verificationReferredToSuperadminAt: null,
      verificationReferredToSuperadminBy: null,
      verificationDocumentsApprovedAt: null,
      verificationDocumentsApprovedBy: null,
    },
    { merge: true }
  );

  await batch.commit();

  await createNotification({
    recipientUid: userId,
    audience: "youth",
    type: "warning",
    title: "Resubmission requested",
    body: message,
    link: "/verification/upload",
  });
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
    const stock = reward.unlimitedStock ? null : Number(reward.stock ?? reward.remainingStock ?? 0);
    const expiryDate = reward.expiryDate || reward.expiresAt || null;
    const isExpired = expiryDate ? new Date(String(expiryDate)).getTime() < Date.now() : false;
    const isActive = reward.isActive !== false;
    return {
      ...reward,
      merchantName: merchant?.name || "Unknown Merchant",
      status: !isActive ? "inactive" : isExpired ? "expired" : "active",
      stock,
      unlimitedStock: Boolean(reward.unlimitedStock),
      expiryDate,
    };
  });
}

export async function createReward(data: Record<string, unknown>) {
  const ref = await db.collection("rewards").add({
    ...data,
    isActive: data.isActive !== false,
    stock: data.unlimitedStock ? null : Number(data.stock ?? 0),
    unlimitedStock: Boolean(data.unlimitedStock),
    expiryDate: data.expiryDate || null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateReward(rewardId: string, data: Record<string, unknown>) {
  const payload: AnyRecord = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  const allowedKeys = [
    "title",
    "description",
    "imageUrl",
    "points",
    "stock",
    "unlimitedStock",
    "expiryDate",
    "isActive",
    "category",
    "merchantId",
    "validDays",
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key)) {
      payload[key] = key === "stock" && data.unlimitedStock ? null : value;
    }
  }

  await db.collection("rewards").doc(rewardId).set(payload, { merge: true });
}

export async function getRewardRedemptions(filters: {
  rewardId?: string;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const [transactionsSnap, rewardsSnap, usersSnap] = await Promise.all([
    db.collection("transactions").where("type", "==", "redeem").get(),
    db.collection("rewards").get(),
    db.collection("users").get(),
  ]);

  const rewardsMap = new Map<string, AnyRecord>(
    rewardsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord])
  );
  const usersMap = new Map<string, AnyRecord>(
    usersSnap.docs.map((doc) => [doc.id, serializeRecord({ uid: doc.id, ...doc.data() }) as AnyRecord])
  );

  const search = normalizeString(filters.search);
  const rewardId = String(filters.rewardId || "").trim();
  const status = normalizeString(filters.status);
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

  return transactionsSnap.docs
    .map((doc) => {
      const transaction = serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord;
      const reward = rewardsMap.get(String(transaction.rewardId || ""));
      const user = usersMap.get(String(transaction.userId || ""));
      const redemptionStatus = String(transaction.redemptionStatus || "active");
      const redeemedAt = transaction.createdAt ? new Date(String(transaction.createdAt)) : null;
      const rewardExpiryDate = reward?.expiryDate ? new Date(String(reward.expiryDate)) : null;
      const computedStatus =
        redemptionStatus === "claimed"
          ? "claimed"
          : rewardExpiryDate && !Number.isNaN(rewardExpiryDate.getTime()) && rewardExpiryDate.getTime() < Date.now()
            ? "expired"
            : redemptionStatus;

      return {
        id: transaction.id,
        rewardId: transaction.rewardId || null,
        rewardName: reward?.title || transaction.rewardTitle || "Reward",
        userId: transaction.userId || null,
        userName: user?.UserName || user?.email || "Unknown user",
        userEmail: user?.email || null,
        memberId: transaction.memberId || null,
        pointsCost: Math.abs(Number(transaction.points || 0)),
        status: computedStatus,
        redeemedAt: transaction.createdAt,
        claimedAt: transaction.claimedAt || null,
      };
    })
    .filter((redemption) => {
      const redeemedAt = redemption.redeemedAt ? new Date(String(redemption.redeemedAt)) : null;
      const matchesReward = !rewardId || redemption.rewardId === rewardId;
      const matchesSearch =
        !search ||
        normalizeString(redemption.rewardName).includes(search) ||
        normalizeString(redemption.userName).includes(search) ||
        normalizeString(redemption.memberId).includes(search);
      const matchesStatus = !status || status === "all" ? true : normalizeString(redemption.status) === status;
      const matchesDateFrom =
        !dateFrom || (redeemedAt && !Number.isNaN(redeemedAt.getTime()) && redeemedAt >= dateFrom);
      const matchesDateTo =
        !dateTo || (redeemedAt && !Number.isNaN(redeemedAt.getTime()) && redeemedAt <= dateTo);
      return matchesReward && matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => String(b.redeemedAt || "").localeCompare(String(a.redeemedAt || "")));
}

export async function markRewardRedemptionClaimed(transactionId: string, adminEmail: string) {
  const transactionRef = db.collection("transactions").doc(transactionId);
  const transactionSnap = await transactionRef.get();
  const transactionData = transactionSnap.data() || {};

  await transactionRef.set(
    {
      redemptionStatus: "claimed",
      claimedAt: FieldValue.serverTimestamp(),
      claimedBy: adminEmail,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const userId = String(transactionData.userId || "");
  if (userId) {
    await createNotification({
      recipientUid: userId,
      audience: "youth",
      type: "success",
      title: "Reward claimed",
      body: `Your ${String(transactionData.rewardTitle || "reward")} redemption has been marked as claimed.`,
      link: "/rewards/my-redemptions",
    });
  }
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
      pointsRate: Number(merchant.pointsRate || merchant.pointsRatePeso || 10),
      dateJoined: merchant.createdAt || merchant.updatedAt || null,
    };
  });

  return merchants;
}

export async function getMerchantDetails(merchantId: string) {
  const merchant = await getMerchantById(merchantId, { includePrivate: true });
  if (!merchant) return null;

  const ownerId = String(merchant.ownerId || "");
  let owner: AnyRecord | null = null;

  if (ownerId) {
    const ownerSnap = await db.collection("users").doc(ownerId).get();
    owner = ownerSnap.exists ? (serializeRecord({ uid: ownerSnap.id, ...ownerSnap.data() }) as AnyRecord) : null;
  }

  return {
    ...merchant,
    ownerEmail: owner?.email || merchant.ownerEmail || null,
    ownerName: owner?.UserName || merchant.ownerName || null,
    pointsRate: Number(merchant.pointsRate || merchant.pointsRatePeso || 10),
    dateJoined: merchant.createdAt || merchant.updatedAt || null,
  };
}

export async function getPendingMerchants() {
  return getMerchants("pending");
}

export async function approveMerchant(merchantId: string) {
  const merchantRef = db.collection("merchants").doc(merchantId);
  const merchantSnap = await merchantRef.get();
  const merchant = merchantSnap.data() || {};

  await merchantRef.update({
    status: "approved",
    approvedAt: FieldValue.serverTimestamp(),
  });

  if (merchant.ownerId) {
    await setUserRole(String(merchant.ownerId), "merchant");
    await createNotification({
      recipientUid: String(merchant.ownerId),
      audience: "merchant",
      type: "account",
      title: "Merchant account approved",
      body: "Your merchant account is now active. You can update your storefront and start awarding points.",
      link: "/shop",
    });
  }
}

export async function updateMerchant(
  merchantId: string,
  data: Record<string, unknown>,
  adminEmail: string
) {
  const allowedKeys = [
    "name",
    "businessName",
    "description",
    "shortDescription",
    "category",
    "address",
    "imageUrl",
    "bannerUrl",
    "logoUrl",
    "ownerName",
    "discountInfo",
    "termsAndConditions",
    "pointsPolicy",
    "pointsRate",
    "businessInfo",
  ];

  const payload: AnyRecord = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminEmail,
  };

  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key)) {
      payload[key] = value;
    }
  }

  if (payload.pointsRate != null) {
    payload.pointsRate = Number(payload.pointsRate || 10);
  }

  await db.collection("merchants").doc(merchantId).set(payload, { merge: true });
}

export async function updateMerchantStatus(
  merchantId: string,
  status: "approved" | "rejected" | "suspended",
  adminEmail: string
) {
  const merchantRef = db.collection("merchants").doc(merchantId);
  const merchantSnap = await merchantRef.get();
  const merchant = merchantSnap.data() || {};
  const payload: AnyRecord = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminEmail,
  };

  if (status === "approved") {
    payload.approvedAt = FieldValue.serverTimestamp();
    payload.suspendedAt = null;
    payload.suspendedBy = null;
  }

  if (status === "suspended") {
    payload.suspendedAt = FieldValue.serverTimestamp();
    payload.suspendedBy = adminEmail;
  }

  await merchantRef.set(payload, { merge: true });

  if (status === "approved" && merchant.ownerId) {
    await setUserRole(String(merchant.ownerId), "merchant");
  }

  if (merchant.ownerId) {
    const notificationType =
      status === "approved" ? "success" : status === "suspended" ? "warning" : "error";
    const notificationBody =
      status === "approved"
        ? "Your merchant account is active again. Storefront updates and QR scans are available."
        : status === "suspended"
          ? "Your merchant account has been suspended. Contact SK admin for the next steps."
          : "Your merchant account was rejected. Review your shop details and coordinate with SK admin.";

    await createNotification({
      recipientUid: String(merchant.ownerId),
      audience: "merchant",
      type: notificationType,
      title: `Merchant status updated: ${status}`,
      body: notificationBody,
      link: "/shop",
    });
  }
}

export async function getMerchantTransactions(merchantId: string) {
  const [transactionsSnap, usersSnap] = await Promise.all([
    db.collection("transactions").where("merchantId", "==", merchantId).get(),
    db.collection("users").get(),
  ]);

  const usersMap = new Map<string, AnyRecord>(
    usersSnap.docs.map((doc) => [doc.id, serializeRecord({ uid: doc.id, ...doc.data() }) as AnyRecord])
  );

  return transactionsSnap.docs
    .map((doc) => {
      const transaction = serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord;
      const user = usersMap.get(String(transaction.userId || ""));
      return {
        id: transaction.id,
        userId: transaction.userId || null,
        userName: user?.UserName || user?.email || "Unknown user",
        userEmail: user?.email || null,
        memberId: transaction.memberId || null,
        amountSpent: transaction.amountSpent ?? null,
        pointsGiven: Math.abs(Number(transaction.points || 0)),
        type: transaction.type || "earn",
        status: String(transaction.status || "success"),
        reason: transaction.reason || null,
        createdAt: transaction.createdAt,
      };
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function getPointsTransactionsOverview(filters: {
  dateFrom?: string;
  dateTo?: string;
  merchantId?: string;
  userId?: string;
  status?: string;
  minPoints?: number;
  maxPoints?: number;
  search?: string;
} = {}) {
  const [transactionsSnap, usersSnap, merchantsSnap, pointsSnap, settingsSnap] = await Promise.all([
    db.collection("transactions").get(),
    db.collection("users").get(),
    db.collection("merchants").get(),
    db.collection("points").get(),
    db.collection("settings").doc("system").get(),
  ]);

  const usersMap = new Map<string, AnyRecord>(
    usersSnap.docs.map((doc) => [doc.id, serializeRecord({ uid: doc.id, ...doc.data() }) as AnyRecord])
  );
  const merchantsMap = new Map<string, AnyRecord>(
    merchantsSnap.docs.map((doc) => [doc.id, serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord])
  );

  const search = normalizeString(filters.search);
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
  const status = normalizeString(filters.status);
  const merchantId = String(filters.merchantId || "").trim();
  const userId = String(filters.userId || "").trim();
  const minPoints = Number.isFinite(filters.minPoints) ? Number(filters.minPoints) : null;
  const maxPoints = Number.isFinite(filters.maxPoints) ? Number(filters.maxPoints) : null;

  const allTransactions = transactionsSnap.docs
    .map((doc) => {
      const transaction = serializeRecord({ id: doc.id, ...doc.data() }) as AnyRecord;
      const user = usersMap.get(String(transaction.userId || ""));
      const merchant = merchantsMap.get(String(transaction.merchantId || ""));
      const rawPoints = Number(transaction.points || 0);
      const pointsValue = Math.abs(rawPoints);
      return {
        id: transaction.id,
        userId: transaction.userId || null,
        userName: user?.UserName || user?.email || "Unknown user",
        userEmail: user?.email || null,
        merchantId: transaction.merchantId || null,
        merchantName: merchant?.name || (transaction.merchantId ? "Unknown merchant" : "System"),
        amountSpent: transaction.amountSpent ?? null,
        pointsAwarded: pointsValue,
        timestamp: transaction.createdAt || transaction.updatedAt || null,
        status: String(transaction.status || (transaction.failedAt ? "failed" : "success")),
        type: String(transaction.type || "earn"),
        reason: transaction.reason || null,
        adminName: transaction.adjustedBy || null,
        rawPoints,
      };
    })
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));

  const transactionLog = allTransactions.filter((transaction) => {
    if (!["earn", "redeem", "adjustment"].includes(transaction.type)) return false;
    const timestamp = transaction.timestamp ? new Date(String(transaction.timestamp)) : null;
    const matchesSearch =
      !search ||
      normalizeString(transaction.userName).includes(search) ||
      normalizeString(transaction.merchantName).includes(search) ||
      normalizeString(transaction.userEmail).includes(search);
    const matchesMerchant = !merchantId || transaction.merchantId === merchantId;
    const matchesUser = !userId || transaction.userId === userId;
    const matchesStatus = !status || status === "all" ? true : normalizeString(transaction.status) === status;
    const matchesDateFrom =
      !dateFrom || (timestamp && !Number.isNaN(timestamp.getTime()) && timestamp >= dateFrom);
    const matchesDateTo =
      !dateTo || (timestamp && !Number.isNaN(timestamp.getTime()) && timestamp <= dateTo);
    const matchesMin = minPoints == null || transaction.pointsAwarded >= minPoints;
    const matchesMax = maxPoints == null || transaction.pointsAwarded <= maxPoints;

    return (
      matchesSearch &&
      matchesMerchant &&
      matchesUser &&
      matchesStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesMin &&
      matchesMax
    );
  });

  const manualAdjustments = allTransactions
    .filter((transaction) => transaction.type === "adjustment")
    .map((transaction) => ({
      ...transaction,
      direction: Number(transaction.rawPoints || 0) >= 0 ? "add" : "deduct",
    }));

  const leaderboard = pointsSnap.docs
    .map((doc) => {
      const pointsRecord = serializeRecord({ userId: doc.id, ...doc.data() }) as AnyRecord;
      const user = usersMap.get(doc.id);
      return {
        userId: doc.id,
        userName: user?.UserName || user?.email || "Unknown user",
        userEmail: user?.email || null,
        totalPoints: Number(pointsRecord.balance || 0),
        earnedPoints: Number(pointsRecord.earnedPoints || pointsRecord.balance || 0),
        redeemedPoints: Number(pointsRecord.redeemedPoints || 0),
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const totalIssued = allTransactions
    .filter((transaction) => transaction.type === "earn" && transaction.status !== "failed")
    .reduce((sum, transaction) => sum + Number(transaction.pointsAwarded || 0), 0);
  const totalRedeemed = allTransactions
    .filter((transaction) => transaction.type === "redeem")
    .reduce((sum, transaction) => sum + Number(transaction.pointsAwarded || 0), 0);
  const outstandingBalance = pointsSnap.docs.reduce(
    (sum, doc) => sum + Number(doc.data().balance || 0),
    0
  );

  return {
    transactionLog,
    manualAdjustments,
    leaderboard,
    summary: {
      totalIssued,
      totalRedeemed,
      outstandingBalance,
    },
    conversionRate: {
      pesosPerPoint: Number(settingsSnap.data()?.pesosPerPoint || 10),
      updatedAt: toIso(settingsSnap.data()?.updatedAt),
      updatedBy: settingsSnap.data()?.updatedBy || null,
    },
    merchantOptions: Array.from(merchantsMap.values())
      .map((merchant) => ({ id: merchant.id, name: merchant.name || "Merchant" }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function updatePointsConversionRate(pesosPerPoint: number, adminEmail: string) {
  await db.collection("settings").doc("system").set(
    {
      pesosPerPoint,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminEmail,
    },
    { merge: true }
  );
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
      status: normalizeDocumentStatus(doc),
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
  const profileRef = db.collection("kkProfiling").doc(userId);
  const payload: AnyRecord = {
    status,
    verified: status === "verified",
    verificationActionAt: FieldValue.serverTimestamp(),
    verificationActionBy: adminEmail,
    verificationLastAction: status,
    verificationQueueStatus: status === "verified" ? "verified" : status === "rejected" ? "rejected" : null,
    verificationRejectReason: status === "rejected" ? reason || null : null,
    verificationRejectNote: status === "rejected" ? note || null : null,
  };

  if (status === "verified") {
    payload.verifiedAt = FieldValue.serverTimestamp();
  }

  if (status === "pending") {
    payload.verifiedAt = null;
    payload.verificationResubmissionMessage = null;
    payload.verificationDocumentsApprovedAt = null;
    payload.verificationDocumentsApprovedBy = null;
    payload.verificationReferredToSuperadminAt = null;
    payload.verificationReferredToSuperadminBy = null;
    payload.digitalIdApprovalRequestedAt = null;
    payload.digitalIdApprovalRequestedBy = null;
    payload.digitalIdStatus = "draft";
    payload.verificationRejectReason = null;
    payload.verificationRejectNote = null;
  }

  if (status === "pending") {
    const documentsSnap = await db.collection("documents").where("profileId", "==", userId).get();
    const batch = db.batch();

    for (const document of documentsSnap.docs) {
      batch.set(
        document.ref,
        {
          reviewStatus: "pending",
          reviewNote: null,
          reviewedAt: null,
          reviewedBy: null,
          reviewRequestedAt: null,
        },
        { merge: true }
      );
    }

    batch.set(profileRef, payload, { merge: true });
    await batch.commit();
    return;
  }

  await profileRef.set(payload, { merge: true });
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
      const digitalIdStatus = resolveDigitalIdStatus(member.profile || {});
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
        verificationQueueStatus: computeQueueStatus(member.profile || {}, []),
        verificationDocumentsApprovedAt: member.profile?.verificationDocumentsApprovedAt,
        verificationDocumentsApprovedBy: member.profile?.verificationDocumentsApprovedBy,
        verificationReferredToSuperadminAt: member.profile?.verificationReferredToSuperadminAt,
        verificationReferredToSuperadminBy: member.profile?.verificationReferredToSuperadminBy,
        digitalIdRevision: Number(member.profile?.digitalIdRevision || 1),
        digitalIdGeneratedAt: member.profile?.digitalIdGeneratedAt,
        digitalIdApprovedAt: member.profile?.digitalIdApprovedAt,
        digitalIdDeactivatedAt: member.profile?.digitalIdDeactivatedAt,
        hasDigitalId: digitalIdStatus === "active",
        emergencyContactComplete: hasCompleteEmergencyContact(member.profile || {}),
        signatureComplete: hasDigitalIdSignature(member.profile || {}),
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
    emergencyContactComplete: hasCompleteEmergencyContact(profile),
    signatureComplete: hasDigitalIdSignature(profile),
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
  assertCompleteEmergencyContact(profile);
  assertCompleteDigitalIdSignature(profile);

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
  const profileRef = db.collection("kkProfiling").doc(userId);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new Error("Profile not found");
  }

  const profile = profileSnap.data() as AnyRecord;
  const verificationProfile = await getVerificationProfile(userId);

  if (!verificationProfile) {
    throw new Error("Profile not found");
  }

  const isVerified = profile.status === "verified" || profile.verified === true;

  if (!isVerified) {
    const hasMissingRequiredDocuments = verificationProfile.missingDocuments.some(
      (document: AnyRecord) => !document.present
    );

    if (hasMissingRequiredDocuments) {
      throw new Error("Required documents are still missing");
    }

    const hasUnapprovedRequiredDocuments = verificationProfile.requiredDocuments.some(
      (document: AnyRecord) => document.reviewStatus !== "approved"
    );

    if (hasUnapprovedRequiredDocuments) {
      throw new Error(
        "All required documents must be approved before referring this submission to superadmin"
      );
    }
  }

  const nextDigitalIdStatus =
    resolveDigitalIdStatus(profile) === "active" ? "active" : "pending_approval";

  await profileRef.set(
    {
      verified: true,
      status: "verified",
      verifiedAt: profile.verifiedAt || FieldValue.serverTimestamp(),
      digitalIdStatus: nextDigitalIdStatus,
      verificationQueueStatus: PENDING_SUPERADMIN_ID_GENERATION,
      verificationDocumentsApprovedAt:
        profile.verificationDocumentsApprovedAt || FieldValue.serverTimestamp(),
      verificationDocumentsApprovedBy:
        profile.verificationDocumentsApprovedBy || adminEmail,
      verificationReferredToSuperadminAt: FieldValue.serverTimestamp(),
      verificationReferredToSuperadminBy: adminEmail,
      digitalIdApprovalRequestedAt: FieldValue.serverTimestamp(),
      digitalIdApprovalRequestedBy: adminEmail,
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
      verificationLastAction: "referred_to_superadmin",
      verificationRejectReason: null,
      verificationRejectNote: null,
      verificationResubmissionMessage: null,
    },
    { merge: true }
  );

  const memberLabel =
    [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ").trim() ||
    String(profile.email || "").trim() ||
    "A verified youth member";

  await createNotificationsForRoles(["superadmin"], {
    ...buildDigitalIdGenerationNotification({
      userId,
      memberName: memberLabel,
      memberEmail: normalizeOptionalString(profile.email) || undefined,
      approvedBy: String(profile.verificationDocumentsApprovedBy || adminEmail),
      referredBy: adminEmail,
      approvedAt:
        toIso(profile.verificationDocumentsApprovedAt) || new Date().toISOString(),
      referredAt: new Date().toISOString(),
      isReminder: true,
    }),
  });
}

export async function approveDigitalId(userId: string, adminEmail: string) {
  const profileRef = db.collection("kkProfiling").doc(userId);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    throw new Error("Profile not found");
  }

  const profile = profileSnap.data() as AnyRecord;
  assertCompleteEmergencyContact(profile);
  assertCompleteDigitalIdSignature(profile);

  const memberId = String(profile.idNumber || "").trim() || generateIdNumber(userId);
  const nextRevision = Number(profile.digitalIdRevision || 1);

  await profileRef.set(
    {
      verified: true,
      status: "verified",
      verificationQueueStatus: "verified",
      verifiedAt: profile.verifiedAt || FieldValue.serverTimestamp(),
      verificationActionAt: FieldValue.serverTimestamp(),
      verificationActionBy: adminEmail,
      verificationLastAction: "digital_id_issued",
      verificationRejectReason: null,
      verificationRejectNote: null,
      verificationResubmissionMessage: null,
      idNumber: memberId,
      digitalIdStatus: "active",
      digitalIdRevision: nextRevision,
      digitalIdGeneratedAt: profile.digitalIdGeneratedAt || FieldValue.serverTimestamp(),
      digitalIdGeneratedBy: profile.digitalIdGeneratedBy || adminEmail,
      digitalIdApprovalRequestedAt:
        profile.digitalIdApprovalRequestedAt || FieldValue.serverTimestamp(),
      digitalIdApprovalRequestedBy: profile.digitalIdApprovalRequestedBy || adminEmail,
      digitalIdApprovedAt: FieldValue.serverTimestamp(),
      digitalIdApprovedBy: adminEmail,
      digitalIdDeactivatedAt: null,
      digitalIdDeactivatedBy: null,
      digitalIdDeactivationReason: null,
    },
    { merge: true }
  );

  await createNotification({
    recipientUid: userId,
    audience: "youth",
    type: "success",
    title: "Digital ID issued",
    body: "Your Digital ID is now active and available in the youth app.",
    link: "/scanner/digital-id",
  });
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
  assertCompleteEmergencyContact(profile);
  assertCompleteDigitalIdSignature(profile);
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
    byAgeGroup: (() => {
      const counts = new Map<string, number>();

      for (const profile of profiles) {
        const value = normalizeYouthAgeGroup(profile.youthAgeGroup) || "Unknown";
        counts.set(value, (counts.get(value) || 0) + 1);
      }

      return [...counts.entries()].map(([name, value]) => ({ name, value }));
    })(),
    byStatus: countBy("status"),
    byClassification: countBy("youthClassification"),
    byEducation: countBy("educationalBackground"),
    monthlySummary: [...monthly.values()],
  };
}

export async function createMerchantAccount(data: {
  name: string;
  category?: string;
  address?: string;
  ownerName?: string;
  email: string;
  password: string;
}) {
  // 1. Create Firebase Auth user
  const userRecord = await auth.createUser({
    email: data.email,
    password: data.password,
    displayName: data.ownerName || data.name,
  });

  const uid = userRecord.uid;

  // 2. Set merchant role claim
  await auth.setCustomUserClaims(uid, { role: "merchant" });

  // 3. Write users doc
  await db.collection("users").doc(uid).set({
    uid,
    email: data.email,
    UserName: data.ownerName || data.name,
    role: "merchant",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await createMerchantTemporaryPasswordPolicy(uid, data.password);

  // 4. Create merchant record (pre-approved since superadmin is creating it directly)
  const merchantRef = await db.collection("merchants").add({
    name: data.name,
    businessName: data.name,
    category: data.category || "",
    address: data.address || "",
    description: "",
    shortDescription: "",
    ownerId: uid,
    ownerName: data.ownerName || data.name,
    ownerEmail: data.email,
    status: "approved",
    pointsRate: 10,
    pointsPolicy:
      "Earn 10 points for every PHP 100 spent at this shop. Present your youth QR during checkout.",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 5. Notify the new merchant
  await createNotification({
    recipientUid: uid,
    audience: "merchant",
    type: "account",
    title: "Merchant account created",
    body: "Your KK merchant account has been set up by the superadmin. Log in using the provided credentials, then change the temporary password before using the merchant workspace.",
    link: "/shop",
  });

  return {
    merchantId: merchantRef.id,
    uid,
    email: data.email,
    name: data.name,
  };
}
