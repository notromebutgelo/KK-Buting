import { db } from "../../config/firebase";

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateClaimToken(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `KKB-${suffix}`;
}

export async function generateUniqueToken(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const token = generateClaimToken();
    const snap = await db
      .collection("voucherClaims")
      .where("token", "==", token)
      .limit(1)
      .get();
    if (snap.empty) return token;
  }
  throw new Error("Failed to generate a unique claim token");
}
