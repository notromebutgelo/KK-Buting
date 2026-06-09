type MerchantLike = {
  id?: string | null;
  name?: string | null;
  pointsRate?: number | string | null;
  status?: string | null;
};

const TOKEN_KEYS = ["token", "qrToken", "signedToken", "qrData", "qrPayload"];

function parsePossibleJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function decodePossibleUriPayload(value: string) {
  try {
    const decoded = decodeURIComponent(value);
    return decoded !== value ? decoded : null;
  } catch {
    return null;
  }
}

function extractTokenFromUrl(value: string, depth: number): string {
  const candidates = [value];

  if (value.startsWith("/")) {
    candidates.push(`https://kk.local${value}`);
  }

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      for (const key of TOKEN_KEYS) {
        const token = parsed.searchParams.get(key);
        if (token) {
          return extractScanTokenValue(token, depth + 1);
        }
      }

      const hash = parsed.hash.replace(/^#/, "");
      if (hash) {
        const hashAsUrl = hash.startsWith("/") ? `https://kk.local${hash}` : `https://kk.local/?${hash}`;
        const token = extractTokenFromUrl(hashAsUrl, depth + 1);
        if (token) return token;
      }
    } catch {
      // Not a URL-shaped payload.
    }
  }

  return "";
}

function extractTokenFromRecord(record: Record<string, unknown>, depth: number): string {
  for (const key of TOKEN_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      const extracted = extractScanTokenValue(value, depth + 1);
      return extracted || value.trim();
    }
  }

  return "";
}

function extractScanTokenValue(value: string, depth: number): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (depth > 5) return trimmed;

  const decodedPayload = decodePossibleUriPayload(trimmed);
  if (decodedPayload) {
    const extracted = extractScanTokenValue(decodedPayload, depth + 1);
    if (extracted) return extracted;
  }

  const urlToken = extractTokenFromUrl(trimmed, depth);
  if (urlToken) return urlToken;

  const parsed = parsePossibleJson(trimmed);
  if (typeof parsed === "string") {
    return extractScanTokenValue(parsed, depth + 1);
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const extracted = extractTokenFromRecord(parsed as Record<string, unknown>, depth + 1);
    if (extracted) return extracted;
  }

  return trimmed;
}

export function extractScanToken(rawValue: string): string {
  return extractScanTokenValue(rawValue, 0);
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
