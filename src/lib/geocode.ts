/**
 * Forward geocoding using Nominatim (OpenStreetMap).
 * Free, no API key, but rate-limited to ~1 req/sec per IP. Good enough for
 * occasional lookups when an admin/creator types an address.
 *
 * Nominatim is stricter about query format than Google Maps — em/en dashes,
 * parenthesized province codes ("(TV)"), and other Google-Maps-style
 * decorations break it. We sanitize the input and try a few variants before
 * giving up.
 *
 * If we ever switch to Google Maps Geocoding, only this file needs to change.
 */

export interface GeocodeResult {
  coordinates: [number, number]; // [lat, lng]
  city: string;
  country: string;
  formattedAddress: string;
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

async function runSearch(query: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "1",
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: {
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  const addr = first.address || {};

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    "";

  const country = addr.country || "";

  return {
    coordinates: [parseFloat(first.lat), parseFloat(first.lon)],
    city,
    country,
    formattedAddress: first.display_name || query,
  };
}

/**
 * Strip Google-Maps-style decorations that confuse Nominatim:
 *   "Via E. Fermi, 2 – 31011 Casella d'Asolo (TV), Italia"
 * becomes
 *   "Via E. Fermi, 2, 31011 Casella d'Asolo, Italia"
 */
function sanitizeAddress(address: string): string {
  return address
    // em/en dashes act as a range to Nominatim — turn them into a separator.
    .replace(/[–—]/g, ",")
    // parenthesized chunks ("(TV)", "(Madrid province)") are usually redundant
    // with the city name and just confuse the query.
    .replace(/\([^)]*\)/g, "")
    // collapse repeated commas / whitespace.
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\s*,/g, ",")
    .trim()
    // trim leading/trailing commas after cleanup.
    .replace(/^,+|,+$/g, "")
    .trim();
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = (address || "").trim();
  if (!trimmed) return null;

  // 1. Try the cleaned version first — covers the typical Google-Maps paste.
  const cleaned = sanitizeAddress(trimmed);
  if (cleaned) {
    const r1 = await runSearch(cleaned);
    if (r1) return r1;
  }

  // 2. Try the raw input verbatim (in case sanitizing was too aggressive).
  if (cleaned !== trimmed) {
    const r2 = await runSearch(trimmed);
    if (r2) return r2;
  }

  // 3. Last-chance: drop the street/number bit and search just by the locality
  //    half ("31011 Casella d'Asolo, Italia"). Loses pin precision (city
  //    centroid) but at least returns something — the user can refine later.
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const fallbackQuery = parts.slice(-3).join(", ");
    const r3 = await runSearch(fallbackQuery);
    if (r3) return r3;
  }

  return null;
}
