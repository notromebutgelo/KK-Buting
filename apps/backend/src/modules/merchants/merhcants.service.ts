import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { storage } from "../../config/firebase";
import { setUserRole } from "../auth/user.service";
import { randomUUID } from "crypto";

type AnyRecord = Record<string, any>;

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

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function normalizeMerchant(record: AnyRecord): AnyRecord {
  const merchant = serializeRecord(record) as AnyRecord;
  return {
    ...merchant,
    name: merchant.name || merchant.businessName || "Merchant",
    businessName: merchant.businessName || merchant.name || "Merchant",
    description: merchant.description || merchant.shortDescription || "",
    shortDescription: merchant.shortDescription || merchant.description || "",
    imageUrl: merchant.imageUrl || merchant.bannerUrl || merchant.logoUrl || "",
    bannerUrl: merchant.bannerUrl || merchant.imageUrl || "",
    pointsRate: Number(merchant.pointsRate || merchant.pointsRatePeso || 50),
  };
}

function normalizePromotion(record: AnyRecord): AnyRecord {
  const promotion = serializeRecord(record) as AnyRecord;
  return {
    id: String(promotion.id || ""),
    title: String(promotion.title || "Untitled Promo"),
    shortTagline: String(promotion.shortTagline || ""),
    bannerUrl: String(promotion.bannerUrl || ""),
    startDate: String(promotion.startDate || ""),
    endDate: String(promotion.endDate || ""),
    type: String(promotion.type || "discount"),
    valueLabel: String(promotion.valueLabel || ""),
    availability: String(promotion.availability || "dine-in"),
    terms: normalizeStringList(promotion.terms),
    isActive: promotion.isActive !== false,
    redemptions: Number(promotion.redemptions || 0),
    views: Number(promotion.views || 0),
    createdAt: String(promotion.createdAt || promotion.updatedAt || ""),
    updatedAt: String(promotion.updatedAt || promotion.createdAt || ""),
  };
}

function normalizeProduct(record: AnyRecord): AnyRecord {
  const product = serializeRecord(record) as AnyRecord;
  return {
    id: String(product.id || ""),
    name: String(product.name || "Untitled Product"),
    price: Number(product.price || 0),
    category: String(product.category || ""),
    description: String(product.description || ""),
    imageUrl: String(product.imageUrl || ""),
    isActive: product.isActive !== false,
    createdAt: String(product.createdAt || product.updatedAt || ""),
    updatedAt: String(product.updatedAt || product.createdAt || ""),
  };
}

async function getOwnedMerchantSnapshot(ownerId: string) {
  const snap = await db.collection("merchants").where("ownerId", "==", ownerId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0];
}

async function getMerchantProducts(merchantId: string, publicOnly = false) {
  const snap = await db.collection("merchants").doc(merchantId).collection("products").get();
  return snap.docs
    .map((doc) => normalizeProduct({ id: doc.id, ...doc.data() }))
    .filter((product) => (publicOnly ? product.isActive !== false : true))
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

async function getMerchantPromotions(merchantId: string, publicOnly = false) {
  const snap = await db.collection("merchants").doc(merchantId).collection("promotions").get();
  const now = Date.now();

  return snap.docs
    .map((doc) => normalizePromotion({ id: doc.id, ...doc.data() }))
    .filter((promotion) => {
      if (!publicOnly) return true;
      if (promotion.isActive === false) return false;
      const endDate = promotion.endDate ? new Date(String(promotion.endDate)).getTime() : null;
      return endDate == null || Number.isNaN(endDate) || endDate >= now;
    })
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function buildMerchantPayload(data: Record<string, unknown>) {
  const payload: AnyRecord = {};
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
    "businessInfo",
    "contactNumber",
    "discountInfo",
    "termsAndConditions",
    "ownerName",
    "ownerEmail",
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key) && value !== undefined) {
      payload[key] = value;
    }
  }

  if (!payload.name && payload.businessName) payload.name = payload.businessName;
  if (!payload.businessName && payload.name) payload.businessName = payload.name;
  if (!payload.description && payload.shortDescription) payload.description = payload.shortDescription;
  if (!payload.shortDescription && payload.description) payload.shortDescription = payload.description;

  return payload;
}

function buildPromotionPayload(data: Record<string, unknown>) {
  const payload: AnyRecord = {};
  const allowedKeys = [
    "title",
    "shortTagline",
    "bannerUrl",
    "startDate",
    "endDate",
    "type",
    "valueLabel",
    "availability",
    "isActive",
    "redemptions",
    "views",
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key) && value !== undefined) {
      payload[key] = value;
    }
  }

  if (data.terms !== undefined) {
    payload.terms = normalizeStringList(data.terms);
  }

  if (payload.isActive !== undefined) {
    payload.isActive = Boolean(payload.isActive);
  }

  if (payload.redemptions !== undefined) {
    payload.redemptions = Number(payload.redemptions || 0);
  }

  if (payload.views !== undefined) {
    payload.views = Number(payload.views || 0);
  }

  return payload;
}

function buildProductPayload(data: Record<string, unknown>) {
  const payload: AnyRecord = {};
  const allowedKeys = ["name", "price", "category", "description", "imageUrl", "isActive"];

  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key) && value !== undefined) {
      payload[key] = value;
    }
  }

  if (payload.price !== undefined) {
    payload.price = Number(payload.price || 0);
  }

  if (payload.isActive !== undefined) {
    payload.isActive = Boolean(payload.isActive);
  }

  return payload;
}

function normalizeMerchantAssetType(assetType: string) {
  return assetType === "banner" ? "banner" : "logo";
}

function getMerchantAssetBucketCandidates() {
  const primaryBucketName = storage.bucket().name;
  const candidates = [primaryBucketName];

  if (primaryBucketName.endsWith(".appspot.com")) {
    candidates.push(primaryBucketName.replace(/\.appspot\.com$/, ".firebasestorage.app"));
  } else if (primaryBucketName.endsWith(".firebasestorage.app")) {
    candidates.push(primaryBucketName.replace(/\.firebasestorage\.app$/, ".appspot.com"));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function getInlineAssetLimit(assetType: "logo" | "banner") {
  return assetType === "logo" ? 400_000 : 550_000;
}

async function uploadMerchantAssetFromBase64(
  ownerId: string,
  assetType: "logo" | "banner",
  fileData: string
) {
  const match = fileData.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid file data format");
  }

  const mimeType = match[1];
  const base64Payload = match[2];
  const extension = mimeType.split("/")[1] || "jpg";
  const filePath = `merchant-assets/${ownerId}/${assetType}-${Date.now()}.${extension}`;
  const downloadToken = randomUUID();
  let lastError: Error | null = null;

  for (const bucketName of getMerchantAssetBucketCandidates()) {
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

      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        filePath
      )}?alt=media&token=${downloadToken}`;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error || "Upload failed"));
      if (!String(error?.message || "").includes("bucket does not exist")) {
        throw error;
      }
    }
  }

  if (fileData.length <= getInlineAssetLimit(assetType)) {
    return fileData;
  }

  throw new Error(
    "Firebase Storage bucket is not available, and this image is too large for the inline fallback. Enable Firebase Storage for this project or choose a smaller image."
  );
}

export async function getAllMerchants() {
  const snap = await db.collection("merchants").where("status", "==", "approved").get();
  return snap.docs.map((doc) => normalizeMerchant({ id: doc.id, ...doc.data() }));
}

export async function getMerchantById(id: string, options?: { includePrivate?: boolean }): Promise<AnyRecord | null> {
  const snap = await db.collection("merchants").doc(id).get();
  if (!snap.exists) return null;

  const merchant = normalizeMerchant({ id: snap.id, ...snap.data() });
  if (!options?.includePrivate && merchant.status !== "approved") {
    return null;
  }

  const [promotions, products] = await Promise.all([
    getMerchantPromotions(id, !options?.includePrivate),
    getMerchantProducts(id, !options?.includePrivate),
  ]);

  return {
    ...merchant,
    promotions,
    products,
  };
}

export async function getMerchantByOwnerId(ownerId: string): Promise<AnyRecord | null> {
  const doc = await getOwnedMerchantSnapshot(ownerId);
  if (!doc) return null;
  return getMerchantById(doc.id, { includePrivate: true });
}

export async function createMerchant(data: Record<string, unknown>) {
  const ownerId = String(data.ownerId || "");
  const payload = buildMerchantPayload(data);

  const ref = await db.collection("merchants").add({
    ...payload,
    ownerId,
    status: "pending",
    pointsRate: Number(data.pointsRate || 50),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (ownerId) {
    await setUserRole(ownerId, "merchant");
  }

  return ref.id;
}

export async function updateMerchantProfileByOwner(ownerId: string, data: Record<string, unknown>) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const payload = buildMerchantPayload(data);
  if (!Object.prototype.hasOwnProperty.call(payload, "imageUrl")) {
    payload.imageUrl = String(payload.bannerUrl || payload.logoUrl || "");
  } else {
    payload.imageUrl = String(payload.imageUrl || payload.bannerUrl || payload.logoUrl || "");
  }
  payload.updatedAt = FieldValue.serverTimestamp();

  await db.collection("merchants").doc(merchantDoc.id).set(payload, { merge: true });
  return getMerchantById(merchantDoc.id, { includePrivate: true });
}

export async function uploadMerchantAssetByOwner(ownerId: string, assetType: string, fileData: string) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const normalizedAssetType = normalizeMerchantAssetType(String(assetType || ""));
  const fileUrl = await uploadMerchantAssetFromBase64(ownerId, normalizedAssetType, fileData);
  const current = merchantDoc.data() || {};
  const fieldName = normalizedAssetType === "banner" ? "bannerUrl" : "logoUrl";
  const updatePayload: AnyRecord = {
    [fieldName]: fileUrl,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (normalizedAssetType === "banner" || !current.imageUrl) {
    updatePayload.imageUrl = fileUrl;
  }

  await merchantDoc.ref.set(updatePayload, { merge: true });

  return {
    assetType: normalizedAssetType,
    fileUrl,
  };
}

export async function getMerchantPromotionsByOwner(ownerId: string) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  return getMerchantPromotions(merchantDoc.id);
}

export async function createMerchantPromotionByOwner(ownerId: string, data: Record<string, unknown>) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const payload = buildPromotionPayload(data);
  const ref = await db.collection("merchants").doc(merchantDoc.id).collection("promotions").add({
    title: String(payload.title || "Untitled Promo"),
    shortTagline: String(payload.shortTagline || ""),
    bannerUrl: String(payload.bannerUrl || ""),
    startDate: String(payload.startDate || ""),
    endDate: String(payload.endDate || ""),
    type: String(payload.type || "discount"),
    valueLabel: String(payload.valueLabel || ""),
    availability: String(payload.availability || "dine-in"),
    terms: normalizeStringList(payload.terms),
    isActive: payload.isActive !== false,
    redemptions: Number(payload.redemptions || 0),
    views: Number(payload.views || 0),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdSnap = await ref.get();
  return normalizePromotion({ id: createdSnap.id, ...createdSnap.data() });
}

export async function updateMerchantPromotionByOwner(
  ownerId: string,
  promotionId: string,
  data: Record<string, unknown>
) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const promotionRef = db.collection("merchants").doc(merchantDoc.id).collection("promotions").doc(promotionId);
  const promotionSnap = await promotionRef.get();
  if (!promotionSnap.exists) {
    throw new Error("Promotion not found");
  }

  const payload = buildPromotionPayload(data);
  payload.updatedAt = FieldValue.serverTimestamp();

  await promotionRef.set(payload, { merge: true });
  const updatedSnap = await promotionRef.get();
  return normalizePromotion({ id: updatedSnap.id, ...updatedSnap.data() });
}

export async function deleteMerchantPromotionByOwner(ownerId: string, promotionId: string) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const promotionRef = db.collection("merchants").doc(merchantDoc.id).collection("promotions").doc(promotionId);
  const promotionSnap = await promotionRef.get();
  if (!promotionSnap.exists) {
    throw new Error("Promotion not found");
  }

  await promotionRef.delete();
}

export async function getMerchantProductsByOwner(ownerId: string) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  return getMerchantProducts(merchantDoc.id);
}

export async function createMerchantProductByOwner(ownerId: string, data: Record<string, unknown>) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const payload = buildProductPayload(data);
  const ref = await db.collection("merchants").doc(merchantDoc.id).collection("products").add({
    name: String(payload.name || "Untitled Product"),
    price: Number(payload.price || 0),
    category: String(payload.category || ""),
    description: String(payload.description || ""),
    imageUrl: String(payload.imageUrl || ""),
    isActive: payload.isActive !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdSnap = await ref.get();
  return normalizeProduct({ id: createdSnap.id, ...createdSnap.data() });
}

export async function updateMerchantProductByOwner(ownerId: string, productId: string, data: Record<string, unknown>) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const productRef = db.collection("merchants").doc(merchantDoc.id).collection("products").doc(productId);
  const productSnap = await productRef.get();
  if (!productSnap.exists) {
    throw new Error("Product not found");
  }

  const payload = buildProductPayload(data);
  payload.updatedAt = FieldValue.serverTimestamp();

  await productRef.set(payload, { merge: true });
  const updatedSnap = await productRef.get();
  return normalizeProduct({ id: updatedSnap.id, ...updatedSnap.data() });
}

export async function deleteMerchantProductByOwner(ownerId: string, productId: string) {
  const merchantDoc = await getOwnedMerchantSnapshot(ownerId);
  if (!merchantDoc) {
    throw new Error("Merchant profile not found");
  }

  const productRef = db.collection("merchants").doc(merchantDoc.id).collection("products").doc(productId);
  const productSnap = await productRef.get();
  if (!productSnap.exists) {
    throw new Error("Product not found");
  }

  await productRef.delete();
}

export async function getMerchantTransactionsByOwner(ownerId: string) {
  const merchant = await getMerchantByOwnerId(ownerId);
  if (!merchant) {
    throw new Error("Merchant profile not found");
  }

  const [transactionsSnap, usersSnap] = await Promise.all([
    db.collection("transactions").where("merchantId", "==", String(merchant.id)).get(),
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

export async function updateMerchantStatus(id: string, status: "approved" | "rejected") {
  await db.collection("merchants").doc(id).update({ status, updatedAt: FieldValue.serverTimestamp() });
}
