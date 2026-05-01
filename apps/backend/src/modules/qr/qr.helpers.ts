type MerchantLike = {
  id?: string | null;
  name?: string | null;
  pointsRate?: number | string | null;
  status?: string | null;
};

export function extractScanToken(rawValue: string): string {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as {
      token?: string;
      qrToken?: string;
      signedToken?: string;
    };

    return String(parsed.token || parsed.qrToken || parsed.signedToken || "").trim();
  } catch {
    return trimmed;
  }
}

export function getPointsFromAmount(amountSpent: number, pointsRate: number): number {
  return Math.max(1, Math.floor(amountSpent / Math.max(1, pointsRate)));
}

export function assertMerchantCanRedeem<T extends MerchantLike>(
  merchant: T | null | undefined
): T {
  if (!merchant) {
    throw new Error("Merchant profile not found");
  }

  if (merchant.status === "pending") {
    throw new Error("Merchant account is pending approval");
  }

  if (merchant.status === "suspended") {
    throw new Error("Merchant account is suspended");
  }

  if (merchant.status !== "approved") {
    throw new Error("Merchant account is not approved");
  }

  return merchant;
}
