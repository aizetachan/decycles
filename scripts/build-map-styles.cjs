#!/usr/bin/env node
/**
 * Builds the DECYCLES basemap styles (src/lib/mapStyles/decycles-*.json)
 * from OpenFreeMap's open styles plus our overrides, so the map keeps the
 * look of the CARTO Positron / Dark Matter tiles we used before.
 *
 *   npm run build:map-styles
 *
 * Re-run after changing the palettes below. Reference colours were sampled
 * from archived CARTO tiles (light_all / dark_all).
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "src", "lib", "mapStyles");

const THEMES = {
  light: {
    base: "https://tiles.openfreemap.org/styles/positron",
    land: "#fafaf8",
    landAlt: "#f4f4f2", // parks, woods, residential — barely visible like CARTO
    water: "#d4dadc",
    label: "#8a99a4",
    labelHalo: "rgba(250,250,248,0.9)",
    roadLabel: "#9aa5ad",
    borderCountry: "#e2c8cb",
    borderState: "#efdfe0",
  },
  dark: {
    base: "https://tiles.openfreemap.org/styles/dark",
    land: "#090909",
    landAlt: "#0e0e0e",
    water: "#262626",
    label: "#4a4a4a",
    labelHalo: "rgba(9,9,9,0.85)",
    roadLabel: "#3a3a3a",
    borderCountry: "#2a2a2a",
    borderState: "#1c1c1c",
  },
};

// English first (CARTO showed one name per place), then any Latin name.
const LABEL_TEXT = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

const isPlaceLabel = (id) => /^(place_|label_)/.test(id);
const isCountryLabel = (id) => /country/.test(id);
const isStateLabel = (id) => /state/.test(id) && isPlaceLabel(id);
const isWaterLabel = (id) => /^water(way)?_/.test(id) && id !== "waterway";
const isRoadLabel = (id) => /^highway[-_]name/.test(id);
const usesNameField = (layer) => JSON.stringify(layer.layout?.["text-field"] ?? "").includes("name");

function applyTheme(style, t) {
  style.name = `DECYCLES ${t === THEMES.light ? "light" : "dark"}`;
  for (const layer of style.layers) {
    const { id, type } = layer;
    const paint = (layer.paint ??= {});
    const layout = (layer.layout ??= {});

    if (type === "background") paint["background-color"] = t.land;

    if (type === "fill") {
      if (id === "water") paint["fill-color"] = t.water;
      else if (/park|wood|residential|ice_shelf|glacier/.test(id)) paint["fill-color"] = t.landAlt;
      else if (/pier/.test(id)) paint["fill-color"] = t.land;
    }
    if (type === "line") {
      if (id === "waterway") paint["line-color"] = t.water;
      else if (/pier/.test(id)) paint["line-color"] = t.land;
      else if (/^boundary/.test(id)) {
        const country = /country|_2$|disputed/.test(id);
        paint["line-color"] = country ? t.borderCountry : t.borderState;
      }
    }

    if (type === "symbol" && usesNameField(layer)) {
      layout["text-field"] = LABEL_TEXT;
      if (isPlaceLabel(id) || isWaterLabel(id)) {
        paint["text-color"] = t.label;
        paint["text-halo-color"] = t.labelHalo;
        paint["text-halo-width"] = 1.2;
      }
      if (isRoadLabel(id)) {
        paint["text-color"] = t.roadLabel;
        paint["text-halo-color"] = t.labelHalo;
      }
      if (isCountryLabel(id)) {
        layout["text-transform"] = "uppercase";
        layout["text-letter-spacing"] = 0.08;
        layout["text-font"] = ["Noto Sans Bold"];
      }
      // Region names only once zoomed in (CARTO hid them at continent scale).
      if (isStateLabel(id)) layer.minzoom = Math.max(layer.minzoom ?? 0, 6);
    }
  }
  return style;
}

(async () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    const res = await fetch(theme.base);
    if (!res.ok) throw new Error(`${theme.base} → HTTP ${res.status}`);
    const style = applyTheme(await res.json(), theme);
    const out = path.join(OUT_DIR, `decycles-${name}.json`);
    fs.writeFileSync(out, JSON.stringify(style, null, 2) + "\n");
    console.log(`✓ ${path.relative(process.cwd(), out)} (${style.layers.length} layers)`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
