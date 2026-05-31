#!/usr/bin/env node
/**
 * Bootstrap script — sets the `admin: true` custom claim on a single user.
 *
 * Use this ONCE to grant admin to the very first admin user.
 * From then on, the syncAdminClaim Cloud Function takes over: any role change
 * via /admin/users (or any direct Firestore write to users/{uid}.role) is
 * mirrored to the user's custom claims automatically.
 *
 * SETUP (one time):
 *   1. Firebase Console → Project Settings → Service accounts
 *      → Generate new private key
 *   2. Save the downloaded JSON in any of these locations (gitignored):
 *        - <repo-root>/serviceAccountKey.json     (recommended)
 *        - <repo-root>/scripts/service-account.json
 *      The script auto-detects whichever one exists.
 *   3. From repo root:
 *        node scripts/bootstrap-admin.cjs <UID-of-the-user-to-promote>
 *   4. The promoted user must log out and back in (or refresh — the client
 *      auto-refreshes the ID token after login).
 *
 * After bootstrap, you should never need to run this again.
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

// Look for the service account JSON in a few accepted locations so this script
// works regardless of where the developer dropped the file. All these paths
// are gitignored.
const CANDIDATE_PATHS = [
  path.resolve(__dirname, "..", "serviceAccountKey.json"),
  path.resolve(__dirname, "service-account.json"),
  path.resolve(__dirname, "..", "service-account.json"),
];

const serviceAccountPath = CANDIDATE_PATHS.find((p) => fs.existsSync(p));
if (!serviceAccountPath) {
  console.error("\n❌  Service account JSON not found. Looked in:");
  CANDIDATE_PATHS.forEach((p) => console.error(`    - ${p}`));
  console.error("    See the SETUP block at the top of this file.\n");
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

const uid = process.argv[2];
if (!uid) {
  console.error("\n❌  Usage: node scripts/bootstrap-admin.cjs <uid>\n");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

(async () => {
  try {
    const user = await admin.auth().getUser(uid);
    const claims = { ...(user.customClaims || {}), admin: true };
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`\n✅  Admin claim set for ${user.email || uid}`);
    console.log("    Claims now:", claims);
    console.log(
      "    Tell the user to log out + in (or refresh) to pick up the new token.\n",
    );
    process.exit(0);
  } catch (err) {
    console.error("\n❌  Failed:", err.message || err);
    process.exit(1);
  }
})();
