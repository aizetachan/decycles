#!/usr/bin/env node
/**
 * One-shot migration script.
 *
 * Scans every doc in the `creators` Firestore collection and replaces any
 * `coverImage` that is empty or that points to the legacy Unsplash URLs we
 * used in seeds with the bundled default at `/cover-creator/cover-creator.png`.
 *
 * Idempotent: re-running it does nothing once shops are clean.
 *
 * Usage (from repo root, with serviceAccountKey.json present):
 *   node scripts/migrate-legacy-covers.cjs            # dry run, prints changes
 *   node scripts/migrate-legacy-covers.cjs --apply    # actually writes
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const DEFAULT_COVER = "/cover-creator/cover-creator.png";

// Same auto-detect as the bootstrap script — keep the JSON wherever you like.
const CANDIDATE_PATHS = [
  path.resolve(__dirname, "..", "serviceAccountKey.json"),
  path.resolve(__dirname, "service-account.json"),
  path.resolve(__dirname, "..", "service-account.json"),
];
const serviceAccountPath = CANDIDATE_PATHS.find((p) => fs.existsSync(p));
if (!serviceAccountPath) {
  console.error("\n❌  Service account JSON not found. Looked in:");
  CANDIDATE_PATHS.forEach((p) => console.error(`    - ${p}`));
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

const apply = process.argv.includes("--apply");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

/**
 * Decide whether a coverImage value should be replaced with the default.
 * Returns true for empty/null values and for any URL pointing at the legacy
 * Unsplash placeholders we used in seeds.
 */
function shouldMigrate(coverImage) {
  if (!coverImage || typeof coverImage !== "string") return true;
  const trimmed = coverImage.trim();
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
    const cover = doc.data().coverImage;
    if (shouldMigrate(cover)) {
      candidates.push({ id: doc.id, before: cover || "(empty)", ref: doc.ref });
    } else {
      kept++;
    }
  }

  console.log(`\nFound ${candidates.length} creators to migrate (keeping ${kept} with custom covers).\n`);
  for (const c of candidates) {
    const preview = String(c.before).length > 60 ? String(c.before).slice(0, 60) + "…" : c.before;
    console.log(`  ${c.id.padEnd(28)}  ${preview}  →  ${DEFAULT_COVER}`);
  }

  if (!apply) {
    console.log(`\n(Dry run — pass --apply to actually write.)\n`);
    process.exit(0);
  }

  console.log(`\nApplying...`);
  // Batched writes — 500 ops per batch is the Firestore limit.
  let written = 0;
  for (let i = 0; i < candidates.length; i += 500) {
    const batch = db.batch();
    const slice = candidates.slice(i, i + 500);
    slice.forEach((c) => batch.update(c.ref, { coverImage: DEFAULT_COVER }));
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
