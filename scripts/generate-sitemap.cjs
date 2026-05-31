#!/usr/bin/env node
/**
 * Generate `dist/sitemap.xml` at build time so Google can discover every
 * public creator profile and event. The sitemap lives next to `dist/index.html`
 * so Firebase Hosting serves it at `https://decycles.cc/sitemap.xml`.
 *
 * Inclusion rules:
 *   - / and /welcome — always
 *   - /creator/:id — every creator with isPublished !== false
 *   - /event/:creatorId/:idx — every event where the EVENT itself is published.
 *     Shop publish state is intentionally NOT a gate here, matching the
 *     calendar's visibility logic for user-published events.
 *
 * Re-run on every deploy via package.json's `deploy` script.
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "sitemap.xml");
const SA_PATH = path.join(ROOT, "serviceAccountKey.json");
const BASE = "https://www.decycles.cc";

if (!fs.existsSync(DIST)) {
  console.error(`✗ dist/ missing — run "vite build" before this script.`);
  process.exit(1);
}
if (!fs.existsSync(SA_PATH)) {
  console.error(`✗ serviceAccountKey.json missing at repo root.`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });

const escapeXml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const urlEntry = (loc, lastmod, priority = "0.5", changefreq = "weekly") => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

(async () => {
  const now = new Date().toISOString().split("T")[0];
  const entries = [
    urlEntry(`${BASE}/`, now, "1.0", "daily"),
    urlEntry(`${BASE}/welcome`, now, "0.9", "weekly"),
  ];

  const snap = await admin.firestore().collection("creators").get();
  let creatorCount = 0;
  let eventCount = 0;

  snap.forEach((docSnap) => {
    const c = docSnap.data() || {};
    const id = docSnap.id;

    // Creator pages — published shops only.
    if (c.isPublished !== false) {
      creatorCount += 1;
      entries.push(urlEntry(`${BASE}/creator/${id}`, now, "0.7", "weekly"));
    }

    // Event pages — gated only on event.isPublished. User-published events
    // bypass the shop's publish state (same rule the calendar uses).
    const events = Array.isArray(c.events) ? c.events : [];
    events.forEach((e, idx) => {
      if (!e || !e.isPublished) return;
      if (e.publishedFrom !== "user" && c.isPublished === false) return;
      eventCount += 1;
      entries.push(urlEntry(`${BASE}/event/${id}/${idx}`, now, "0.6", "weekly"));
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  fs.writeFileSync(OUT, xml, "utf8");

  // robots.txt: point crawlers at the sitemap. Generated alongside so we don't
  // have to remember a separate static file in /public.
  const robots = `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`;
  fs.writeFileSync(path.join(DIST, "robots.txt"), robots, "utf8");

  console.log(`✓ sitemap.xml written (${creatorCount} creators + ${eventCount} events + 2 static)`);
  console.log(`✓ robots.txt written`);
  process.exit(0);
})().catch((err) => {
  console.error("✗ generate-sitemap failed:", err);
  process.exit(1);
});
