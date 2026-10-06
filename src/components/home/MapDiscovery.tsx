import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

type LatLng = [number, number];

const WORLD_VIEW = { center: [40, 0] as LatLng, zoom: 2 };

/** Great-circle distance in km. */
function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Frames the map on the current results whenever the filters change: a
 * country, a search ("Barcelona") or a category zooms to what matches;
 * clearing every filter goes back to the world view. Reuses the existing
 * filter controls, so the map needs no extra buttons for this.
 */
export function FitToResults({ points, active }: { points: LatLng[]; active: boolean }) {
  const map = useMap();
  const key = active ? points.map((p) => p.join(",")).sort().join("|") : "world";
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (lastKey.current === key) return;
    const first = lastKey.current === null;
    lastKey.current = key;
    if (!active) {
      if (!first) map.flyTo(WORLD_VIEW.center, WORLD_VIEW.zoom, { duration: 0.8 });
      return;
    }
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], 11, { duration: 0.8 });
      return;
    }
    map.flyToBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 12, duration: 0.8 });
  }, [key, active, points, map]);

  return null;
}

const NEARBY_COUNT = 8; // frame the closest few creators…
const NEARBY_MAX_KM = 300; // …but only those within a reasonable distance

const LOCATE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>';

/**
 * "Near me" — one Leaflet control stacked under the zoom buttons. Location is
 * only requested when the visitor taps it (never on page load) and is never
 * stored. On success the map frames the visitor plus the closest creators
 * within NEARBY_MAX_KM; otherwise a short notice explains why.
 */
export function NearMeControl({ points }: { points: LatLng[] }) {
  const map = useMap();
  const [notice, setNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const userMarker = useRef<L.CircleMarker | null>(null);
  const buttonRef = useRef<HTMLAnchorElement | null>(null);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setNotice("Location isn't available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const me: LatLng = [pos.coords.latitude, pos.coords.longitude];
        if (!userMarker.current) {
          userMarker.current = L.circleMarker(me, {
            radius: 8,
            color: "#fff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          }).addTo(map);
        } else {
          userMarker.current.setLatLng(me);
        }
        const nearby = pointsRef.current
          .map((p) => ({ p, km: distanceKm(me, p) }))
          .filter((x) => x.km <= NEARBY_MAX_KM)
          .sort((a, b) => a.km - b.km)
          .slice(0, NEARBY_COUNT)
          .map((x) => x.p);
        if (nearby.length === 0) {
          map.flyTo(me, 9, { duration: 0.8 });
          setNotice("Nothing near you yet — zoom out to explore");
          return;
        }
        map.flyToBounds(L.latLngBounds([me, ...nearby]), { padding: [48, 48], maxZoom: 13, duration: 0.8 });
      },
      (err) => {
        setLocating(false);
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : "Couldn't get your location",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };
  const locateRef = useRef(locate);
  locateRef.current = locate;

  // Native Leaflet control so it stacks under the zoom buttons with the same look.
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const bar = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const a = L.DomUtil.create("a", "decycles-near-me", bar) as HTMLAnchorElement;
        a.href = "#";
        a.title = "Near me";
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", "Show what's near me");
        a.innerHTML = LOCATE_ICON;
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.on(a, "click", (e) => {
          L.DomEvent.preventDefault(e);
          locateRef.current();
        });
        buttonRef.current = a;
        return bar;
      },
    });
    const control = new Control({ position: "topleft" });
    control.addTo(map);
    return () => {
      control.remove();
      userMarker.current?.remove();
      userMarker.current = null;
    };
  }, [map]);

  useEffect(() => {
    buttonRef.current?.classList.toggle("is-locating", locating);
  }, [locating]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!notice) return null;
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-black text-white border-2 border-white whitespace-nowrap">
      {notice}
    </div>
  );
}
