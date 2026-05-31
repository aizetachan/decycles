/**
 * Seed Firestore:
 *   1. Look up `santferal@gmail.com` in Firebase Auth and promote to admin
 *      (writes `users/{uid}.role = 'admin'`).
 *   2. Push every creator from `src/data.ts` into the `creators/{id}` collection
 *      using setDoc + merge (idempotent — safe to re-run).
 *
 * Auth: uses Application Default Credentials. If you haven't set them up:
 *   gcloud auth application-default login
 *
 * Run with:
 *   npm run seed
 */
import admin from "firebase-admin";
import { creators } from "../src/data";

const PROJECT_ID = "decycles-web-app-1777399378";
const ADMIN_EMAIL = "santferal@gmail.com";

async function main() {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });

  const db = admin.firestore();
  const auth = admin.auth();

  // 1. Promote admin.
  console.log(`\n→ Promoting ${ADMIN_EMAIL} to admin...`);
  let adminUid: string;
  try {
    const user = await auth.getUserByEmail(ADMIN_EMAIL);
    adminUid = user.uid;
    console.log(`  found uid: ${adminUid}`);
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      console.error(
        `  ✗ User ${ADMIN_EMAIL} does not exist in Firebase Auth yet.\n` +
          `    Sign up with this email in the deployed app first, then re-run "npm run seed".`
      );
      process.exit(1);
    }
    throw err;
  }

  await db.doc(`users/${adminUid}`).set(
    {
      email: ADMIN_EMAIL,
      role: "admin",
      promotedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  console.log(`  ✓ users/${adminUid}.role = 'admin'`);

  // 2. Seed creators.
  console.log(`\n→ Seeding ${creators.length} creators into Firestore...`);
  let written = 0;
  let batch = db.batch();
  for (const [i, creator] of creators.entries()) {
    const ref = db.doc(`creators/${creator.id}`);
    // Mark seeded entries as published so they show up immediately.
    batch.set(ref, { ...creator, isPublished: true }, { merge: true });
    written++;
    // Firestore batch limit is 500; commit every 400 to be safe.
    if (written % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
    if (i % 10 === 0) process.stdout.write(".");
  }
  await batch.commit();
  console.log(`\n  ✓ Wrote ${written} creator docs`);

  console.log("\n✅ Seed complete.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
