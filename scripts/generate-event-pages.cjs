#!/usr/bin/env node
/**
 * Pre-render static HTML pages with event-specific OG / Twitter meta tags at
 * build time. Firebase Hosting serves these directly when WhatsApp / Slack /
 * Twitter / iMessage fetch the URL with their crawler — so the share preview
 * shows the event's cover, title and description instead of the generic site
 * meta. The bundled JS still boots and renders the SPA normally for actual
 * visitors.
 *
 * Tradeoff: meta tags are frozen at deploy time. If an event is edited or
 * created after a deploy, the share preview won't update until the next
 * deploy. We pick this over a runtime SSR Cloud Function because the project
 * has an org policy blocking allUsers as a public function invoker.
 *
 * Output layout, served verbatim by Firebase Hosting:
 *   dist/event/{creatorId}/{eventIdx}/index.html
 */

const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(DIST, "index.html");
const SERVICE_ACCOUNT_PATH = path.join(ROOT, "serviceAccountKey.json");

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`✗ dist/index.html missing — run "vite build" before this script.`);
  process.exit(1);
}
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`✗ serviceAccountKey.json missing at repo root.`);
  process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const escapeHtml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const replaceMeta = (html, key, value) => {
  const escVal = escapeHtml(value);
  const propRegex = new RegExp(`<meta\\s+property="${key}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  const nameRegex = new RegExp(`<meta\\s+name="${key}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  if (propRegex.test(html)) return html.replace(propRegex, `<meta property="${key}" content="${escVal}" />`);
  if (nameRegex.test(html)) return html.replace(nameRegex, `<meta name="${key}" content="${escVal}" />`);
  return html;
};

// Crawler preview limits — WhatsApp drops images > ~300 KB and several
// platforms behave erratically with very large images. The original cover
// image stored in Firebase Storage is full-resolution (often multi-MB), so we
// route it through a public image proxy that resizes + recompresses to a
// social-card friendly format. The proxy returns a fresh image with public
// cache headers that crawlers will accept.
const proxyImage = (rawUrl) => {
  if (!rawUrl) return "https://www.decycles.cc/thumbnail.png";
  if (rawUrl.startsWith("https://www.decycles.cc/")) return rawUrl;
  // weserv.nl defaults to plain HTTP unless the source is prefixed with `ssl:`.
  // Firebase Storage redirects http → https and that redirect chain returns 403
  // on weserv's request, so we MUST mark the source as ssl.
  const noProto = rawUrl.replace(/^https?:\/\//, "");
  const encoded = encodeURIComponent(noProto);
  return `https://images.weserv.nl/?url=ssl:${encoded}&w=1200&h=630&fit=cover&output=jpg&q=80&maxage=7d`;
};

const buildEventHtml = (creator, event, idx) => {
  const title = (event.title || "Event").toString().trim() || "Event";
  const rawDesc = (event.description || creator.description || "").toString();
  const desc =
    rawDesc.replace(/\s+/g, " ").trim().slice(0, 220) || "An event on Decycles.";
  const rawImage = event.coverImage || creator.coverImage || "";
  const image = proxyImage(rawImage);
  const url = `https://www.decycles.cc/event/${creator.id}/${idx}`;
  const fullTitle = `${title} · Decycles`;

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  // The static template hard-codes width/height for the site thumbnail. Strip
  // them on event pages so crawlers infer the dimensions from the actual
  // proxied image instead of trusting a mismatched hint.
  html = html.replace(/\s*<meta\s+property="og:image:width"[^>]*>/gi, "");
  html = html.replace(/\s*<meta\s+property="og:image:height"[^>]*>/gi, "");
  html = replaceMeta(html, "description", desc);
  html = replaceMeta(html, "og:type", "article");
  html = replaceMeta(html, "og:url", url);
  html = replaceMeta(html, "og:title", fullTitle);
  html = replaceMeta(html, "og:description", desc);
  html = replaceMeta(html, "og:image", image);
  html = replaceMeta(html, "twitter:url", url);
  html = replaceMeta(html, "twitter:title", fullTitle);
  html = replaceMeta(html, "twitter:description", desc);
  html = replaceMeta(html, "twitter:image", image);
  return html;
};

(async () => {
  const db = admin.firestore();
  const snap = await db.collection("creators").get();
  let totalWritten = 0;
  let creatorsTouched = 0;

  for (const docSnap of snap.docs) {
    const creator = { id: docSnap.id, ...docSnap.data() };
    const events = Array.isArray(creator.events) ? creator.events : [];
    if (events.length === 0) continue;
    creatorsTouched += 1;
    events.forEach((event, idx) => {
      if (!event) return;
      const outDir = path.join(DIST, "event", creator.id, String(idx));
      fs.mkdirSync(outDir, { recursive: true });
      const html = buildEventHtml(creator, event, idx);
      fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
      totalWritten += 1;
    });
  }

  console.log(`✓ wrote ${totalWritten} event page(s) from ${creatorsTouched} creator(s)`);
  process.exit(0);
})().catch((err) => {
  console.error("✗ generate-event-pages failed:", err);
  process.exit(1);
});
