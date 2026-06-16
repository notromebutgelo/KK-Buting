import { NextFunction, Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { AuthRequest } from "../../middleware/verifyToken";

type AnyRecord = Record<string, any>;

export interface AuditLogInput {
  actorUid?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  status?: "success" | "failed";
  summary: string;
  metadata?: AnyRecord | null;
}

export interface AuditLogFilters {
  actor?: string;
  module?: string;
  action?: string;
  target?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  exportLimit?: number;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "temporaryPassword",
  "token",
  "idToken",
  "refreshToken",
  "fileData",
]);

function toIso(value: any): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return null;
}

function sanitize(value: any): any {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitize(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.has(key))
      .map(([key, entry]) => [key, sanitize(entry)])
  );
}

function serializeAuditLog(id: string, data: AnyRecord) {
  return {
    id,
    createdAt: toIso(data.createdAt),
    actorUid: data.actorUid || null,
    actorEmail: data.actorEmail || null,
    actorRole: data.actorRole || null,
    action: String(data.action || ""),
    module: String(data.module || ""),
    targetType: data.targetType || null,
    targetId: data.targetId || null,
    targetLabel: data.targetLabel || null,
    status: String(data.status || "success"),
    summary: String(data.summary || ""),
    metadata: data.metadata || null,
  };
}

type SerializedAuditLog = ReturnType<typeof serializeAuditLog>;
type DocumentCache = Map<string, Promise<AnyRecord | null>>;

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function buildPersonName(data: AnyRecord | null | undefined) {
  if (!data) return "";
  return [
    pickText(data.firstName),
    pickText(data.middleName),
    pickText(data.lastName),
    pickText(data.suffix),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function combineNameAndEmail(name: string, email: string) {
  if (name && email && normalize(name) !== normalize(email)) {
    return `${name} (${email})`;
  }
  return name || email;
}

function labelFromUser(data: AnyRecord | null | undefined) {
  if (!data) return "";
  return combineNameAndEmail(
    pickText(data.UserName, data.displayName, data.fullName, buildPersonName(data)),
    pickText(data.email)
  );
}

function labelFromProfile(profile: AnyRecord | null | undefined, user?: AnyRecord | null) {
  const name = pickText(profile?.fullName, buildPersonName(profile), user?.UserName, user?.displayName);
  const email = pickText(profile?.email, user?.email);
  return combineNameAndEmail(name, email);
}

function labelFromMerchant(data: AnyRecord | null | undefined) {
  if (!data) return "";
  return combineNameAndEmail(
    pickText(data.name, data.businessName, data.storeName, data.displayName),
    pickText(data.ownerEmail, data.email)
  );
}

function labelFromReward(data: AnyRecord | null | undefined) {
  if (!data) return "";
  return pickText(data.title, data.name, data.rewardTitle);
}

function labelFromTransaction(data: AnyRecord | null | undefined) {
  if (!data) return "";
  const reward = pickText(data.rewardTitle, data.rewardName);
  const member = pickText(data.userName, data.memberName, data.userEmail);
  if (reward && member) return `${reward} for ${member}`;
  return reward || member;
}

function labelFromPhysicalIdRequest(data: AnyRecord | null | undefined) {
  if (!data) return "";
  return combineNameAndEmail(
    pickText(data.fullName, data.memberName),
    pickText(data.digitalIdReference, data.userId)
  );
}

function inferTargetLabelFromMetadata(module: string, metadata: AnyRecord | null | undefined) {
  const body = metadata?.body && typeof metadata.body === "object" ? metadata.body : {};

  if (module === "admin-accounts") {
    return combineNameAndEmail(pickText(body.displayName, body.UserName), pickText(body.email));
  }

  if (module === "merchants") {
    return labelFromMerchant(body);
  }

  if (module === "rewards") {
    return labelFromReward(body);
  }

  if (module === "physical-id-requests") {
    return labelFromPhysicalIdRequest(body);
  }

  return "";
}

async function getCachedDocument(collection: string, id: string, cache: DocumentCache) {
  const key = `${collection}/${id}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      db.collection(collection)
        .doc(id)
        .get()
        .then((snap) => (snap.exists ? ({ id: snap.id, ...snap.data() } as AnyRecord) : null))
    );
  }
  return cache.get(key)!;
}

async function resolveProfileLabel(userId: string, cache: DocumentCache) {
  const [profile, user] = await Promise.all([
    getCachedDocument("kkProfiling", userId, cache),
    getCachedDocument("users", userId, cache),
  ]);
  return labelFromProfile(profile, user);
}

async function resolveAuditTargetLabel(log: SerializedAuditLog, cache: DocumentCache): Promise<SerializedAuditLog> {
  if (log.targetLabel) return log;

  const metadataLabel = inferTargetLabelFromMetadata(log.module, log.metadata);
  if (metadataLabel) {
    return { ...log, targetLabel: metadataLabel };
  }

  if (!log.targetId) return log;

  const module = normalize(log.module);
  const targetType = normalize(log.targetType);
  const targetId = String(log.targetId);
  let targetLabel = "";

  if (module === "admin-accounts" || targetType === "admin-accounts") {
    targetLabel = labelFromUser(await getCachedDocument("users", targetId, cache));
  } else if (["verification", "youth", "digital-ids"].includes(module)) {
    targetLabel = await resolveProfileLabel(targetId, cache);
  } else if (module === "merchants" || targetType === "merchants") {
    targetLabel = labelFromMerchant(await getCachedDocument("merchants", targetId, cache));
  } else if (module === "rewards" || targetType === "rewards") {
    targetLabel = labelFromReward(await getCachedDocument("rewards", targetId, cache));
  } else if (module === "physical-id-requests" || targetType === "physical-id-requests") {
    targetLabel = labelFromPhysicalIdRequest(await getCachedDocument("physicalIdRequests", targetId, cache));
  } else if (module === "points-transactions" || targetType === "points-transactions") {
    targetLabel = labelFromTransaction(await getCachedDocument("transactions", targetId, cache));
  }

  return targetLabel ? { ...log, targetLabel } : log;
}

async function enrichAuditTargetLabels(logs: SerializedAuditLog[]) {
  const cache: DocumentCache = new Map();
  return Promise.all(logs.map((log) => resolveAuditTargetLabel(log, cache).catch(() => log)));
}

function parseDate(value?: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesFilters(log: SerializedAuditLog, filters: AuditLogFilters) {
  const actor = normalize(filters.actor);
  const module = normalize(filters.module);
  const action = normalize(filters.action);
  const target = normalize(filters.target);
  const status = normalize(filters.status);
  const search = normalize(filters.search);
  const dateFrom = parseDate(filters.dateFrom);
  const dateTo = parseDate(filters.dateTo, true);
  const createdAt = log.createdAt ? new Date(log.createdAt) : null;

  if (actor && !normalize(`${log.actorEmail} ${log.actorUid}`).includes(actor)) return false;
  if (module && module !== "all" && normalize(log.module) !== module) return false;
  if (action && action !== "all" && normalize(log.action) !== action) return false;
  if (status && status !== "all" && normalize(log.status) !== status) return false;
  if (target && !normalize(`${log.targetType} ${log.targetId} ${log.targetLabel}`).includes(target)) return false;
  if (dateFrom && (!createdAt || createdAt < dateFrom)) return false;
  if (dateTo && (!createdAt || createdAt > dateTo)) return false;
  if (
    search &&
    !normalize(
      `${log.actorEmail} ${log.action} ${log.module} ${log.targetType} ${log.targetId} ${log.targetLabel} ${log.summary}`
    ).includes(search)
  ) {
    return false;
  }

  return true;
}

export async function createAuditLog(input: AuditLogInput) {
  const ref = await db.collection("auditLogs").add({
    actorUid: input.actorUid || null,
    actorEmail: input.actorEmail || null,
    actorRole: input.actorRole || null,
    action: input.action,
    module: input.module,
    targetType: input.targetType || null,
    targetId: input.targetId || null,
    targetLabel: input.targetLabel || null,
    status: input.status || "success",
    summary: input.summary,
    metadata: sanitize(input.metadata || null),
    createdAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize || 25)));
  const fetchLimit = Math.max(page * pageSize, Number(filters.exportLimit || 0), 500);
  const snap = await db.collection("auditLogs").orderBy("createdAt", "desc").limit(fetchLimit).get();
  const logs = await enrichAuditTargetLabels(
    snap.docs.map((doc) => serializeAuditLog(doc.id, doc.data() || {}))
  );
  const filtered = logs.filter((log) => matchesFilters(log, filters));
  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return {
    logs: filtered.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function exportAuditLogsCsv(filters: AuditLogFilters = {}) {
  const result = await listAuditLogs({
    ...filters,
    page: 1,
    pageSize: Math.min(2000, Number(filters.exportLimit || 2000)),
    exportLimit: Math.min(2000, Number(filters.exportLimit || 2000)),
  });

  const headers = [
    "createdAt",
    "actorEmail",
    "actorRole",
    "module",
    "action",
    "targetType",
    "targetId",
    "targetLabel",
    "status",
    "summary",
  ];

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(","),
    ...result.logs.map((log) =>
      headers.map((header) => escape((log as AnyRecord)[header])).join(",")
    ),
  ].join("\n");
}

function inferModule(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[0] || "admin";
}

function inferAction(method: string, path: string) {
  const cleaned = path.toLowerCase();
  const verb = method.toUpperCase();

  if (cleaned.includes("reset-password")) return "reset_password";
  if (cleaned.includes("bulk-approve")) return "bulk_approve";
  if (cleaned.includes("approve")) return "approve";
  if (cleaned.includes("reject")) return "reject";
  if (cleaned.includes("request-resubmission")) return "request_resubmission";
  if (cleaned.includes("generate")) return "generate";
  if (cleaned.includes("regenerate")) return "regenerate";
  if (cleaned.includes("deactivate")) return "deactivate";
  if (cleaned.includes("submit")) return "submit";
  if (cleaned.includes("status")) return "update_status";
  if (cleaned.includes("archive")) return "archive";
  if (cleaned.includes("points-adjustments")) return "adjust_points";
  if (cleaned.includes("assets")) return verb === "DELETE" ? "delete_asset" : "upload_asset";
  if (cleaned.includes("products")) return verb === "DELETE" ? "delete_product" : verb === "POST" ? "create_product" : "update_product";
  if (cleaned.includes("promotions")) return verb === "DELETE" ? "delete_promotion" : verb === "POST" ? "create_promotion" : "update_promotion";
  if (verb === "POST") return "create";
  if (verb === "PATCH" || verb === "PUT") return "update";
  if (verb === "DELETE") return "delete";
  return verb.toLowerCase();
}

function inferTarget(req: AuthRequest) {
  const params = req.params || {};
  const targetId =
    params.uid ||
    params.userId ||
    params.merchantId ||
    params.rewardId ||
    params.transactionId ||
    params.requestId ||
    params.documentId ||
    params.promotionId ||
    params.productId ||
    null;

  return {
    targetType: targetId ? inferModule(req.route?.path ? String(req.route.path) : req.path) : undefined,
    targetId: targetId ? String(targetId) : undefined,
  };
}

export function auditAdminMutation(req: AuthRequest, res: Response, next: NextFunction) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method.toUpperCase())) {
    return next();
  }

  const startedAt = Date.now();

  res.on("finish", () => {
    const relativePath = req.originalUrl.replace(/^\/api\/admin\/?/, "").split("?")[0] || "admin";
    const module = inferModule(relativePath);
    const action = inferAction(req.method, relativePath);
    const target = inferTarget(req);
    const status = res.statusCode >= 200 && res.statusCode < 400 ? "success" : "failed";
    const metadata = {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      params: sanitize(req.params || {}),
      query: sanitize(req.query || {}),
      body: sanitize(req.body || {}),
    };

    void createAuditLog({
      actorUid: req.user?.uid,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action,
      module,
      ...target,
      targetLabel: inferTargetLabelFromMetadata(module, metadata),
      status,
      summary: `${req.method.toUpperCase()} /api/admin/${relativePath} ${status}`,
      metadata,
    }).catch(() => undefined);
  });

  return next();
}
