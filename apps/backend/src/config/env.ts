import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const rawPrivateKey =
  process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_BASE64 || "";

const decodedPrivateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
  ? Buffer.from(rawPrivateKey, "base64").toString("utf8")
  : rawPrivateKey;

export const ENV = {
  PORT: process.env.PORT || 4000,
  FIREBASE_PROJECT_ID:
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: decodedPrivateKey.replace(/\\n/g, "\n"),
  FIREBASE_DATABASE_ID: process.env.FIREBASE_DATABASE_ID || "kkprofiling",
  FIREBASE_STORAGE_BUCKET:
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ""}.appspot.com`,
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
};
