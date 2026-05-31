#!/usr/bin/env node
/**
 * One-shot migration. Writes the bundled categories taxonomy from
 * src/constants/categories.ts into Firestore at `taxonomy/main`.
 *
 * Idempotent: if the doc already exists, the script exits without writing
 * unless `--force` is passed.
 *
 * Usage (from repo root, with serviceAccountKey.json present):
 *   node scripts/seed-categories.cjs            # seed only if missing
 *   node scripts/seed-categories.cjs --force    # overwrite existing doc
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

const force = process.argv.includes("--force");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Mirrors src/constants/categories.ts. We keep these inline so the script
// is self-contained and doesn't depend on the TS build / module system.
const SELECTABLE_CATEGORIES = [
  "Products",
  "SERVICES",
  "Creative & Media",
  "Community",
  "Events",
];

const SUBCATEGORIES = {
  "Bikes & Frames": [
    { groupName: "Build", options: ["Production", "Handmade"] },
    { groupName: "Material", options: ["Carbon", "Steel", "Titanium"] },
    { groupName: "Category", options: ["Road", "MTB", "Gravel", "Urban & Commuter", "Cargo & Utility", "BMX", "Track & Fixed", "Classic & Vintage", "Folding Bikes", "E-Bikes"] },
  ],
  Components: [
    { groupName: "Frameset", options: ["frame parts", "Forks"] },
    { groupName: "Cockpit", options: ["Handlebars", "Stems", "Headsets", "Bartapes & barends"] },
    { groupName: "Seatposts & Saddles", options: ["Seatposts", "Saddles"] },
    { groupName: "Wheels", options: ["Wheelsets", "Tires"] },
    { groupName: "Drivetrain", options: ["Cranksets & Chainrings", "Chains", "Bottom Brackets", "Derailleurs"] },
    { groupName: "Pedals", options: ["Platforms", "Straps & Clips"] },
  ],
  Accessories: [
    { groupName: "Category", options: ["Bags & Carrying", "Racks & Mounts", "Locks", "Bottles & Cages", "Helmets", "Electronics", "Lights", "Storage & Organizers"] },
  ],
  Clothing: [
    { groupName: "Category", options: ["Technical Cycling", "Casual & Lifestyle", "Headwear", "Shoes"] },
  ],
  Tools: [
    { groupName: "Category", options: ["Frame Building Tools", "Repair & Maintenance Tools", "Workshop Equipment"] },
  ],
  Products: [
    { groupName: "Category", options: ["Bikes & Frames", "Components", "Accessories", "Clothing", "Tools"] },
  ],
  SERVICES: [
    { groupName: "Category", options: ["Custom Builds & Repairs", "frame building", "Restorations", "Paint & Finishing"] },
  ],
  Competitions: [
    { groupName: "Category", options: ["Road races", "Gravel Races", "MTB Races", "Track Races", "Endurance & Ultra", "Fun & Community Races"] },
  ],
  Events: [
    { groupName: "Category", options: ["Competitions", "Social Rides", "Touring", "Workshops", "Festivals"] },
  ],
  Community: [
    { groupName: "Category", options: ["Cycling Culture", "Riding Groups", "Performance Groups", "Bikepacking & Adventure", "Learning & Education"] },
  ],
  "Creative & Media": [
    { groupName: "Category", options: ["Visual Artists & Illustrators", "Photographers & Videomakers", "Editorial & Publishing"] },
  ],
  "frame building": [
    { groupName: "Material", options: ["Carbon", "Steel", "Titanium"] },
  ],
};

(async () => {
  const db = admin.firestore();
  const ref = db.doc("taxonomy/main");
  const snap = await ref.get();

  if (snap.exists && !force) {
    console.log(`\nℹ️   taxonomy/main already exists. Use --force to overwrite.\n`);
    process.exit(0);
  }

  await ref.set({
    selectableCategories: SELECTABLE_CATEGORIES,
    subcategories: SUBCATEGORIES,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\n✅  Seeded taxonomy/main with ${SELECTABLE_CATEGORIES.length} main categories and ${Object.keys(SUBCATEGORIES).length} subcategory entries.\n`);
  process.exit(0);
})().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});
