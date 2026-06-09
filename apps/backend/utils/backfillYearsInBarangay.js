require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const YEARS_FIELD = "yearsInBarangay";
const LEGACY_YEAR_FIELDS = [
  "years_in_barangay",
  "yearsInBrgy",
  "yearsInBarangayResidence",
  "yearsOfResidency",
  "yearsResidency",
  "residencyYears",
  "yearsLivingInBarangay",
  "yearsLivingInBrgy",
  "lengthOfStayInBarangay",
  "lengthOfResidency",
  "yearsAtBarangay",
  "taonSaBarangay",
];
const CSV_ID_FIELDS = ["uid", "userId", "id", "profileId"];
const CSV_EMAIL_FIELDS = ["email", "Email", "userEmail"];
const CSV_YEAR_FIELDS = [YEARS_FIELD, ...LEGACY_YEAR_FIELDS];
const BATCH_LIMIT = 450;

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function getFlagValue(argv, flagNames) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const inlineMatch = flagNames.find((flag) => arg.startsWith(`${flag}=`));

    if (inlineMatch) {
      return arg.slice(inlineMatch.length + 1).trim();
    }

    if (flagNames.includes(arg)) {
      return String(argv[index + 1] || "").trim();
    }
  }

  return "";
}

function printHelp() {
  console.log("Backfill yearsInBarangay for existing youth profiles");
  console.log("");
  console.log("Dry run from legacy fields already stored in kkProfiling:");
  console.log("  npm run backfill:years-in-barangay --workspace backend");
  console.log("");
  console.log("Dry run from a CSV export:");
  console.log("  npm run backfill:years-in-barangay --workspace backend -- --csv ./years.csv");
  console.log("");
  console.log("Commit changes:");
  console.log("  npm run backfill:years-in-barangay --workspace backend -- --csv ./years.csv --commit");
  console.log("");
  console.log("Generate a fill-in CSV for profiles still missing the field:");
  console.log("  npm run backfill:years-in-barangay --workspace backend -- --missing-csv ./years-template.csv");
  console.log("");
  console.log("CSV columns supported:");
  console.log("  uid/userId/id/profileId or email, plus yearsInBarangay or a legacy year column.");
  console.log("");
  console.log("Optional flags:");
  console.log("  --overwrite   Replace existing yearsInBarangay values.");
  console.log("  --help        Show this help message.");
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

function initializeFirebase() {
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

  return db;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getFirstValue(record, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
  }

  return undefined;
}

function normalizeYears(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  const numericMatch = text.match(/^(\d+)(?:\.\d+)?$/);
  if (numericMatch) {
    return Math.floor(Number(numericMatch[1]));
  }

  const withUnitMatch = text.match(/^(\d+)(?:\.\d+)?\s*(?:year|years|yr|yrs|taon)\b/i);
  if (withUnitMatch) {
    return Math.floor(Number(withUnitMatch[1]));
  }

  return null;
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted && char === '"' && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((entry) => entry.trim())) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((entry) => entry.trim())) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = String(cells[index] || "").trim();
    });
    return record;
  });
}

function readCsvRows(csvPath) {
  if (!csvPath) return [];

  const resolvedPath = path.resolve(process.cwd(), csvPath);
  const content = fs.readFileSync(resolvedPath, "utf8");
  return parseCsv(content);
}

function buildCsvLookup(rows) {
  const byId = new Map();
  const byEmail = new Map();
  const invalidRows = [];

  for (const row of rows) {
    const key = getFirstValue(row, CSV_ID_FIELDS);
    const email = normalizeEmail(getFirstValue(row, CSV_EMAIL_FIELDS));
    const years = normalizeYears(getFirstValue(row, CSV_YEAR_FIELDS));

    if (years === null) {
      invalidRows.push(row);
      continue;
    }

    if (key) {
      byId.set(String(key).trim(), years);
    }

    if (email) {
      byEmail.set(email, years);
    }
  }

  return { byId, byEmail, invalidRows };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

function writeMissingCsv(outputPath, missing) {
  if (!outputPath) return "";

  const resolvedPath = path.resolve(process.cwd(), outputPath);
  const rows = [
    ["uid", "email", "fullName", YEARS_FIELD],
    ...missing.map((item) => [item.uid || item.id, item.email || "", item.name || "", ""]),
  ];
  const content = `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
  fs.writeFileSync(resolvedPath, content, "utf8");

  return resolvedPath;
}

function getLegacyYears(profile) {
  for (const field of LEGACY_YEAR_FIELDS) {
    const years = normalizeYears(profile[field]);
    if (years !== null) {
      return { years, source: field };
    }
  }

  return null;
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function commitUpdates(db, updates) {
  for (const group of chunk(updates, BATCH_LIMIT)) {
    const batch = db.batch();
    for (const update of group) {
      batch.set(
        update.ref,
        {
          [YEARS_FIELD]: update.years,
          yearsInBarangayBackfilledAt: admin.firestore.FieldValue.serverTimestamp(),
          yearsInBarangayBackfillSource: update.source,
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help")) {
    printHelp();
    return;
  }

  const commit = hasFlag(argv, "--commit");
  const overwrite = hasFlag(argv, "--overwrite");
  const csvPath = getFlagValue(argv, ["--csv"]);
  const missingCsvPath = getFlagValue(argv, ["--missing-csv", "--export-missing"]);
  const csvRows = readCsvRows(csvPath);
  const csvLookup = buildCsvLookup(csvRows);
  const db = initializeFirebase();

  const [profilesSnap, usersSnap] = await Promise.all([
    db.collection("kkProfiling").get(),
    db.collection("users").get(),
  ]);
  const userEmailById = new Map(
    usersSnap.docs.map((doc) => [doc.id, normalizeEmail(doc.data().email)])
  );
  const updates = [];
  const missing = [];
  const skippedExisting = [];
  const invalidExisting = [];
  let legacyMatches = 0;
  let csvMatches = 0;

  for (const doc of profilesSnap.docs) {
    const profile = doc.data();
    const uid = String(profile.userId || doc.id);
    const existingYears = normalizeYears(profile[YEARS_FIELD]);

    if (existingYears !== null && !overwrite) {
      skippedExisting.push(doc.id);
      continue;
    }

    if (!isBlank(profile[YEARS_FIELD]) && existingYears === null) {
      invalidExisting.push({ id: doc.id, value: profile[YEARS_FIELD] });
    }

    const legacy = getLegacyYears(profile);
    if (legacy) {
      legacyMatches += 1;
      updates.push({
        ref: doc.ref,
        id: doc.id,
        years: legacy.years,
        source: `legacy:${legacy.source}`,
      });
      continue;
    }

    const csvYears =
      csvLookup.byId.get(doc.id) ??
      csvLookup.byId.get(uid) ??
      csvLookup.byEmail.get(normalizeEmail(profile.email)) ??
      csvLookup.byEmail.get(userEmailById.get(uid));

    if (csvYears !== undefined) {
      csvMatches += 1;
      updates.push({
        ref: doc.ref,
        id: doc.id,
        years: csvYears,
        source: csvPath ? `csv:${path.basename(csvPath)}` : "csv",
      });
      continue;
    }

    missing.push({
      id: doc.id,
      uid,
      email: profile.email || userEmailById.get(uid) || "",
      name: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" "),
    });
  }

  if (commit && updates.length > 0) {
    await commitUpdates(db, updates);
  }

  const missingCsvOutput = writeMissingCsv(missingCsvPath, missing);

  console.log("Backfill yearsInBarangay summary");
  console.log(`Mode: ${commit ? "COMMIT" : "DRY RUN"}`);
  console.log(`Profiles scanned: ${profilesSnap.size}`);
  console.log(`Already had usable years: ${skippedExisting.length}`);
  console.log(`Updates from legacy fields: ${legacyMatches}`);
  console.log(`Updates from CSV: ${csvMatches}`);
  console.log(`Invalid existing years values: ${invalidExisting.length}`);
  console.log(`CSV rows with invalid/missing years: ${csvLookup.invalidRows.length}`);
  console.log(`${commit ? "Updated" : "Would update"}: ${updates.length}`);
  console.log(`Still missing source value: ${missing.length}`);
  if (missingCsvOutput) {
    console.log(`Missing-profile CSV written: ${missingCsvOutput}`);
  }

  if (updates.length > 0) {
    console.log("");
    console.log("Sample updates:");
    for (const update of updates.slice(0, 10)) {
      console.log(`  ${update.id}: ${update.years} (${update.source})`);
    }
  }

  if (missing.length > 0) {
    console.log("");
    console.log("Sample missing profiles:");
    for (const item of missing.slice(0, 10)) {
      console.log(`  ${item.id} ${item.email ? `<${item.email}>` : ""} ${item.name || ""}`.trim());
    }
  }

  if (!commit) {
    console.log("");
    console.log("No data was changed. Add --commit to write the listed updates.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to backfill yearsInBarangay.");
    console.error(error);
    process.exit(1);
  });
