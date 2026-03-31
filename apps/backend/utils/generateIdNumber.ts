/**
 * Generates a unique KK ID number in format: KKB-YYYY-XXXX
 */
export function generateIdNumber(userId: string): string {
  const year = new Date().getFullYear();
  const normalized = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = normalized.slice(-4).padStart(4, "0");
  return `KKB-${year}-${suffix}`;
}
