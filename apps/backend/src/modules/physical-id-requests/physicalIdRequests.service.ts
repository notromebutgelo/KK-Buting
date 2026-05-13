import { FieldValue } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import { generateIdNumber } from "../../../utils/generateIdNumber";
import {
  createNotification,
  createNotificationsForRoles,
} from "../notifications/notifications.service";

export const PHYSICAL_ID_REQUEST_STATUSES = [
  "pending",
  "approved",
  "processing",
  "ready_for_pickup",
  "completed",
  "rejected",
] as const;

export type PhysicalIdRequestStatus =
  (typeof PHYSICAL_ID_REQUEST_STATUSES)[number];

type PhysicalIdRequestRecord = {
  id: string;
  userId: string;
  digitalIdReference: string;
  fullName: string;
  barangay: string;
  purok: string;
  reason: string;
  contactNumber: string;
  notes: string;
  status: PhysicalIdRequestStatus;
  statusLabel: string;
  adminRemarks: string | null;
  rejectionReason: string | null;
  handledBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  approvedAt: string | null;
  processingAt: string | null;
  readyForPickupAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  readyForPickupNotice: string | null;
};

type PhysicalIdRequestMutation = {
  reason: string;
  contactNumber: string;
  notes?: string;
};

type PhysicalIdRequestAdminMutation = {
  status?: PhysicalIdRequestStatus;
  adminRemarks?: string;
  rejectionReason?: string;
};

type PhysicalIdRequestFilters = {
  status?: string;
  search?: string;
  purok?: string;
  requestDate?: string;
  page?: number;
  pageSize?: number;
};

const ACTIVE_REQUEST_STATUSES: PhysicalIdRequestStatus[] = [
  "pending",
  "approved",
  "processing",
  "ready_for_pickup",
];

const STATUS_LABELS: Record<PhysicalIdRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  processing: "Processing",
  ready_for_pickup: "Ready for Pick-up",
  completed: "Completed",
  rejected: "Rejected",
};

function normalizeOptionalString(value: unknown) {
  return String(value || "").trim();
}

function toIso(value: unknown) {
  if (!value) return null;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}

function buildStatusLabel(status: PhysicalIdRequestStatus) {
  return STATUS_LABELS[status] || status;
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

function hasIssuedDigitalId(profile: Record<string, unknown>) {
  return Boolean(
    profile?.digitalIdGeneratedAt ||
      profile?.digitalIdGeneratedBy ||
      profile?.digitalIdApprovedAt ||
      profile?.digitalIdApprovedBy
  );
}

function resolveDigitalIdStatus(profile: Record<string, unknown>) {
  const rawStatus = normalizeOptionalString(profile?.digitalIdStatus);

  if (rawStatus === "active" && !hasIssuedDigitalId(profile)) {
    return Boolean(profile?.verified) || normalizeOptionalString(profile?.status) === "verified"
      ? "pending_approval"
      : "draft";
  }

  if (rawStatus) {
    return rawStatus;
  }

  if (Boolean(profile?.verified) || normalizeOptionalString(profile?.status) === "verified") {
    return "pending_approval";
  }

  return "not_verified";
}

function isPhysicalIdRequestStatus(value: unknown): value is PhysicalIdRequestStatus {
  return PHYSICAL_ID_REQUEST_STATUSES.includes(value as PhysicalIdRequestStatus);
}

function normalizePhysicalIdRequestStatus(value: unknown): PhysicalIdRequestStatus {
  const normalized = normalizeOptionalString(value).toLowerCase();
  return isPhysicalIdRequestStatus(normalized) ? normalized : "pending";
}

function normalizeContactNumber(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function isValidContactNumber(value: string) {
  return /^09\d{9}$/.test(value);
}

function buildFullName(profile: Record<string, unknown>, user: Record<string, unknown>) {
  const fullName = [
    normalizeOptionalString(profile.firstName),
    normalizeOptionalString(profile.middleName),
    normalizeOptionalString(profile.lastName),
    normalizeOptionalString(profile.suffix),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || normalizeOptionalString(user.UserName) || normalizeOptionalString(user.email) || "Youth Member";
}

function buildReadyForPickupNotice(request: PhysicalIdRequestRecord) {
  if (request.status !== "ready_for_pickup") {
    return null;
  }

  return "Your physical ID copy is approved for pick-up at the SK office. Bring a valid reference when claiming it.";
}

function mapPhysicalIdRequest(id: string, data: Record<string, unknown>): PhysicalIdRequestRecord {
  const status = normalizePhysicalIdRequestStatus(data.status);
  const record: PhysicalIdRequestRecord = {
    id,
    userId: normalizeOptionalString(data.userId),
    digitalIdReference: normalizeOptionalString(data.digitalIdReference),
    fullName: normalizeOptionalString(data.fullName),
    barangay: normalizeOptionalString(data.barangay),
    purok: normalizeOptionalString(data.purok),
    reason: normalizeOptionalString(data.reason),
    contactNumber: normalizeOptionalString(data.contactNumber),
    notes: normalizeOptionalString(data.notes),
    status,
    statusLabel: buildStatusLabel(status),
    adminRemarks: normalizeOptionalString(data.adminRemarks) || null,
    rejectionReason: normalizeOptionalString(data.rejectionReason) || null,
    handledBy: normalizeOptionalString(data.handledBy) || null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    approvedAt: toIso(data.approvedAt),
    processingAt: toIso(data.processingAt),
    readyForPickupAt: toIso(data.readyForPickupAt),
    completedAt: toIso(data.completedAt),
    rejectedAt: toIso(data.rejectedAt),
    readyForPickupNotice: null,
  };

  return {
    ...record,
    readyForPickupNotice: buildReadyForPickupNotice(record),
  };
}

function sortRequestsNewestFirst<T extends { createdAt: string | null }>(requests: T[]) {
  return [...requests].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
}

function getActiveRequest(requests: PhysicalIdRequestRecord[]) {
  return requests.find((request) => ACTIVE_REQUEST_STATUSES.includes(request.status)) || null;
}

function getAllowedNextStatuses(status: PhysicalIdRequestStatus) {
  if (status === "pending") {
    return ["approved", "rejected"] as PhysicalIdRequestStatus[];
  }

  if (status === "approved") {
    return ["processing"] as PhysicalIdRequestStatus[];
  }

  if (status === "processing") {
    return ["ready_for_pickup"] as PhysicalIdRequestStatus[];
  }

  if (status === "ready_for_pickup") {
    return ["completed"] as PhysicalIdRequestStatus[];
  }

  return [] as PhysicalIdRequestStatus[];
}

function getEligibilityState(
  profile: Record<string, unknown>,
  requests: PhysicalIdRequestRecord[]
) {
  const activeRequest = getActiveRequest(requests);

  if (activeRequest) {
    return {
      canRequest: false,
      eligibilityReason: `You already have a ${buildStatusLabel(activeRequest.status).toLowerCase()} physical ID request.`,
      activeRequest,
    };
  }

  if (
    !(
      Boolean(profile.verified)
      || normalizeOptionalString(profile.status) === "verified"
    )
  ) {
    return {
      canRequest: false,
      eligibilityReason: "Your verification must be approved before you can request a physical ID copy.",
      activeRequest: null,
    };
  }

  if (resolveDigitalIdStatus(profile) !== "active") {
    return {
      canRequest: false,
      eligibilityReason: "Your Digital ID must be active before you can request a physical copy.",
      activeRequest: null,
    };
  }

  return {
    canRequest: true,
    eligibilityReason: null,
    activeRequest: null,
  };
}

function buildDateKey(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function loadYouthContext(uid: string) {
  const [profileSnap, userSnap, requestsSnap] = await Promise.all([
    db.collection("kkProfiling").doc(uid).get(),
    db.collection("users").doc(uid).get(),
    db.collection("physicalIdRequests").where("userId", "==", uid).get(),
  ]);

  const profile = profileSnap.exists ? profileSnap.data() || {} : {};
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const requests = sortRequestsNewestFirst(
    requestsSnap.docs.map((doc) => mapPhysicalIdRequest(doc.id, doc.data() || {}))
  );

  return { profile, user, requests };
}

async function buildProfileLookup(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const profileEntries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const snap = await db.collection("kkProfiling").doc(userId).get();
      return [userId, snap.exists ? snap.data() || {} : {}] as const;
    })
  );

  return new Map<string, Record<string, unknown>>(profileEntries);
}

function attachRequestProfileContext(
  requests: PhysicalIdRequestRecord[],
  profileLookup: Map<string, Record<string, unknown>>
) {
  return requests.map((request) => {
    const profile = profileLookup.get(request.userId) || {};
    const resolvedPurok =
      request.purok || normalizeOptionalString(profile.purok);
    const resolvedBarangay =
      request.barangay || normalizeOptionalString(profile.barangay);

    return {
      ...request,
      purok: resolvedPurok,
      barangay: resolvedBarangay,
    };
  });
}

export async function listMyPhysicalIdRequests(uid: string) {
  const { profile, requests } = await loadYouthContext(uid);
  const eligibilityState = getEligibilityState(profile, requests);

  return {
    requests,
    activeRequest: eligibilityState.activeRequest,
    canRequest: eligibilityState.canRequest,
    eligibilityReason: eligibilityState.eligibilityReason,
  };
}

export async function createPhysicalIdRequest(
  uid: string,
  payload: PhysicalIdRequestMutation
) {
  const { profile, user, requests } = await loadYouthContext(uid);
  const eligibilityState = getEligibilityState(profile, requests);

  if (!eligibilityState.canRequest) {
    throw new Error(eligibilityState.eligibilityReason || "Physical ID request is not allowed right now.");
  }

  const reason = normalizeOptionalString(payload.reason);
  const contactNumber = normalizeContactNumber(payload.contactNumber);
  const notes = normalizeOptionalString(payload.notes);

  if (!reason) {
    throw new Error("Reason for request is required.");
  }

  if (!isValidContactNumber(contactNumber)) {
    throw new Error("Contact number must be 11 digits and start with 09.");
  }

  const fullName = buildFullName(profile, user);
  const barangay = normalizeOptionalString(profile.barangay);
  const purok = normalizeOptionalString(profile.purok);
  const digitalIdReference = normalizeOptionalString(profile.idNumber) || generateIdNumber(uid);

  const ref = await db.collection("physicalIdRequests").add({
    userId: uid,
    digitalIdReference,
    fullName,
    barangay,
    purok,
    reason,
    contactNumber,
    notes,
    status: "pending",
    adminRemarks: null,
    rejectionReason: null,
    handledBy: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    approvedAt: null,
    processingAt: null,
    readyForPickupAt: null,
    completedAt: null,
    rejectedAt: null,
  });

  const request = await getPhysicalIdRequestById(ref.id);
  if (!request) {
    throw new Error("Physical ID request was created but could not be loaded.");
  }

  await Promise.allSettled([
    createNotification({
      recipientUid: uid,
      audience: "youth",
      type: "success",
      title: "Physical ID request submitted",
      body: "Your request for a physical Digital ID copy has been submitted. Physical IDs are for pick-up only once approved.",
      link: "/profile/physical-id-requests",
      metadata: {
        requestId: request.id,
        status: request.status,
      },
    }),
    createNotificationsForRoles(["admin", "superadmin"], {
      audience: "admin",
      type: "info",
      title: "New physical ID copy request",
      body: `${fullName} submitted a physical Digital ID copy request${purok ? ` from ${purok}` : ""}.`,
      link: "/physical-id-requests",
      metadata: {
        requestId: request.id,
        userId: uid,
        memberName: fullName,
        barangay,
        purok,
        digitalIdReference,
      },
    }),
  ]);

  return request;
}

export async function getPhysicalIdRequestById(requestId: string) {
  const snap = await db.collection("physicalIdRequests").doc(requestId).get();
  if (!snap.exists) {
    return null;
  }

  return mapPhysicalIdRequest(snap.id, snap.data() || {});
}

export async function getPhysicalIdRequestDetail(requestId: string) {
  const request = await getPhysicalIdRequestById(requestId);
  if (!request) {
    return null;
  }

  const [profileSnap, userSnap] = await Promise.all([
    db.collection("kkProfiling").doc(request.userId).get(),
    db.collection("users").doc(request.userId).get(),
  ]);

  const profile = profileSnap.exists ? profileSnap.data() || {} : {};
  const user = userSnap.exists ? userSnap.data() || {} : {};

  return {
    ...request,
    purok: request.purok || normalizeOptionalString(profile.purok),
    barangay: request.barangay || normalizeOptionalString(profile.barangay),
    allowedActions: getAllowedNextStatuses(request.status),
    user: {
      userId: request.userId,
      email: normalizeOptionalString(user.email),
      userName: normalizeOptionalString(user.UserName),
    },
    profile: {
      firstName: normalizeOptionalString(profile.firstName),
      middleName: normalizeOptionalString(profile.middleName),
      lastName: normalizeOptionalString(profile.lastName),
      suffix: normalizeOptionalString(profile.suffix),
      fullName: buildFullName(profile, user),
      contactNumber: normalizeOptionalString(profile.contactNumber),
      barangay: normalizeOptionalString(profile.barangay),
      city: normalizeOptionalString(profile.city),
      province: normalizeOptionalString(profile.province),
      purok: normalizeOptionalString(profile.purok),
      youthAgeGroup: normalizeYouthAgeGroup(normalizeOptionalString(profile.youthAgeGroup)),
      verificationStatus: normalizeOptionalString(profile.status) || "pending",
      verifiedAt: toIso(profile.verifiedAt),
    },
    digitalId: {
      memberId: normalizeOptionalString(profile.idNumber) || generateIdNumber(request.userId),
      digitalIdStatus: resolveDigitalIdStatus(profile),
      generatedAt: toIso(profile.digitalIdGeneratedAt),
      approvedAt: toIso(profile.digitalIdApprovedAt),
      deactivatedAt: toIso(profile.digitalIdDeactivatedAt),
    },
  };
}

export async function listPhysicalIdRequestsForAdmin(
  filters: PhysicalIdRequestFilters
) {
  const snap = await db
    .collection("physicalIdRequests")
    .orderBy("createdAt", "desc")
    .get();

  const allRequests = snap.docs.map((doc) => mapPhysicalIdRequest(doc.id, doc.data() || {}));
  const profileLookup = await buildProfileLookup(
    allRequests.map((request) => request.userId)
  );
  const requestsWithProfileContext = attachRequestProfileContext(
    allRequests,
    profileLookup
  );

  const normalizedSearch = normalizeOptionalString(filters.search).toLowerCase();
  const normalizedStatus = normalizeOptionalString(filters.status);
  const normalizedPurok = normalizeOptionalString(filters.purok).toLowerCase();
  const hasPurokFilter =
    Boolean(normalizedPurok) && normalizedPurok !== "all";
  const normalizedRequestDate = normalizeOptionalString(filters.requestDate);
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));

  const filteredRequests = requestsWithProfileContext.filter((request) => {
    if (normalizedStatus && normalizedStatus !== "all" && request.status !== normalizedStatus) {
      return false;
    }

    if (hasPurokFilter && request.purok.toLowerCase() !== normalizedPurok) {
      return false;
    }

    if (normalizedRequestDate && buildDateKey(request.createdAt) !== normalizedRequestDate) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      request.fullName,
      request.userId,
      request.digitalIdReference,
      request.purok,
      request.contactNumber,
      request.reason,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const total = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);
  const purokOptions = Array.from(
    new Set(
      requestsWithProfileContext
        .map((request) => request.purok)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return {
    requests: pagedRequests,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
    summary: {
      total,
      pending: filteredRequests.filter((request) => request.status === "pending").length,
      approved: filteredRequests.filter((request) => request.status === "approved").length,
      processing: filteredRequests.filter((request) => request.status === "processing").length,
      readyForPickup: filteredRequests.filter((request) => request.status === "ready_for_pickup").length,
      completed: filteredRequests.filter((request) => request.status === "completed").length,
      rejected: filteredRequests.filter((request) => request.status === "rejected").length,
    },
    filters: {
      purokOptions,
    },
  };
}

export async function updatePhysicalIdRequestByAdmin(
  requestId: string,
  payload: PhysicalIdRequestAdminMutation,
  handledBy: string
) {
  const request = await getPhysicalIdRequestById(requestId);
  if (!request) {
    throw new Error("Physical ID request not found.");
  }

  const adminRemarks = normalizeOptionalString(payload.adminRemarks);
  const rejectionReason = normalizeOptionalString(payload.rejectionReason);
  const nextStatus = payload.status ? normalizePhysicalIdRequestStatus(payload.status) : null;

  if (!nextStatus && !adminRemarks && !rejectionReason) {
    throw new Error("Provide a status change or admin remarks.");
  }

  if (nextStatus && nextStatus !== request.status) {
    const allowedNextStatuses = getAllowedNextStatuses(request.status);
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new Error(`Cannot move a ${buildStatusLabel(request.status).toLowerCase()} request to ${buildStatusLabel(nextStatus).toLowerCase()}.`);
    }
  }

  if ((nextStatus === "rejected" || request.status === "rejected") && !rejectionReason && nextStatus === "rejected") {
    throw new Error("Rejection reason is required when rejecting a request.");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    handledBy: normalizeOptionalString(handledBy) || "admin",
  };

  if (adminRemarks || payload.adminRemarks === "") {
    updateData.adminRemarks = adminRemarks || null;
  }

  if (rejectionReason || payload.rejectionReason === "") {
    updateData.rejectionReason = rejectionReason || null;
  }

  if (nextStatus) {
    updateData.status = nextStatus;

    if (nextStatus === "approved") {
      updateData.approvedAt = FieldValue.serverTimestamp();
    }

    if (nextStatus === "processing") {
      updateData.processingAt = FieldValue.serverTimestamp();
    }

    if (nextStatus === "ready_for_pickup") {
      updateData.readyForPickupAt = FieldValue.serverTimestamp();
    }

    if (nextStatus === "completed") {
      updateData.completedAt = FieldValue.serverTimestamp();
    }

    if (nextStatus === "rejected") {
      updateData.rejectedAt = FieldValue.serverTimestamp();
    }
  }

  await db.collection("physicalIdRequests").doc(requestId).set(updateData, { merge: true });

  const updatedRequest = await getPhysicalIdRequestById(requestId);
  if (!updatedRequest) {
    throw new Error("Physical ID request was updated but could not be reloaded.");
  }

  if (nextStatus && nextStatus !== request.status) {
    await notifyPhysicalIdRequestStatusChange(updatedRequest, request.userId);
  }

  return updatedRequest;
}

async function notifyPhysicalIdRequestStatusChange(
  request: PhysicalIdRequestRecord,
  uid: string
) {
  if (request.status === "approved") {
    await createNotification({
      recipientUid: uid,
      audience: "youth",
      type: "success",
      title: "Physical ID request approved",
      body: "Your request for a physical Digital ID copy has been approved. We will notify you again once it is ready for pick-up.",
      link: "/profile/physical-id-requests",
      metadata: {
        requestId: request.id,
        status: request.status,
      },
    });
    return;
  }

  if (request.status === "rejected") {
    await createNotification({
      recipientUid: uid,
      audience: "youth",
      type: "warning",
      title: "Physical ID request rejected",
      body: request.rejectionReason
        ? `Your physical ID request was rejected: ${request.rejectionReason}`
        : "Your physical ID request was rejected. Please review the remarks for more details.",
      link: "/profile/physical-id-requests",
      metadata: {
        requestId: request.id,
        status: request.status,
        rejectionReason: request.rejectionReason,
      },
    });
    return;
  }

  if (request.status === "ready_for_pickup") {
    await createNotification({
      recipientUid: uid,
      audience: "youth",
      type: "success",
      title: "Physical ID ready for pick-up",
      body: "Your physical Digital ID copy is ready for pick-up at the SK office.",
      link: "/profile/physical-id-requests",
      metadata: {
        requestId: request.id,
        status: request.status,
      },
    });
    return;
  }

  if (request.status === "completed") {
    await createNotification({
      recipientUid: uid,
      audience: "youth",
      type: "success",
      title: "Physical ID request completed",
      body: "Your physical Digital ID request has been marked as completed. Thank you for claiming it.",
      link: "/profile/physical-id-requests",
      metadata: {
        requestId: request.id,
        status: request.status,
      },
    });
  }
}
