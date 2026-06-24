#!/usr/bin/env node
/**
 * Optimize the bundled static images in `assets/`.
 *
 * What it does (idempotent — safe to re-run):
 *   - Default user avatars  assets/avatars/users/avatarNN.png  → .webp, resized 512²
 *   - Default shop avatar    assets/avatars/avatar-creator.png  → .webp, resized 512²
 *   - Default shop cover     assets/cover-creator/cover-creator.png → .webp, width ≤1280
 *   - Social card            assets/thumbnail.png → re-encoded as a smaller PNG
 *                            (kept as PNG: og:image/twitter:image scrapers are
 *                             unreliable with WebP, and its URL is hard-coded in
 *                             index.html / functions/template.html).
 *
 * The original PNGs (except thumbnail.png) are DELETED so we never ship both
 * formats. Code references are updated separately in src/lib/defaultAvatars.ts
 * and src/data.ts; any Firestore docs still pointing at the old default .png
 * paths are rewritten by scripts/optimize-storage-images.cjs.
 *
 * Usage:
 *   node scripts/optimize-assets.cjs
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const AVATAR_SIZE = 512; // defaults render at ≤128px on screen; 512 covers retina
const COVER_MAX_WIDTH = 1280;
const WEBP_QUALITY = 80;

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function toWebp(srcPng, { square, maxWidth }) {
  const dst = srcPng.replace(/\.png$/i, ".webp");
  const before = fs.statSync(srcPng).size;
  let pipeline = sharp(srcPng);
  if (square) {
    pipeline = pipeline.resize(square, square, { fit: "cover" });
  } else if (maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }
  await pipeline.webp({ quality: WEBP_QUALITY }).toFile(dst);
  const after = fs.statSync(dst).size;
  fs.unlinkSync(srcPng); // no duplicate formats
  console.log(`  ${path.relative(ROOT, srcPng)}  ${kb(before)} → ${path.relative(ROOT, dst)}  ${kb(after)}`);
}

async function optimizePngInPlace(file) {
  const before = fs.statSync(file).size;
  const tmp = file + ".tmp";
  await sharp(file)
    // 256-colour palette + max zlib effort. Lossless enough for a flat social
    // card, big size win over a 24-bit truecolor PNG.
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 9 })
    .toFile(tmp);
  const after = fs.statSync(tmp).size;
  if (after < before) {
    fs.renameSync(tmp, file);
    console.log(`  ${path.relative(ROOT, file)}  ${kb(before)} → ${kb(after)} (PNG kept)`);
  } else {
    fs.unlinkSync(tmp);
    console.log(`  ${path.relative(ROOT, file)}  already optimal (${kb(before)})`);
  }
}

(async () => {
  console.log("\nOptimizing bundled assets…\n");

  const usersDir = path.join(ROOT, "assets/avatars/users");
  for (const f of fs.readdirSync(usersDir).filter((n) => /\.png$/i.test(n))) {
    await toWebp(path.join(usersDir, f), { square: AVATAR_SIZE });
  }

  const creatorAvatar = path.join(ROOT, "assets/avatars/avatar-creator.png");
  if (fs.existsSync(creatorAvatar)) await toWebp(creatorAvatar, { square: AVATAR_SIZE });

  const cover = path.join(ROOT, "assets/cover-creator/cover-creator.png");
  if (fs.existsSync(cover)) await toWebp(cover, { maxWidth: COVER_MAX_WIDTH });

  const thumb = path.join(ROOT, "assets/thumbnail.png");
  if (fs.existsSync(thumb)) await optimizePngInPlace(thumb);

  console.log("\n✅  Done.\n");
})().catch((err) => {
  console.error("\n❌  optimize-assets failed:", err);
  process.exit(1);
});
