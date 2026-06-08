type AnyRecord = Record<string, any>;
export type MerchantAssetType = "logo" | "banner" | "gallery" | "product" | "promotion";

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function normalizeTextBlock(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean).join("\n");
  }

  return String(value || "");
}

export function normalizeMerchant(record: AnyRecord): AnyRecord {
  const merchant = { ...record };
  return {
    ...merchant,
    name: merchant.name || merchant.businessName || "Merchant",
    businessName: merchant.businessName || merchant.name || "Merchant",
    description: merchant.description || merchant.shortDescription || "",
    shortDescription: merchant.shortDescription || merchant.description || "",
    imageUrl: merchant.imageUrl || merchant.bannerUrl || merchant.logoUrl || "",
    bannerUrl: merchant.bannerUrl || merchant.imageUrl || "",
    galleryUrls: normalizeStringList(merchant.galleryUrls),
    operatingHours: normalizeTextBlock(merchant.operatingHours),
    locationDetails: normalizeTextBlock(merchant.locationDetails),
    email: String(merchant.email || merchant.contactEmail || ""),
    websiteUrl: String(merchant.websiteUrl || ""),
    facebookUrl: String(merchant.facebookUrl || ""),
    mapUrl: String(merchant.mapUrl || ""),
    isFeatured: merchant.isFeatured === true,
    pointsRate: Number(merchant.pointsRate || merchant.pointsRatePeso || 10),
    termsAndConditions: normalizeTextBlock(merchant.termsAndConditions),
    pointsPolicy:
      merchant.pointsPolicy ||
      "Earn 10 points for every PHP 100 spent at this shop. Present your youth QR during checkout.",
  };
}

export function buildMerchantPayload(data: Record<string, unknown>): AnyRecord {
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
    "email",
    "websiteUrl",
    "facebookUrl",
    "mapUrl",
    "operatingHours",
    "locationDetails",
    "discountInfo",
    "termsAndConditions",
    "pointsPolicy",
    "ownerName",
    "ownerEmail",
    "isFeatured",
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key) && value !== undefined) {
      if (key === "termsAndConditions" && Array.isArray(value)) {
        payload[key] = value.map((entry) => String(entry || "").trim()).filter(Boolean).join("\n");
      } else {
        payload[key] = value;
      }
    }
  }

  if (data.galleryUrls !== undefined) {
    payload.galleryUrls = normalizeStringList(data.galleryUrls);
  }

  if (payload.isFeatured !== undefined) {
    payload.isFeatured = Boolean(payload.isFeatured);
  }

  if (!payload.name && payload.businessName) payload.name = payload.businessName;
  if (!payload.businessName && payload.name) payload.businessName = payload.name;
  if (!payload.description && payload.shortDescription) payload.description = payload.shortDescription;
  if (!payload.shortDescription && payload.description) payload.shortDescription = payload.description;

  return payload;
}

export function normalizeMerchantAssetType(assetType: string): MerchantAssetType {
  if (["banner", "gallery", "product", "promotion"].includes(assetType)) {
    return assetType as MerchantAssetType;
  }
  return "logo";
}

export function getInlineAssetLimit(assetType: MerchantAssetType): number {
  if (assetType === "logo") return 400_000;
  if (assetType === "banner") return 550_000;
  return 700_000;
}
