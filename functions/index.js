// Cloud Functions for decycles.cc.
//
// Single responsibility: keep Firebase Auth custom claims in sync with the
// `role` field on users/{uid} documents. Storage and Firestore rules read
// `request.auth.token.admin` instead of doing cross-service Firestore lookups,
// which is faster, free per-call, and the canonical Firebase RBAC pattern.

const fs = require("fs");
const path = require("path");
const functions = require("firebase-functions/v1");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

/**
 * When users/{uid}.role changes, mirror it onto the user's custom claims.
 *
 * Triggered on every write to users/{uid} but no-ops unless the admin status
 * actually flipped, so promotions/demotions are cheap.
 *
 * Other custom claims (if we add any in the future) are preserved.
 */
exports.syncAdminClaim = onDocumentWritten(
  { document: "users/{userId}", region: "us-central1" },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const beforeAdmin = before?.role === "admin";
    const afterAdmin = after?.role === "admin";
    if (beforeAdmin === afterAdmin) return;

    const uid = event.params.userId;
    try {
      const user = await getAuth().getUser(uid);
      const claims = { ...(user.customClaims || {}) };
      if (afterAdmin) claims.admin = true;
      else delete claims.admin;
      await getAuth().setCustomUserClaims(uid, claims);
      logger.info(
        `[syncAdminClaim] ${uid} → admin=${afterAdmin}. Claims now:`,
        claims,
      );
    } catch (err) {
      // Most common failure: user was deleted from Auth but the doc lingered.
      // Log and move on — we don't want to block other Firestore writes.
      logger.error(`[syncAdminClaim] failed for ${uid}:`, err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Admin user management — operations that need the Admin SDK and therefore
// can't run from the client: changing another user's real login email, and
// fully deleting a user (Firestore docs + Auth account).
//
// Both are callable functions guarded by the `admin` custom claim (kept in
// sync by syncAdminClaim above). Non-admins get permission-denied.
// ─────────────────────────────────────────────────────────────────────────────

const assertAdmin = (request) => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
};

// Change a user's real authentication email (the one they log in with) and
// mirror it onto their users/{uid} doc.
exports.adminUpdateUserEmail = onCall({ region: "us-central1" }, async (request) => {
  assertAdmin(request);
  const uid = String(request.data?.uid || "").trim();
  const email = String(request.data?.email || "").trim();
  if (!uid || !email) {
    throw new HttpsError("invalid-argument", "uid and email are required.");
  }
  try {
    await getAuth().updateUser(uid, { email });
    await getFirestore().doc(`users/${uid}`).set({ email }, { merge: true });
    return { ok: true };
  } catch (err) {
    logger.error(`[adminUpdateUserEmail] failed for ${uid}:`, err);
    // Surface common Auth errors as friendly messages to the admin UI.
    if (err?.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "That email is already in use by another account.");
    }
    if (err?.code === "auth/invalid-email") {
      throw new HttpsError("invalid-argument", "That email address is invalid.");
    }
    if (err?.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No auth account exists for this user.");
    }
    throw new HttpsError("internal", err?.message || "Failed to update email.");
  }
});

// Fully delete a user: their Firestore docs (users + creators) and their Auth
// account. Admins can't delete their own account (avoids self-lockout).
exports.adminDeleteUser = onCall({ region: "us-central1" }, async (request) => {
  assertAdmin(request);
  const uid = String(request.data?.uid || "").trim();
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You can't delete your own account.");
  }
  try {
    const db = getFirestore();
    // Firestore docs first, so even if the Auth deletion is a no-op (account
    // already gone) the profile is removed.
    await db.doc(`users/${uid}`).delete().catch(() => {});
    await db.doc(`creators/${uid}`).delete().catch(() => {});
    await getAuth()
      .deleteUser(uid)
      .catch((e) => {
        // An already-missing Auth account is fine — the docs are gone.
        if (e?.code !== "auth/user-not-found") throw e;
      });
    return { ok: true };
  } catch (err) {
    logger.error(`[adminDeleteUser] failed for ${uid}:`, err);
    throw new HttpsError("internal", err?.message || "Failed to delete user.");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SSR for shared event links: returns the React shell with the event's title,
// description, and cover image baked into the OG meta tags. WhatsApp / Slack /
// Twitter / iMessage crawlers fetch the URL and read those tags — without
// this, every shared event would show the generic site preview.
//
// The function is intentionally NOT public; it's invoked only via Firebase
// Hosting's rewrite (firebase.json → /event/**). The Hosting service account
// is granted `roles/cloudfunctions.invoker` so the rewrite can reach it
// without `allUsers`, which this project's org policy forbids.
// ─────────────────────────────────────────────────────────────────────────────

let _template = null;
let _templateFetchTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes in-memory cache

const getTemplate = async () => {
  const now = Date.now();
  if (_template && (now - _templateFetchTime < CACHE_TTL_MS)) {
    return _template;
  }

  try {
    let projectId = process.env.GCLOUD_PROJECT;
    if (!projectId && process.env.FIREBASE_CONFIG) {
      try {
        projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
      } catch (e) {}
    }
    if (projectId) {
      const hostingUrl = `https://${projectId}.web.app/index.html`;
      logger.info(`[loadTemplate] Fetching latest template from ${hostingUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      
      const res = await fetch(hostingUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes("id=\"root\"")) {
          _template = text;
          _templateFetchTime = now;
          logger.info("[loadTemplate] Successfully fetched live template from hosting");
          return _template;
        }
      }
    }
  } catch (err) {
    logger.warn("[loadTemplate] Live template fetch failed, falling back to local copy", err);
  }

  // Fallback to local template.html
  if (!_template) {
    try {
      _template = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");
      _templateFetchTime = now;
    } catch (err) {
      logger.error("[loadTemplate] local template.html missing, using minimal fallback", err);
      _template = `<!doctype html><html><head><title>Decycles</title></head><body><div id="root"></div></body></html>`;
      _templateFetchTime = now;
    }
  }
  return _template;
};

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

// Re-uses the same weserv-based downscaler the static gen script uses, so the
// cover image stays under WhatsApp's 300 KB preview cap.
const proxyImage = (rawUrl) => {
  if (!rawUrl) return "https://www.decycles.cc/thumbnail.png";
  if (rawUrl.startsWith("https://www.decycles.cc/")) return rawUrl;
  const noProto = rawUrl.replace(/^https?:\/\//, "");
  const encoded = encodeURIComponent(noProto);
  return `https://images.weserv.nl/?url=ssl:${encoded}&w=1200&h=630&fit=cover&output=jpg&q=80&maxage=7d`;
};

exports.eventMeta = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {
    const fullPath = req.path || req.url || "";
    const m = fullPath.match(/\/event\/([^\/?#]+)\/(\d+)/);
    let html = await getTemplate();

    if (!m) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const [, creatorId, idxStr] = m;
    const eventIdx = parseInt(idxStr, 10);

    try {
      // Admin SDK exposes `exists` as a property; client SDK as a method.
      const snap = await getFirestore().doc(`creators/${creatorId}`).get();
      if (snap.exists) {
        const c = snap.data() || {};
        const events = Array.isArray(c.events) ? c.events : [];
        const ev = events[eventIdx];
        if (ev) {
          const title = (ev.title || "Event").toString().trim() || "Event";
          const rawDesc = (ev.description || c.description || "").toString();
          const desc =
            rawDesc.replace(/\s+/g, " ").trim().slice(0, 220) ||
            "An event on Decycles.";
          const image = proxyImage(ev.coverImage || c.coverImage || "");
          const url = `https://www.decycles.cc/event/${creatorId}/${eventIdx}`;
          const fullTitle = `${title} · Decycles`;

          html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
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

          // Schema.org Event JSON-LD so Google can render rich snippets
          // (date / location pill in search results, Google Events surfacing).
          const ldEvent = {
            "@context": "https://schema.org",
            "@type": "Event",
            name: title,
            description: desc,
            image: image,
            url,
            startDate: ev.startDate || undefined,
            endDate: ev.endDate || ev.startDate || undefined,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            location: ev.location
              ? {
                  "@type": "Place",
                  name: ev.location,
                  address: ev.location,
                }
              : undefined,
            organizer: {
              "@type": "Organization",
              name: c.name || "Decycles",
              url: `https://www.decycles.cc/creator/${creatorId}`,
            },
          };
          const ldScript = `\n    <script type="application/ld+json">${JSON.stringify(ldEvent)}</script>`;
          html = html.replace(/<\/head>/i, `${ldScript}\n  </head>`);
        }
      }
    } catch (err) {
      logger.error("[eventMeta] firestore read failed", err);
    }

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

// Same SSR trick as eventMeta but for creator profile URLs. When a creator
// page is shared, the crawler reads name + description + cover image from
// the meta tags. Real visitors get the same shell with React still booting
// the SPA from there.
exports.creatorMeta = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {
    const fullPath = req.path || req.url || "";
    const m = fullPath.match(/\/creator\/([^\/?#]+)/);
    let html = await getTemplate();

    if (!m) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const creatorId = m[1];
    try {
      const snap = await getFirestore().doc(`creators/${creatorId}`).get();
      if (snap.exists) {
        const c = snap.data() || {};
        const name = (c.name || "Creator").toString().trim() || "Creator";
        const rawDesc = (c.description || "").toString();
        const desc =
          rawDesc.replace(/\s+/g, " ").trim().slice(0, 220) ||
          `Discover ${name} on Decycles.`;
        const image = proxyImage(c.coverImage || c.profileImage || "");
        const url = `https://www.decycles.cc/creator/${creatorId}`;
        const fullTitle = `${name} · Decycles`;

        html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
        html = html.replace(/\s*<meta\s+property="og:image:width"[^>]*>/gi, "");
        html = html.replace(/\s*<meta\s+property="og:image:height"[^>]*>/gi, "");
        html = replaceMeta(html, "description", desc);
        html = replaceMeta(html, "og:type", "profile");
        html = replaceMeta(html, "og:url", url);
        html = replaceMeta(html, "og:title", fullTitle);
        html = replaceMeta(html, "og:description", desc);
        html = replaceMeta(html, "og:image", image);
        html = replaceMeta(html, "twitter:url", url);
        html = replaceMeta(html, "twitter:title", fullTitle);
        html = replaceMeta(html, "twitter:description", desc);
        html = replaceMeta(html, "twitter:image", image);

        // Schema.org Organization JSON-LD for richer SERP results.
        const ldOrg = {
          "@context": "https://schema.org",
          "@type": "Organization",
          name,
          description: desc,
          url,
          image,
          ...(c.website ? { sameAs: [c.website].filter(Boolean) } : {}),
          ...(c.address
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: c.location || undefined,
                  addressCountry: c.country || undefined,
                  streetAddress: c.address,
                },
              }
            : {}),
        };
        const ldScript = `\n    <script type="application/ld+json">${JSON.stringify(ldOrg)}</script>`;
        html = html.replace(/<\/head>/i, `${ldScript}\n  </head>`);
      }
    } catch (err) {
      logger.error("[creatorMeta] firestore read failed", err);
    }

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
