import admin from "firebase-admin";
import { ENV } from "./env";

function getFirebaseCredential() {
  if (ENV.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(ENV.FIREBASE_SERVICE_ACCOUNT_JSON);
      return admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: String(serviceAccount.private_key || "").replace(/\\n/g, "\n"),
      });
    } catch (error) {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (
    !ENV.FIREBASE_PROJECT_ID ||
    !ENV.FIREBASE_CLIENT_EMAIL ||
    !ENV.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      'Missing Firebase Admin credentials. Set either FIREBASE_SERVICE_ACCOUNT_JSON or all of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in apps/backend/.env.',
    );
  }

  return admin.credential.cert({
    projectId: ENV.FIREBASE_PROJECT_ID,
    clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
    privateKey: ENV.FIREBASE_PRIVATE_KEY,
  });
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getFirebaseCredential(),
    storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  });
}

export const db = admin.firestore();
db.settings({ databaseId: ENV.FIREBASE_DATABASE_ID });

export const auth = admin.auth();
export const storage = admin.storage();
export default admin;
