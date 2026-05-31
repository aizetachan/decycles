#!/usr/bin/env node
/**
 * Re-sync admin custom claims from Firestore.
 *
 * The syncAdminClaim Cloud Function only fires on doc *writes* — admins that
 * were promoted before the function was deployed (or whose docs haven't been
 * touched since) won't have the `admin: true` claim and will hit storage
 * rules' 403. This script reconciles them in one pass:
 *
 *   - Reads every users/{uid} doc.
 *   - For each, ensures the custom claim mirrors the doc's `role` field.
 *   - Logs the diff. Idempotent — re-running it does nothing once everyone
 *     is already in sync.
 *
 * Usage (from repo root, with serviceAccountKey.json present):
 *   node scripts/sync-admin-claims.cjs            # dry run
 *   node scripts/sync-admin-claims.cjs --apply    # actually update claims
 *
 * After running with --apply, affected users either log out + in or refresh
 * (the AuthContext detects the role/claim mismatch and forces a token
 * refresh on next load).
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

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

(async () => {
  const db = admin.firestore();
  const snap = await db.collection("users").get();

  const toGrant = [];   // need admin: true
  const toRevoke = [];  // currently admin but role is not "admin"
  const inSync = [];

  for (const doc of snap.docs) {
    const uid = doc.id;
    const role = doc.data().role || "user";
    let user;
    try {
      user = await admin.auth().getUser(uid);
    } catch (err) {
      console.warn(`⚠  Skip ${uid} — no auth account (${err.code || err.message}).`);
      continue;
    }
    const claims = user.customClaims || {};
    const hasAdmin = claims.admin === true;
    const shouldBeAdmin = role === "admin";

    if (shouldBeAdmin && !hasAdmin) {
      toGrant.push({ uid, email: user.email, claims });
    } else if (!shouldBeAdmin && hasAdmin) {
      toRevoke.push({ uid, email: user.email, claims });
    } else {
      inSync.push(uid);
    }
  }

  console.log(`\n--- summary ---`);
  console.log(`  in sync:   ${inSync.length}`);
  console.log(`  to grant:  ${toGrant.length}`);
  console.log(`  to revoke: ${toRevoke.length}`);

  if (toGrant.length) {
    console.log(`\nGrant admin to:`);
    toGrant.forEach((u) => console.log(`  ${u.uid}  (${u.email || "no email"})`));
  }
  if (toRevoke.length) {
    console.log(`\nRevoke admin from:`);
    toRevoke.forEach((u) => console.log(`  ${u.uid}  (${u.email || "no email"})`));
  }

  if (!apply) {
    console.log(`\n(Dry run — pass --apply to actually update claims.)\n`);
    process.exit(0);
  }

  console.log(`\nApplying...`);
  for (const u of toGrant) {
    const next = { ...(u.claims || {}), admin: true };
    await admin.auth().setCustomUserClaims(u.uid, next);
    console.log(`  ✓ ${u.email || u.uid}  → admin: true`);
  }
  for (const u of toRevoke) {
    const next = { ...(u.claims || {}) };
    delete next.admin;
    await admin.auth().setCustomUserClaims(u.uid, next);
    console.log(`  ✓ ${u.email || u.uid}  → admin removed`);
  }

  console.log(`\n✅  Done. Affected users should log out + in (or refresh) to pick up the new token.\n`);
  process.exit(0);
})().catch((err) => {
  console.error("\n❌  Sync failed:", err);
  process.exit(1);
});
