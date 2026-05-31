import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { GestureHandling } from "leaflet-gesture-handling";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import { Creator } from "../../types";
import { useUI } from "../../contexts/UIContext";
import { EVENT_CATEGORY_COLORS } from "../../constants/categories";

// Register two-finger / Ctrl+wheel gesture handling once at module load.
// Behaviour: 1-finger touch scrolls the page; 2-finger pans/zooms the map.
// On desktop, plain wheel scrolls the page; Ctrl/⌘+wheel zooms the map.
(L.Map as any).addInitHook("addHandler", "gestureHandling", GestureHandling);

interface CreatorMapProps {
  isDarkMode: boolean;
  filteredCreators: Creator[];
}

// Custom marker for events — small coloured dot with the category color. We
// build them on the fly per category so unknown categories fall back to a
// neutral gray.
const eventIcon = (color: string) =>
  L.divIcon({
    className: "decycles-event-marker",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 2px #000,0 0 0 4px #fff;"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

export function CreatorMap({ isDarkMode, filteredCreators }: CreatorMapProps) {
  const { openCreatorProfile, openEvent } = useUI();
  // Events on the map are opt-in for now — toggle hidden until the data has
  // dedicated geocoded coordinates per event. Today the marker falls back to
  // the parent shop's coordinates, so a single shop's events all cluster on
  // the same point.
  const [showEvents, setShowEvents] = useState(false);

  // Flatten the nested events from all filtered creators into a single list
  // with a resolved coordinate (event coords > shop coords).
  const eventMarkers = useMemo(() => {
    const list: any[] = [];
    filteredCreators.forEach((c: any) => {
      const events = Array.isArray(c.events) ? c.events : [];
      events.forEach((e: any, idx: number) => {
        if (!e || !e.isPublished) return;
        const coords = e.coordinates || c.coordinates;
        if (!coords) return;
        list.push({
          creator: c,
          event: e,
          idx,
          coords,
          color: EVENT_CATEGORY_COLORS[e.category as string] || "#9ca3af",
        });
      });
    });
    return list;
  }, [filteredCreators]);

  return (
    <div className={`relative h-[600px] w-full brutalist-border brutalist-shadow ${isDarkMode ? "bg-black" : "bg-white"}`}>
      {/* Toggle — shows / hides the event-marker layer. Sits above the map. */}
      <div className="absolute top-3 right-3 z-[400] flex items-center">
        <button
          type="button"
          onClick={() => setShowEvents((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 brutalist-shadow transition-colors ${
            showEvents
              ? isDarkMode
                ? "bg-white text-black border-white"
                : "bg-black text-white border-black"
              : isDarkMode
              ? "bg-black/80 text-white border-white backdrop-blur"
              : "bg-white/80 text-black border-black backdrop-blur"
          }`}
          aria-pressed={showEvents}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          {showEvents ? "Hide events" : "Show events"}
          <span className="opacity-60">({eventMarkers.length})</span>
        </button>
      </div>

      <MapContainer
        center={[40, 0]}
        zoom={2}
        minZoom={2}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        {...({ gestureHandling: true } as any)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={isDarkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
        />
        {filteredCreators.map(creator => creator.coordinates && (
          <Marker key={creator.id} position={creator.coordinates}>
            <Popup className={isDarkMode ? "dark-popup" : ""}>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <img src={creator.coverImage} alt={creator.name} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                <h3 className="font-display uppercase tracking-wider text-xl m-0">{creator.name}</h3>
                {creator.address && <p className="text-xs text-gray-400 m-0">{creator.address}</p>}
                <button
                  onClick={() => openCreatorProfile(creator.id)}
                  className={`text-xs font-bold uppercase tracking-widest py-2 mt-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        {showEvents && eventMarkers.map((m) => (
          <Marker
            key={`event-${m.creator.id}-${m.idx}`}
            position={m.coords}
            icon={eventIcon(m.color)}
          >
            <Popup className={isDarkMode ? "dark-popup" : ""}>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {m.event.category || "Event"}
                  </span>
                </div>
                <h3 className="font-display uppercase tracking-wider text-lg m-0">{m.event.title || "Untitled event"}</h3>
                {m.event.location && <p className="text-xs text-gray-500 m-0">{m.event.location}</p>}
                <button
                  onClick={() => openEvent({
                    id: m.creator.id,
                    _eventIdx: m.idx,
                    name: m.event.title || "Untitled Event",
                    description: m.event.description,
                    coverImage: m.event.coverImage || m.creator.coverImage,
                    subCategories: m.event.category ? [m.event.category] : [],
                    location: m.event.location,
                    eventDate: m.event.startDate,
                    endDate: m.event.endDate,
                    startTime: m.event.startTime,
                    endTime: m.event.endTime,
                    publishedFrom: m.event.publishedFrom,
                    creatorName: m.creator.name,
                    creatorImage: m.creator.profileImage,
                    creatorId: m.creator.id,
                  })}
                  className={`text-xs font-bold uppercase tracking-widest py-2 mt-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
                >
                  View Event
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
