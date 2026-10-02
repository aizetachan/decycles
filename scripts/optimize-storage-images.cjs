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
 *         update the Firestore field; originals are deleted only at the end,
 *         once nothing references them (see "Safety model" below).
 *   - Already-optimized / WebP under 300 KB / SVG / GIF / external URL /
 *     empty → skip.
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
 *   2) node scripts/optimize-storage-images.cjs --apply         # migrate live data
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
// Safety model (a live site reads these URLs while we run):
//   1) re-encode every object and upload the new .webp — originals untouched;
//   2) rewrite Firestore refs in a per-doc transaction (fresh read, only the
//      image fields change, so concurrent profile edits are never clobbered);
//   3) only at the very end delete originals that nothing references anymore.
// One object can be referenced from several docs/fields (e.g. creators and
// users share an avatar), so results are cached per object path.
const SMALL_WEBP_BYTES = 300 * 1024; // already-light WebP: not worth a 2nd lossy pass
const stats = { defaults: 0, storageReencoded: 0, skipped: 0, bytesBefore: 0, bytesAfter: 0, errors: 0, deleted: 0, docsUpdated: 0 };
const results = new Map(); // objectPath → Promise<{ newUrl, destPath } | null>
const replaced = new Map(); // objectPath → newUrl (successful re-encodes only)
const wouldReplace = new Set(); // dry run: objects that would be re-encoded

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
  if (/^image\/(svg\+xml|gif)$/.test(meta.contentType || "") || /\.(svg|gif)$/i.test(objectPath)) {
    stats.skipped++;
    return null; // vector / animated: re-encoding would rasterise or flatten
  }
  const isWebp = meta.contentType === "image/webp" || /\.webp$/i.test(objectPath);
  if (isWebp && sizeBefore < SMALL_WEBP_BYTES) {
    stats.skipped++;
    return null; // compressed at upload time already
  }

  if (!apply) {
    // Dry run: report intent without downloading/re-encoding.
    console.log(`    would optimize ${objectPath} (${(sizeBefore / 1024).toFixed(0)} KB)`);
    wouldReplace.add(objectPath);
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
  if (webp.length >= sizeBefore) {
    await srcFile.setMetadata({ metadata: { optimized: "1" } });
    stats.skipped++;
    return null;
  }

  // Never overwrite the original in place: a .webp source gets a new name.
  let destPath = swapExt(objectPath, ".webp");
  if (destPath === objectPath) destPath = swapExt(objectPath, "-opt.webp");
  const token = crypto.randomUUID();
  await bucket.file(destPath).save(webp, {
    resumable: false,
    contentType: "image/webp",
    metadata: { metadata: { optimized: "1", firebaseStorageDownloadTokens: token } },
  });

  stats.storageReencoded++;
  stats.bytesBefore += sizeBefore;
  stats.bytesAfter += webp.length;
  console.log(`    ✓ ${objectPath} ${(sizeBefore / 1024).toFixed(0)}KB → ${destPath} ${(webp.length / 1024).toFixed(0)}KB`);
  const newUrl = downloadUrl(destPath, token);
  replaced.set(objectPath, newUrl);
  return { newUrl, destPath };
}

function optimizeOnce(objectPath) {
  if (!results.has(objectPath)) {
    results.set(
      objectPath,
      optimizeStorageObject(objectPath).catch((e) => {
        stats.errors++;
        console.log(`    ✗ ${objectPath}: ${e.message}`);
        return null;
      }),
    );
  }
  return results.get(objectPath);
}

const IMAGE_KEYS = ["profileImage", "coverImage", "creatorImage", "photoURL", "shopProfileImage", "gallery", "events"];

/** Rewrites image refs in `data` (mutates); returns true if anything changed. */
function rewriteRefs(data) {
  let changed = false;
  for (const slot of collectSlots(data)) {
    const webpDefault = defaultPngToWebp(slot.value);
    if (webpDefault) {
      slot.set(webpDefault);
      changed = true;
      continue;
    }
    const objectPath = storageObjectPath(slot.value);
    if (objectPath && replaced.has(objectPath)) {
      slot.set(replaced.get(objectPath));
      changed = true;
    }
  }
  return changed;
}

async function processCollection(name) {
  const snap = await db.collection(name).get();
  console.log(`\n── ${name} (${snap.size} docs) ──`);
  for (const doc of snap.docs) {
    const slots = collectSlots(doc.data());
    let docChanged = false;
    for (const slot of slots) {
      if (defaultPngToWebp(slot.value)) {
        docChanged = true;
        stats.defaults++;
        continue;
      }
      const objectPath = storageObjectPath(slot.value);
      if (!objectPath) {
        stats.skipped++;
        continue;
      }
      await optimizeOnce(objectPath);
      if (replaced.has(objectPath) || wouldReplace.has(objectPath)) docChanged = true;
    }

    if (docChanged && apply) {
      // Fresh read inside a transaction; only image fields are written.
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (!fresh.exists) return;
        const data = fresh.data();
        if (!rewriteRefs(data)) return;
        const patch = {};
        IMAGE_KEYS.forEach((k) => {
          if (k in data) patch[k] = data[k];
        });
        tx.update(doc.ref, patch);
      });
      stats.docsUpdated++;
      console.log(`  ↳ updated ${name}/${doc.id}`);
    } else if (docChanged) {
      console.log(`  ↳ would update ${name}/${doc.id}`);
    }
  }
}

/** Every Storage object path still referenced from Firestore right now. */
async function referencedObjects() {
  const refs = new Set();
  for (const name of ["creators", "users"]) {
    const snap = await db.collection(name).get();
    snap.docs.forEach((d) =>
      collectSlots(d.data()).forEach((s) => {
        const p = storageObjectPath(s.value);
        if (p) refs.add(p);
      }),
    );
  }
  return refs;
}

(async () => {
  console.log(`\n${apply ? "APPLYING" : "DRY RUN"} — bucket ${BUCKET}\n`);
  await processCollection("creators");
  await processCollection("users");

  if (apply && replaced.size) {
    console.log(`\n── deleting replaced originals ──`);
    const stillUsed = await referencedObjects();
    for (const objectPath of replaced.keys()) {
      if (stillUsed.has(objectPath)) {
        console.log(`    ⚠ still referenced, kept: ${objectPath}`);
        continue;
      }
      await bucket
        .file(objectPath)
        .delete()
        .then(() => stats.deleted++)
        .catch((e) => console.log(`    ⚠ could not delete ${objectPath}: ${e.message}`));
    }
  }

  console.log("\n── Summary ──");
  console.log(`  default .png→.webp refs:   ${stats.defaults}`);
  console.log(`  storage images optimized:  ${stats.storageReencoded}`);
  console.log(`  skipped (ext/small/etc):   ${stats.skipped}`);
  console.log(`  errors:                    ${stats.errors}`);
  if (apply) console.log(`  docs updated:              ${stats.docsUpdated}`);
  if (apply) console.log(`  originals deleted:         ${stats.deleted}`);
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
