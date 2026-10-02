import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";

// Minimum credits: OpenStreetMap (ODbL) and OpenMapTiles (CC-BY) are required
// by their licences; OpenFreeMap asks for a credit in exchange for the free
// tiles. Leaflet's own "Leaflet" prefix is optional and dropped.
const MAP_ATTRIBUTION = [
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
  '<a href="https://openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a>',
  '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a>',
].join(" · ");

/**
 * Renders a MapLibre vector style as the base layer of a react-leaflet map,
 * so markers, popups and gesture handling stay plain Leaflet.
 */
export function VectorBasemap({ style }: { style: StyleSpecification }) {
  const map = useMap();

  useEffect(() => {
    // Recreated on theme change — simpler and safer than diffing styles.
    map.attributionControl?.setPrefix(false);
    const layer = L.maplibreGL({
      style,
      attributionControl: { customAttribution: MAP_ATTRIBUTION },
    } as L.LeafletMaplibreGLOptions);
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, style]);

  return null;
}
