import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

type RuntimeNodeEnv = "development" | "production" | "test";

function resolveNodeEnv(): RuntimeNodeEnv {
  const raw = String(process.env.NODE_ENV || (process.env.CI ? "test" : "development")).toLowerCase();
  if (raw === "production" || raw === "test") {
    return raw;
  }
  return "development";
}

function readString(name: string, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readNumber(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue || !rawValue.trim()) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer.`);
  }

  return parsedValue;
}

function normalizeOrigin(name: string, value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return parsed.origin;
  } catch {
    throw new Error(`Invalid ${name}: expected an absolute http(s) URL.`);
  }
}

function readOrigin(name: string, fallback = "") {
  const value = readString(name, fallback);
  return value ? normalizeOrigin(name, value) : "";
}

function parseOriginList(value: string) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin("CORS_ALLOWED_ORIGINS", origin));
}

function requireInProduction(name: string, value: string) {
  if (NODE_ENV === "production" && !value) {
    throw new Error(`Missing required production environment variable: ${name}`);
  }
  return value;
}

const NODE_ENV = resolveNodeEnv();
const isProduction = NODE_ENV === "production";

const rawPrivateKey = readString("FIREBASE_PRIVATE_KEY_BASE64") || readString("FIREBASE_PRIVATE_KEY");
const decodedPrivateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
  ? Buffer.from(rawPrivateKey, "base64").toString("utf8")
  : rawPrivateKey;

const firebaseProjectId = readString(
  "FIREBASE_PROJECT_ID",
  !isProduction ? readString("NEXT_PUBLIC_FIREBASE_PROJECT_ID") : "",
);
const firebaseStorageBucket = readString(
  "FIREBASE_STORAGE_BUCKET",
  !isProduction
    ? readString("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseProjectId ? `${firebaseProjectId}.appspot.com` : "")
    : "",
);
const legacyClientUrl = readOrigin("CLIENT_URL", !isProduction ? "http://localhost:3000" : "");
const adminPanelUrl = readOrigin("ADMIN_PANEL_URL", !isProduction ? "http://localhost:3001" : "");
const youthPwaUrl = readOrigin("YOUTH_PWA_URL", legacyClientUrl || (!isProduction ? "http://localhost:3000" : ""));
const corsAllowedOrigins = Array.from(
  new Set([
    ...[adminPanelUrl, youthPwaUrl, legacyClientUrl].filter(Boolean),
    ...parseOriginList(readString("CORS_ALLOWED_ORIGINS")),
  ]),
);
const qrSecret = readString("QR_SECRET", !isProduction ? "development-only-qr-secret" : "");

requireInProduction("QR_SECRET", qrSecret);
requireInProduction("FIREBASE_PROJECT_ID", firebaseProjectId);
requireInProduction("FIREBASE_STORAGE_BUCKET", firebaseStorageBucket);

if (isProduction && corsAllowedOrigins.length === 0) {
  throw new Error(
    "Missing allowed web origins. Set ADMIN_PANEL_URL and YOUTH_PWA_URL (or CORS_ALLOWED_ORIGINS) before starting the backend in production.",
  );
}

export const ENV = {
  NODE_ENV,
  IS_PRODUCTION: isProduction,
  HOST: readString("HOST", "0.0.0.0"),
  PORT: readNumber("PORT", 4000),
  TRUST_PROXY_HOPS: readNumber("TRUST_PROXY_HOPS", 1),
  JSON_BODY_LIMIT: readString("JSON_BODY_LIMIT", "12mb"),
  FIREBASE_PROJECT_ID: firebaseProjectId,
  FIREBASE_CLIENT_EMAIL: readString("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: decodedPrivateKey.replace(/\\n/g, "\n"),
  FIREBASE_DATABASE_ID: readString("FIREBASE_DATABASE_ID", "kkprofiling"),
  FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
  FIREBASE_SERVICE_ACCOUNT_JSON: readString("FIREBASE_SERVICE_ACCOUNT_JSON"),
  CLIENT_URL: legacyClientUrl,
  ADMIN_PANEL_URL: adminPanelUrl,
  YOUTH_PWA_URL: youthPwaUrl,
  CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
  QR_SECRET: qrSecret,
  AUTH_RATE_LIMIT_WINDOW_MS: readNumber("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: readNumber("AUTH_RATE_LIMIT_MAX", 25),
  QR_RATE_LIMIT_WINDOW_MS: readNumber("QR_RATE_LIMIT_WINDOW_MS", 60 * 1000),
  QR_RATE_LIMIT_MAX: readNumber("QR_RATE_LIMIT_MAX", 45),
};
