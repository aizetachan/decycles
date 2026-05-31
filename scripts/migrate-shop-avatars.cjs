#!/usr/bin/env node
/**
 * One-shot migration script.
 *
 * Scans every doc in the `creators` Firestore collection and replaces any
 * `profileImage` (the shop's avatar) that is empty or that points to the
 * legacy Unsplash URLs we used in seeds with the bundled default at
 * `/avatars/avatar-creator.png`.
 *
 * Idempotent: re-running it does nothing once shops are clean.
 *
 * Usage (from repo root, with serviceAccountKey.json present):
 *   node scripts/migrate-shop-avatars.cjs            # dry run
 *   node scripts/migrate-shop-avatars.cjs --apply    # actually writes
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
  console.error("\n❌  Service account JSON not found.\n");
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

const apply = process.argv.includes("--apply");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

/**
 * Migrate when the value is empty/null OR points at a legacy Unsplash URL.
 * Real uploads (Firebase Storage), Google profile pics, and existing /avatars/
 * defaults are left alone.
 */
function shouldMigrate(profileImage) {
  if (!profileImage || typeof profileImage !== "string") return true;
  const trimmed = profileImage.trim();
  if (!trimmed) return true;
  if (trimmed.includes("images.unsplash.com")) return true;
  return false;
}

(async () => {
  const db = admin.firestore();
  const snapshot = await db.collection("creators").get();

  const candidates = [];
  let kept = 0;
  for (const doc of snapshot.docs) {
    const value = doc.data().profileImage;
    if (shouldMigrate(value)) {
      candidates.push({ id: doc.id, before: value || "(empty)", ref: doc.ref });
    } else {
      kept++;
    }
  }

  console.log(`\nFound ${candidates.length} creators to migrate (keeping ${kept} with custom avatars).\n`);
  for (const c of candidates) {
    const preview = String(c.before).length > 60 ? String(c.before).slice(0, 60) + "…" : c.before;
    console.log(`  ${c.id.padEnd(28)}  ${preview}  →  ${DEFAULT_AVATAR}`);
  }

  if (!apply) {
    console.log(`\n(Dry run — pass --apply to actually write.)\n`);
    process.exit(0);
  }

  console.log(`\nApplying...`);
  let written = 0;
  for (let i = 0; i < candidates.length; i += 500) {
    const batch = db.batch();
    const slice = candidates.slice(i, i + 500);
    slice.forEach((c) =>
      batch.update(c.ref, { profileImage: DEFAULT_AVATAR, creatorImage: DEFAULT_AVATAR }),
    );
    await batch.commit();
    written += slice.length;
    console.log(`  …${written}/${candidates.length}`);
  }
  console.log(`\n✅  Done. ${written} creators updated.\n`);
  process.exit(0);
})().catch((err) => {
  console.error("\n❌  Migration failed:", err);
  process.exit(1);
});
