type AnyRecord = Record<string, any>;

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
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
    pointsRate: Number(merchant.pointsRate || merchant.pointsRatePeso || 10),
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
    "discountInfo",
    "termsAndConditions",
    "pointsPolicy",
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

export function normalizeMerchantAssetType(assetType: string): "logo" | "banner" {
  return assetType === "banner" ? "banner" : "logo";
}

export function getInlineAssetLimit(assetType: "logo" | "banner"): number {
  return assetType === "logo" ? 400_000 : 550_000;
}
