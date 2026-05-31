#!/usr/bin/env node
/**
 * One-shot inspector: lists every creator's profileImage and groups them by
 * what kind of URL they hold, so we can decide if a migration is needed.
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const DEFAULT_AVATAR = "/avatars/avatar-creator.png";

const CANDIDATE_PATHS = [
  path.resolve(__dirname, "..", "serviceAccountKey.json"),
  path.resolve(__dirname, "service-account.json"),
  path.resolve(__dirname, "..", "service-account.json"),
];
const serviceAccountPath = CANDIDATE_PATHS.find((p) => fs.existsSync(p));
if (!serviceAccountPath) {
  console.error("Service account JSON not found.");
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

(async () => {
  const db = admin.firestore();
  const snap = await db.collection("creators").get();

  const buckets = {
    default: [],
    empty: [],
    storage: [],
    unsplash: [],
    googleusercontent: [],
    other: [],
  };

  for (const doc of snap.docs) {
    const v = doc.data().profileImage;
    if (!v || !String(v).trim()) buckets.empty.push(doc.id);
    else if (v === DEFAULT_AVATAR) buckets.default.push(doc.id);
    else if (v.startsWith("/avatars/")) buckets.default.push(doc.id);
    else if (v.includes("firebasestorage.googleapis.com")) buckets.storage.push({ id: doc.id, v });
    else if (v.includes("images.unsplash.com")) buckets.unsplash.push({ id: doc.id, v });
    else if (v.includes("googleusercontent.com")) buckets.googleusercontent.push({ id: doc.id, v });
    else buckets.other.push({ id: doc.id, v });
  }

  console.log(`\nTotal creators: ${snap.size}\n`);
  console.log(`  default (/avatars/...):           ${buckets.default.length}`);
  console.log(`  empty / null:                     ${buckets.empty.length}`);
  console.log(`  Firebase Storage (user upload):   ${buckets.storage.length}`);
  console.log(`  Unsplash (legacy):                ${buckets.unsplash.length}`);
  console.log(`  Google profile pic (Google auth): ${buckets.googleusercontent.length}`);
  console.log(`  Other:                            ${buckets.other.length}`);

  if (buckets.empty.length) {
    console.log(`\n--- empty / null ---`);
    buckets.empty.forEach((id) => console.log(`  ${id}`));
  }
  if (buckets.unsplash.length) {
    console.log(`\n--- legacy unsplash ---`);
    buckets.unsplash.forEach((x) => console.log(`  ${x.id}  ${x.v.slice(0, 80)}…`));
  }
  if (buckets.other.length) {
    console.log(`\n--- other ---`);
    buckets.other.forEach((x) => console.log(`  ${x.id}  ${x.v.slice(0, 80)}…`));
  }

  process.exit(0);
})();
