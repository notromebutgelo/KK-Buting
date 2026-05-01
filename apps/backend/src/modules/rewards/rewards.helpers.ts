type AnyRecord = Record<string, any>;

export function normalizeString(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function buildMerchantName(merchant: AnyRecord | null | undefined): string {
  if (!merchant) return "Unknown Merchant";
  return String(merchant.businessName || merchant.name || "Unknown Merchant");
}

export function buildMerchantImage(merchant: AnyRecord | null | undefined): string {
  if (!merchant) return "";
  return String(merchant.logoUrl || merchant.imageUrl || merchant.bannerUrl || "");
}

export function buildRewardImage(
  reward: AnyRecord,
  merchant: AnyRecord | null | undefined
): string {
  return String(reward.imageUrl || merchant?.bannerUrl || merchant?.imageUrl || merchant?.logoUrl || "");
}

export function resolveRewardExpiryDate(reward: AnyRecord): string | null {
  const value = reward.expiryDate || reward.expiresAt || null;
  return value ? String(value) : null;
}

export function isRewardExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const time = new Date(expiryDate).getTime();
  return !Number.isNaN(time) && time < Date.now();
}

export function resolveRewardStatus(reward: AnyRecord): "active" | "inactive" | "expired" {
  const expiryDate = resolveRewardExpiryDate(reward);
  const stock = reward.unlimitedStock ? null : Number(reward.stock ?? reward.remainingStock ?? 0);
  const isActive = reward.isActive !== false;

  if (isRewardExpired(expiryDate)) return "expired";
  if (!isActive) return "inactive";
  if (!reward.unlimitedStock && stock != null && stock <= 0) return "inactive";
  return "active";
}

export function computeVoucherExpiry(reward: AnyRecord, redeemedAt: Date): string {
  const validDays = Math.max(1, Number(reward.validDays || 30));
  const voucherExpiry = new Date(redeemedAt);
  voucherExpiry.setDate(voucherExpiry.getDate() + validDays);

  const rewardExpiry = resolveRewardExpiryDate(reward);
  if (!rewardExpiry) return voucherExpiry.toISOString();

  const rewardExpiryTime = new Date(rewardExpiry).getTime();
  if (Number.isNaN(rewardExpiryTime)) return voucherExpiry.toISOString();

  return new Date(Math.min(voucherExpiry.getTime(), rewardExpiryTime)).toISOString();
}

export function resolveRewardRedemptionStatus(
  transaction: AnyRecord,
  reward: AnyRecord = {}
): { status: "active" | "claimed" | "expired"; expiresAt: string } {
  const expiresAt = String(
    transaction.expiresAt || computeVoucherExpiry(reward, new Date(transaction.createdAt || Date.now()))
  );
  const expiresAtTime = new Date(expiresAt).getTime();
  const status =
    String(transaction.redemptionStatus || "").toLowerCase() === "claimed"
      ? "claimed"
      : !Number.isNaN(expiresAtTime) && expiresAtTime < Date.now()
        ? "expired"
        : "active";

  return { status, expiresAt };
}
