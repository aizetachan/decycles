#!/usr/bin/env node
/**
 * One-shot migration: optimize images ALREADY uploaded to Firebase Storage and
 * referenced from Firestore, then delete the heavy originals (no duplicates).
 *
 * Scope — every image field across the data model:
 *   creators/{id}:  profileImage, coverImage, creatorImage,
 *                   gallery[].url, events[].coverImage, events[].gallery[].url
 *   users/{id}:     profileImage, photoURL
 *
 * For each value it does one of:
 *   - Local default path ("/avatars/...png", "/cover-creator/...png")
 *       → rewrite to ".webp" (we renamed the bundled defaults). String-only.
 *   - Firebase Storage object in OUR bucket, not yet optimized
 *       → download, re-encode to WebP (downscaled), upload as a .webp object,
 *         update the Firestore field, then DELETE the original object.
 *   - Already-optimized .webp / external URL (googleusercontent, etc.) / empty
 *       → skip.
 *
 * Idempotent: optimized objects are tagged with metadata { optimized: "1" } and
 * skipped on re-run.
 *
 * Auth: drop a service account JSON at repo root as `serviceAccountKey.json`
 * (same convention as the other admin scripts).
 *
 * Usage (from repo root):
 *   node scripts/optimize-storage-images.cjs            # DRY RUN — reports only
 *   node scripts/optimize-storage-images.cjs --apply    # re-encode, rewrite, delete
 *
 * Recommended order:
 *   1) node scripts/optimize-storage-images.cjs                 # review the plan
 *   2) deploy the build that ships the .webp defaults           # npm run deploy
 *   3) node scripts/optimize-storage-images.cjs --apply         # migrate live data
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const admin = require("firebase-admin");
const sharp = require("sharp");

const BUCKET = "decycles-web-app-1777399378.firebasestorage.app";
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;
const apply = process.argv.includes("--apply");

// ── Auth ────────────────────────────────────────────────────────────────────
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
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  storageBucket: BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ── URL / path helpers ────────────────────────────────────────────────────
const DEFAULT_PNG_RE = /^(\/(?:avatars|cover-creator)\/[^?#]*?)\.png(\b|$)/i;

/** Rewrite a bundled-default PNG path to its new .webp name; else null. */
function defaultPngToWebp(value) {
  if (typeof value !== "string") return null;
  const m = value.match(DEFAULT_PNG_RE);
  return m ? `${m[1]}.webp` : null;
}

/**
 * Extract the Storage object path from a download URL if it lives in OUR
 * bucket, else null (external image / not a storage URL).
 */
function storageObjectPath(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  // firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>?...
  if (u.hostname === "firebasestorage.googleapis.com") {
    const m = u.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (m && m[1] === BUCKET) return decodeURIComponent(m[2]);
    return null;
  }
  // storage.googleapis.com/<bucket>/<path>
  if (u.hostname === "storage.googleapis.com") {
    const m = u.pathname.match(/^\/([^/]+)\/(.+)$/);
    if (m && m[1] === BUCKET) return decodeURIComponent(m[2]);
    return null;
  }
  return null;
}

function downloadUrl(objectPath, token) {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/` +
    `${encodeURIComponent(objectPath)}?alt=media&token=${token}`
  );
}

function swapExt(objectPath, ext) {
  return objectPath.replace(/\.[^./]+$/, "") + ext;
}

// ── Field collection ─────────────────────────────────────────────────────
// Returns a flat list of editable image slots: { value, set(newValue) }.
// set() mutates a working copy of the doc data which we write back at the end.
function collectSlots(data) {
  const slots = [];
  const scalar = (key) => {
    if (typeof data[key] === "string" && data[key]) {
      slots.push({ value: data[key], set: (v) => (data[key] = v) });
    }
  };
  ["profileImage", "coverImage", "creatorImage", "photoURL", "shopProfileImage"].forEach(scalar);

  const galleryItem = (arr) => (g, i) => {
    if (typeof g === "string") {
      if (g) slots.push({ value: g, set: (v) => (arr[i] = v) });
    } else if (g && typeof g === "object" && typeof g.url === "string" && g.url) {
      slots.push({ value: g.url, set: (v) => (g.url = v) });
    }
  };
  if (Array.isArray(data.gallery)) data.gallery.forEach(galleryItem(data.gallery));

  if (Array.isArray(data.events)) {
    data.events.forEach((ev) => {
      if (!ev || typeof ev !== "object") return;
      if (typeof ev.coverImage === "string" && ev.coverImage) {
        slots.push({ value: ev.coverImage, set: (v) => (ev.coverImage = v) });
      }
      if (Array.isArray(ev.gallery)) ev.gallery.forEach(galleryItem(ev.gallery));
    });
  }
  return slots;
}

// ── Per-object optimization ────────────────────────────────────────────────
const stats = { defaults: 0, storageReencoded: 0, skipped: 0, bytesBefore: 0, bytesAfter: 0, errors: 0 };

async function optimizeStorageObject(objectPath) {
  const srcFile = bucket.file(objectPath);
  const [exists] = await srcFile.exists();
  if (!exists) {
    console.log(`    ⚠ missing object, leaving ref as-is: ${objectPath}`);
    stats.skipped++;
    return null;
  }
  const [meta] = await srcFile.getMetadata();
  if (meta.metadata && meta.metadata.optimized === "1") {
    stats.skipped++;
    return null; // already done
  }
  const sizeBefore = Number(meta.size || 0);

  if (!apply) {
    // Dry run: report intent without downloading/re-encoding.
    console.log(`    would optimize ${objectPath} (${(sizeBefore / 1024).toFixed(0)} KB)`);
    stats.storageReencoded++;
    stats.bytesBefore += sizeBefore;
    return null;
  }

  const [buf] = await srcFile.download();
  const webp = await sharp(buf)
    .rotate() // honour EXIF orientation
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // Re-encoding can occasionally grow an already-small image; keep the smaller.
  if (webp.length >= sizeBefore && /\.webp$/i.test(objectPath)) {
    await srcFile.setMetadata({ metadata: { optimized: "1" } });
    stats.skipped++;
    return null;
  }

  const destPath = swapExt(objectPath, ".webp");
  const token = crypto.randomUUID();
  await bucket.file(destPath).save(webp, {
    resumable: false,
    contentType: "image/webp",
    metadata: { metadata: { optimized: "1", firebaseStorageDownloadTokens: token } },
  });
  // Remove the original (unless the .webp re-encode wrote over the same path).
  if (destPath !== objectPath) {
    await srcFile.delete().catch((e) => console.log(`    ⚠ could not delete original ${objectPath}: ${e.message}`));
  }

  stats.storageReencoded++;
  stats.bytesBefore += sizeBefore;
  stats.bytesAfter += webp.length;
  console.log(`    ✓ ${objectPath} ${(sizeBefore / 1024).toFixed(0)}KB → ${destPath} ${(webp.length / 1024).toFixed(0)}KB`);
  return downloadUrl(destPath, token);
}

async function processCollection(name) {
  const snap = await db.collection(name).get();
  console.log(`\n── ${name} (${snap.size} docs) ──`);
  for (const doc of snap.docs) {
    const data = doc.data();
    const slots = collectSlots(data);
    let docChanged = false;

    for (const slot of slots) {
      // 1) bundled-default path rename
      const webpDefault = defaultPngToWebp(slot.value);
      if (webpDefault) {
        slot.set(webpDefault);
        docChanged = true;
        stats.defaults++;
        continue;
      }
      // 2) storage object re-encode
      const objectPath = storageObjectPath(slot.value);
      if (!objectPath) {
        stats.skipped++;
        continue;
      }
      try {
        const newUrl = await optimizeStorageObject(objectPath);
        if (newUrl) {
          slot.set(newUrl);
          docChanged = true;
        }
      } catch (e) {
        stats.errors++;
        console.log(`    ✗ ${objectPath}: ${e.message}`);
      }
    }

    if (docChanged && apply) {
      await doc.ref.set(data, { merge: true });
      console.log(`  ↳ updated ${name}/${doc.id}`);
    } else if (docChanged) {
      console.log(`  ↳ would update ${name}/${doc.id}`);
    }
  }
}

(async () => {
  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} — bucket ${BUCKET}\n`);
  await processCollection("creators");
  await processCollection("users");

  console.log("\n── Summary ──");
  console.log(`  default .png→.webp refs:   ${stats.defaults}`);
  console.log(`  storage images optimized:  ${stats.storageReencoded}`);
  console.log(`  skipped (ext/already/etc): ${stats.skipped}`);
  console.log(`  errors:                    ${stats.errors}`);
  if (stats.bytesBefore) {
    const before = stats.bytesBefore / 1024 / 1024;
    const after = stats.bytesAfter / 1024 / 1024;
    if (apply) console.log(`  storage: ${before.toFixed(1)} MB → ${after.toFixed(1)} MB`);
    else console.log(`  storage to process: ${before.toFixed(1)} MB (run with --apply to re-encode)`);
  }
  if (!apply) console.log(`\n(Dry run — pass --apply to write changes and delete originals.)`);
  console.log("");
  process.exit(0);
})().catch((err) => {
  console.error("\n❌  Migration failed:", err);
  process.exit(1);
});
