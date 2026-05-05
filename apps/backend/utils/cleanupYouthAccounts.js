require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const admin = require("firebase-admin");

const CONFIRM_TOKEN = "DELETE_YOUTH_TEST_USERS";
const PRESERVED_EMAILS = new Set([
  "admin@kkbapp-buting.com",
  "superadmin@kkbapp-buting.com",
]);
const PRESERVED_ROLES = new Set(["admin", "superadmin", "merchant"]);

function parseCsvFlag(argv, flagNames) {
  const values = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const inlineMatch = flagNames.find((flag) => arg.startsWith(`${flag}=`));

    if (inlineMatch) {
      values.push(arg.slice(inlineMatch.length + 1));
      continue;
    }

    if (flagNames.includes(arg)) {
      values.push(argv[index + 1] || "");
      index += 1;
    }
  }

  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function getConfirmValue(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--confirm=")) {
      return arg.slice("--confirm=".length).trim();
    }

    if (arg === "--confirm") {
      return String(argv[index + 1] || "").trim();
    }
  }

  return "";
}

function printHelp() {
  console.log("Youth cleanup utility");
  console.log("");
  console.log("Dry run only:");
  console.log("  npm run cleanup:youth");
  console.log("");
  console.log("Delete all detected youth accounts:");
  console.log(`  npm run cleanup:youth -- --execute --confirm ${CONFIRM_TOKEN}`);
  console.log("");
  console.log("Delete only specific accounts by uid or email:");
  console.log(`  npm run cleanup:youth -- --uid uid1,uid2 --execute --confirm ${CONFIRM_TOKEN}`);
  console.log(`  npm run cleanup:youth -- --email user1@example.com,user2@example.com --execute --confirm ${CONFIRM_TOKEN}`);
  console.log("");
  console.log("Optional flags:");
  console.log("  --include-unknown   Include non-preserved Auth users with no detected role");
  console.log("  --skip-storage      Skip Firebase Storage deletion for verification documents");
  console.log("  --help              Show this help message");
}

function getFirebaseCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: String(serviceAccount.private_key || "").replace(/\\n/g, "\n"),
    });
  }

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      "Missing Firebase Admin credentials. Set either FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in apps/backend/.env."
    );
  }

  return admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  });
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getFirebaseCredential(),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID || ""}.appspot.com`,
  });
}

const db = admin.firestore();
if (process.env.FIREBASE_DATABASE_ID) {
  db.settings({ databaseId: process.env.FIREBASE_DATABASE_ID });
}

const auth = admin.auth();
const storage = admin.storage();

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function listAllAuthUsers(nextPageToken, collected = []) {
  const page = await auth.listUsers(1000, nextPageToken);
  const users = collected.concat(page.users);

  if (!page.pageToken) {
    return users;
  }

  return listAllAuthUsers(page.pageToken, users);
}

async function getFirestoreUserMap(uids) {
  const docs = await Promise.all(
    uids.map((uid) => db.collection("users").doc(uid).get())
  );

  return new Map(
    docs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, doc.data() || {}])
  );
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveAccountRecord(authUser, firestoreUser) {
  const authRole = normalizeRole(authUser.customClaims?.role);
  const firestoreRole = normalizeRole(firestoreUser?.role);
  const effectiveRole = authRole || firestoreRole || "unknown";
  const email = String(authUser.email || firestoreUser?.email || "").trim().toLowerCase();

  return {
    uid: authUser.uid,
    email,
    displayName: String(authUser.displayName || firestoreUser?.UserName || "").trim(),
    authRole,
    firestoreRole,
    effectiveRole,
    disabled: Boolean(authUser.disabled),
    lastSignInTime: String(authUser.metadata?.lastSignInTime || ""),
    creationTime: String(authUser.metadata?.creationTime || ""),
  };
}

function matchesFilter(record, uidFilter, emailFilter) {
  if (!uidFilter.size && !emailFilter.size) {
    return true;
  }

  return uidFilter.has(record.uid) || emailFilter.has(record.email);
}

async function deleteDocRefs(docRefs) {
  let deleted = 0;

  for (const part of chunk(docRefs, 400)) {
    if (!part.length) continue;
    const batch = db.batch();
    for (const ref of part) {
      batch.delete(ref);
    }
    await batch.commit();
    deleted += part.length;
  }

  return deleted;
}

async function collectDeletionTargets(uid) {
  const userRef = db.collection("users").doc(uid);
  const profileRef = db.collection("kkProfiling").doc(uid);
  const pointsRef = db.collection("points").doc(uid);

  const [
    userSnap,
    profileSnap,
    pointsSnap,
    pointsHistorySnap,
    documentsSnap,
    transactionsSnap,
    notificationsSnap,
    voucherClaimsSnap,
    vouchersSnap,
  ] = await Promise.all([
    userRef.get(),
    profileRef.get(),
    pointsRef.get(),
    userRef.collection("pointsHistory").get(),
    db.collection("documents").where("profileId", "==", uid).get(),
    db.collection("transactions").where("userId", "==", uid).get(),
    db.collection("notifications").where("recipientUid", "==", uid).get(),
    db.collection("voucherClaims").where("uid", "==", uid).get(),
    db.collection("vouchers").where("claimedBy", "array-contains", uid).get(),
  ]);

  const rewardRestocks = new Map();
  for (const transactionDoc of transactionsSnap.docs) {
    const transaction = transactionDoc.data() || {};
    if (String(transaction.type || "") !== "redeem") {
      continue;
    }

    const rewardId = String(transaction.rewardId || "").trim();
    if (!rewardId) {
      continue;
    }

    rewardRestocks.set(rewardId, (rewardRestocks.get(rewardId) || 0) + 1);
  }

  return {
    directDocRefs: [userSnap, profileSnap, pointsSnap]
      .filter((doc) => doc.exists)
      .map((doc) => doc.ref),
    pointsHistoryRefs: pointsHistorySnap.docs.map((doc) => doc.ref),
    documentRefs: documentsSnap.docs.map((doc) => doc.ref),
    transactionRefs: transactionsSnap.docs.map((doc) => doc.ref),
    notificationRefs: notificationsSnap.docs.map((doc) => doc.ref),
    voucherClaimRefs: voucherClaimsSnap.docs.map((doc) => doc.ref),
    voucherDocs: vouchersSnap.docs,
    rewardRestocks,
  };
}

function buildDryRunSummary(record, targets, options) {
  const rewardRestockCount = [...targets.rewardRestocks.values()].reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return {
    uid: record.uid,
    email: record.email || "(no email)",
    role: record.effectiveRole,
    directDocs: targets.directDocRefs.length,
    pointsHistory: targets.pointsHistoryRefs.length,
    documents: targets.documentRefs.length,
    transactions: targets.transactionRefs.length,
    notifications: targets.notificationRefs.length,
    voucherClaims: targets.voucherClaimRefs.length,
    vouchersToRestore: targets.voucherDocs.length,
    rewardsToRestock: rewardRestockCount,
    storage: options.skipStorage ? "skip" : `verification-documents/${record.uid}/`,
  };
}

async function restoreVoucherClaims(uid, voucherDocs) {
  let restored = 0;

  for (const doc of voucherDocs) {
    const data = doc.data() || {};
    const payload = {
      claimedBy: admin.firestore.FieldValue.arrayRemove(uid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.stock !== undefined && data.stock !== null) {
      payload.stock = Number(data.stock || 0) + 1;
    }

    await doc.ref.set(payload, { merge: true });
    restored += 1;
  }

  return restored;
}

async function restockRewards(rewardRestocks) {
  let restocked = 0;

  for (const [rewardId, count] of rewardRestocks.entries()) {
    const rewardRef = db.collection("rewards").doc(rewardId);
    const rewardSnap = await rewardRef.get();
    if (!rewardSnap.exists) {
      continue;
    }

    const reward = rewardSnap.data() || {};
    if (reward.unlimitedStock) {
      continue;
    }

    const currentStock = Number(
      reward.stock !== undefined && reward.stock !== null
        ? reward.stock
        : reward.remainingStock || 0
    );

    await rewardRef.set(
      {
        stock: currentStock + count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    restocked += count;
  }

  return restocked;
}

async function deleteVerificationFiles(uid) {
  const bucket = storage.bucket();
  await bucket.deleteFiles({
    prefix: `verification-documents/${uid}/`,
    force: true,
  });
}

async function deleteYouthAccount(record, options) {
  const targets = await collectDeletionTargets(record.uid);
  const result = {
    uid: record.uid,
    email: record.email,
    deletedAuth: false,
    deletedDocs: 0,
    restoredVoucherClaims: 0,
    restoredRewardStock: 0,
    deletedStoragePrefix: false,
    errors: [],
  };

  try {
    result.restoredVoucherClaims = await restoreVoucherClaims(
      record.uid,
      targets.voucherDocs
    );
  } catch (error) {
    result.errors.push(`Voucher restore failed: ${error.message || String(error)}`);
  }

  try {
    result.restoredRewardStock = await restockRewards(targets.rewardRestocks);
  } catch (error) {
    result.errors.push(`Reward restock failed: ${error.message || String(error)}`);
  }

  try {
    result.deletedDocs += await deleteDocRefs(targets.pointsHistoryRefs);
    result.deletedDocs += await deleteDocRefs(targets.documentRefs);
    result.deletedDocs += await deleteDocRefs(targets.transactionRefs);
    result.deletedDocs += await deleteDocRefs(targets.notificationRefs);
    result.deletedDocs += await deleteDocRefs(targets.voucherClaimRefs);
    result.deletedDocs += await deleteDocRefs(targets.directDocRefs);
  } catch (error) {
    result.errors.push(`Firestore cleanup failed: ${error.message || String(error)}`);
  }

  if (!options.skipStorage) {
    try {
      await deleteVerificationFiles(record.uid);
      result.deletedStoragePrefix = true;
    } catch (error) {
      result.errors.push(`Storage cleanup failed: ${error.message || String(error)}`);
    }
  }

  try {
    await auth.deleteUser(record.uid);
    result.deletedAuth = true;
  } catch (error) {
    result.errors.push(`Auth deletion failed: ${error.message || String(error)}`);
  }

  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help")) {
    printHelp();
    return;
  }

  const execute = hasFlag(argv, "--execute");
  const includeUnknown = hasFlag(argv, "--include-unknown");
  const skipStorage = hasFlag(argv, "--skip-storage");
  const confirmValue = getConfirmValue(argv);
  const uidFilter = new Set(parseCsvFlag(argv, ["--uid", "--uids"]));
  const emailFilter = new Set(
    parseCsvFlag(argv, ["--email", "--emails"]).map((value) =>
      value.toLowerCase()
    )
  );

  if (execute && confirmValue !== CONFIRM_TOKEN) {
    throw new Error(
      `Execution blocked. Re-run with --execute --confirm ${CONFIRM_TOKEN}`
    );
  }

  const authUsers = await listAllAuthUsers();
  const firestoreUserMap = await getFirestoreUserMap(
    authUsers.map((user) => user.uid)
  );

  const preserved = [];
  const skipped = [];
  const candidates = [];

  for (const authUser of authUsers) {
    const firestoreUser = firestoreUserMap.get(authUser.uid);
    const record = resolveAccountRecord(authUser, firestoreUser);

    if (!matchesFilter(record, uidFilter, emailFilter)) {
      skipped.push({ ...record, reason: "filter" });
      continue;
    }

    if (PRESERVED_EMAILS.has(record.email)) {
      preserved.push({ ...record, reason: "preserved-email" });
      continue;
    }

    if (PRESERVED_ROLES.has(record.effectiveRole)) {
      preserved.push({ ...record, reason: "preserved-role" });
      continue;
    }

    if (record.effectiveRole === "youth") {
      candidates.push(record);
      continue;
    }

    if (includeUnknown && record.effectiveRole === "unknown") {
      candidates.push(record);
      continue;
    }

    skipped.push({ ...record, reason: "non-youth" });
  }

  console.log("");
  console.log(`Firebase Auth users scanned: ${authUsers.length}`);
  console.log(`Preserved accounts: ${preserved.length}`);
  console.log(`Skipped non-target accounts: ${skipped.length}`);
  console.log(`Candidate youth accounts: ${candidates.length}`);
  console.log("");

  if (!candidates.length) {
    console.log("No candidate youth accounts matched the current filters.");
    return;
  }

  const dryRunRows = [];
  for (const record of candidates) {
    const targets = await collectDeletionTargets(record.uid);
    dryRunRows.push(buildDryRunSummary(record, targets, { skipStorage }));
  }

  console.table(dryRunRows);

  if (!execute) {
    console.log("");
    console.log("Dry run only. No Firebase data was changed.");
    console.log(
      `To execute this cleanup, run: npm run cleanup:youth -- --execute --confirm ${CONFIRM_TOKEN}`
    );
    if (!includeUnknown) {
      console.log(
        "If you also want to include users without a detected role, add --include-unknown."
      );
    }
    return;
  }

  console.log("");
  console.log("Executing cleanup...");
  const results = [];

  for (const record of candidates) {
    console.log(`Cleaning ${record.email || record.uid}...`);
    results.push(await deleteYouthAccount(record, { skipStorage }));
  }

  console.log("");
  console.table(
    results.map((entry) => ({
      uid: entry.uid,
      email: entry.email || "(no email)",
      authDeleted: entry.deletedAuth ? "yes" : "no",
      docsDeleted: entry.deletedDocs,
      voucherRestores: entry.restoredVoucherClaims,
      rewardRestocks: entry.restoredRewardStock,
      storageDeleted: skipStorage ? "skip" : entry.deletedStoragePrefix ? "yes" : "no",
      errors: entry.errors.length,
    }))
  );

  const failures = results.filter((entry) => entry.errors.length > 0);
  if (failures.length) {
    console.log("");
    console.log("Some accounts finished with warnings/errors:");
    for (const failure of failures) {
      console.log(`- ${failure.email || failure.uid}`);
      for (const error of failure.errors) {
        console.log(`  ${error}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Youth account cleanup completed successfully.");
}

main().catch((error) => {
  console.error("Youth cleanup failed.");
  console.error(error);
  process.exit(1);
});
