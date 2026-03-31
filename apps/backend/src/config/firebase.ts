import admin from "firebase-admin";
import { ENV } from "./env";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: ENV.FIREBASE_PROJECT_ID,
      clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
      privateKey: ENV.FIREBASE_PRIVATE_KEY,
    }),
    storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  });
}

export const db = admin.firestore();
db.settings({ databaseId: ENV.FIREBASE_DATABASE_ID });

export const auth = admin.auth();
export const storage = admin.storage();
export default admin;
