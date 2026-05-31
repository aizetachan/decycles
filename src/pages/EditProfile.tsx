import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, MapPin, Loader2, ChevronDown, ChevronUp, Search, Calendar as CalIcon } from "lucide-react";
import { DatePicker } from "../components/ui/DatePicker";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useDropzone } from "react-dropzone";

import { creators } from "../data";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { Header } from "../components/layout/Header";
import { PasswordSetupForm } from "../components/auth/PasswordSetupForm";
import { CoverPreviewModal } from "../components/modals/CoverPreviewModal";
import { Category, SubCategory, Creator } from "../types";
import { db } from "../firebase";
import { uploadImage, stripUndefined, normalizeUrl, isEphemeralUrl } from "../lib/upload";
import { CREATOR_DEFAULT_AVATAR, CREATOR_DEFAULT_COVER, randomUserAvatar } from "../lib/defaultAvatars";
import { geocodeAddress } from "../lib/geocode";
import { EVENT_CATEGORIES } from "../constants/categories";
import { useCategories } from "../contexts/CategoriesContext";
import { EventRowAttendees, EventAttendeesPanel } from "../components/events/EventAttendees";
import { GalleryManager } from "../components/ui/GalleryManager";
import { trackEvent } from "../lib/analytics";

// Centered, full-cover overlay used on top of any image dropzone while an upload is in flight.
function UploadSpinnerOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none z-10">
      <Loader2 className="w-8 h-8 text-white animate-spin" />
    </div>
  );
}

// Bottom-aligned progress bar overlay; `percent` is 0..100.
function UploadProgressOverlay({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none z-10 px-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white mb-2">
        Uploading {Math.round(clamped)}%
      </span>
      <div className="w-full max-w-[180px] h-1.5 bg-white/20 overflow-hidden">
        <div
          className="h-full bg-white transition-[width] duration-150 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// Compact list + search + collapse for the EVENTS tab. Each event renders as
// a one-line row; click expands it inline to the full EventEditorItem. Search
// matches title / category / location case-insensitively.
export function EventsTab({ isDarkMode, profileData, setProfileData, uid, showAttendees = false }: any) {
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const events = profileData.events || [];
  const filtered = events
    .map((e: any, idx: number) => ({ e, idx }))
    .filter(({ e }: { e: any }) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = [e.title, e.category, e.location, e.description].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });

  const addEvent = () => {
    trackEvent("click_create_event", {
      creator_id: uid,
    });
    const newIdx = events.length;
    setProfileData({
      ...profileData,
      events: [
        ...events,
        { title: "", startDate: "", endDate: "", location: "", description: "", category: "", isPublished: false },
      ],
    });
    setExpandedIdx(newIdx);
  };

  const removeEvent = (idx: number) => {
    if (!window.confirm("Delete this event? This can't be undone.")) return;
    const next = events.filter((_: any, i: number) => i !== idx);
    setProfileData({ ...profileData, events: next });
    setExpandedIdx(null);
  };

  const togglePublish = (idx: number) => {
    const next = [...events];
    next[idx] = { ...next[idx], isPublished: !next[idx].isPublished };
    setProfileData({ ...profileData, events: next });
  };

  const formatDateRange = (e: any) => {
    if (!e.startDate && !e.endDate) return "No date";
    if (e.startDate && e.endDate && e.startDate !== e.endDate) return `${e.startDate} → ${e.endDate}`;
    return e.startDate || e.endDate;
  };

  const inputCls = `w-full pl-9 pr-9 py-2 text-sm font-medium border-2 outline-none ${
    isDarkMode ? "bg-black border-zinc-700 focus:border-white text-white placeholder-gray-600" : "bg-white border-gray-300 focus:border-black text-black placeholder-gray-400"
  }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <label className={`block text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>
          Events <span className={`ml-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>({events.length})</span>
        </label>
        <button
          type="button"
          onClick={addEvent}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
            isDarkMode ? "bg-white text-black border-white hover:bg-zinc-200" : "bg-black text-white border-black hover:bg-zinc-800"
          }`}
        >
          <Plus className="w-4 h-4" /> Create event
        </button>
      </div>
      <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
        For an event to appear in the public calendar, the event AND your shop both need to be <span className="font-bold">published</span>. Don't forget to hit <span className="font-bold">Save changes</span> at the bottom after editing.
      </p>

      {events.length > 0 && (
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, location..."
            className={inputCls}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black"}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className={`p-8 text-center text-sm font-bold uppercase tracking-widest border-2 border-dashed ${
          isDarkMode ? "border-white/20 text-gray-400" : "border-black/20 text-gray-500"
        }`}>
          No events yet — click "Create event" to add one.
        </div>
      ) : filtered.length === 0 ? (
        <div className={`p-6 text-center text-xs font-bold uppercase tracking-widest border-2 ${
          isDarkMode ? "border-white/10 text-gray-400" : "border-black/10 text-gray-500"
        }`}>
          No events match your search.
        </div>
      ) : (
        <div className={`border-2 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
          {filtered.map(({ e, idx }: { e: any; idx: number }) => {
            const expanded = expandedIdx === idx;
            return (
              <div key={idx} className={`border-b-2 last:border-b-0 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
                <div
                  onClick={() => setExpandedIdx(expanded ? null : idx)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                    isDarkMode ? "hover:bg-white/5" : "hover:bg-black/5"
                  }`}
                >
                  <div className={`w-10 h-10 shrink-0 flex items-center justify-center border-2 ${
                    isDarkMode ? "border-white/20" : "border-black/20"
                  }`}>
                    {e.coverImage ? (
                      <img src={e.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <CalIcon className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{e.title || "Untitled event"}</div>
                    <div className={`text-[11px] truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatDateRange(e)}{e.location ? ` · ${e.location}` : ""}{e.category ? ` · ${e.category}` : ""}
                    </div>
                    {showAttendees && uid && (
                      <EventRowAttendees creatorId={uid} eventIdx={idx} isDarkMode={isDarkMode} />
                    )}
                  </div>
                  <span className={`hidden sm:inline-flex shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-2 ${
                    e.isPublished
                      ? isDarkMode ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200"
                      : isDarkMode ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-yellow-50 text-yellow-600 border-yellow-200"
                  }`}>
                    {e.isPublished ? "Published" : "Draft"}
                  </span>
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); removeEvent(idx); }}
                    aria-label="Delete event"
                    className={`p-1.5 border-2 transition-colors ${
                      isDarkMode ? "border-white/20 text-red-400 hover:border-red-400 hover:bg-red-400/10" : "border-black/20 text-red-600 hover:border-red-600 hover:bg-red-600/10"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {expanded ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
                </div>
                {expanded && (
                  <div className="p-3">
                    <EventEditorItem
                      event={e}
                      idx={idx}
                      isDarkMode={isDarkMode}
                      profileData={profileData}
                      setProfileData={setProfileData}
                      uid={uid}
                      showAttendees={showAttendees}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EventEditorItem({
  event,
  idx,
  isDarkMode,
  profileData,
  setProfileData,
  uid,
  showAttendees = false,
}: any) {
  // Single-day events store `endDate === startDate`. Multi-day events let the
  // user pick a different endDate. The toggle's initial state is derived from
  // the saved data so reopening a multi-day event remembers the layout.
  const [isMultiDay, setIsMultiDay] = useState<boolean>(
    !!(event.endDate && event.startDate && event.endDate !== event.startDate),
  );
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  // Address geocoding state — mirrors the shop address field so an event can be
  // pinned at its own specific location, independent of the shop's address.
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);

  // Geocode the event's own address on blur and store coordinates on the event.
  // City/country auto-fill from the lookup so the event shows a readable place
  // and pins correctly on the map (CreatorMap reads `event.coordinates`).
  const onAddressBlur = async () => {
    const address = (event.address || "").trim();
    if (!address) return;
    setGeocoding(true);
    setGeocodeMessage(null);
    try {
      const result = await geocodeAddress(address);
      if (!result) {
        setGeocodeMessage("Couldn't locate this address on the map.");
        return;
      }
      const newEvents = [...profileData.events];
      newEvents[idx] = {
        ...newEvents[idx],
        coordinates: result.coordinates,
        location: result.city || newEvents[idx].location || "",
        country: result.country || newEvents[idx].country || "",
      };
      setProfileData({ ...profileData, events: newEvents });
      setGeocodeMessage(`Location found: ${result.formattedAddress}`);
    } catch (err) {
      console.error("Failed to geocode event address", err);
      setGeocodeMessage("Geocoding failed. Try again later.");
    } finally {
      setGeocoding(false);
    }
  };

  const onCoverDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !uid) return;
    const file = acceptedFiles[0];
    // Optimistic preview while the upload is in flight.
    const blobPreview = URL.createObjectURL(file);
    const startEvents = [...profileData.events];
    startEvents[idx] = { ...startEvents[idx], coverImage: blobPreview };
    setProfileData({ ...profileData, events: startEvents });
    setCoverProgress(0);
    try {
      const url = await uploadImage(file, `creators/${uid}/events/${idx}/cover-${Date.now()}`, (pct) =>
        setCoverProgress(Math.round(pct)),
      );
      const newEvents = [...profileData.events];
      newEvents[idx] = { ...newEvents[idx], coverImage: url };
      setProfileData({ ...profileData, events: newEvents });
    } catch (err) {
      console.error("Failed to upload event cover", err);
      alert("Failed to upload cover image. Please try again.");
      // Roll back to whatever was saved before the upload attempt.
      const newEvents = [...profileData.events];
      newEvents[idx] = { ...newEvents[idx], coverImage: event.coverImage || "" };
      setProfileData({ ...profileData, events: newEvents });
    } finally {
      setCoverProgress(null);
      URL.revokeObjectURL(blobPreview);
    }
  };

  const {
    getRootProps: getCoverRootProps,
    getInputProps: getCoverInputProps,
    isDragActive: isCoverDragActive,
  } = useDropzone({ onDrop: onCoverDrop, accept: { "image/*": [] }, maxFiles: 1 } as any);

  // An event needs a resolvable location to pin on the map: its own geocoded
  // coordinates, or — for shop owners — the shop's coordinates as a fallback.
  // Users without a shop must always give the event its own address.
  const shopHasLocation = !!(
    (profileData.coordinates && profileData.coordinates.length === 2) ||
    (profileData.address && String(profileData.address).trim())
  );
  const eventHasOwnCoords = Array.isArray(event.coordinates) && event.coordinates.length === 2;
  const eventCanPin = eventHasOwnCoords || !!(profileData.coordinates && profileData.coordinates.length === 2);

  // Copy the shop's address + coordinates onto the event, so a shop owner can
  // one-click reuse their shop location instead of re-typing the address.
  const useShopLocation = () => {
    const newEvents = [...profileData.events];
    newEvents[idx] = {
      ...newEvents[idx],
      address: profileData.address || newEvents[idx].address || "",
      coordinates: profileData.coordinates || newEvents[idx].coordinates,
      location: profileData.location || newEvents[idx].location || "",
      country: profileData.country || newEvents[idx].country || "",
    };
    setProfileData({ ...profileData, events: newEvents });
    setGeocodeMessage("Using your shop's location for this event.");
  };

  return (
    <div className={`p-6 border-2 ${isDarkMode ? "border-white/20 bg-white/5" : "border-black/20 bg-black/5"}`}>
      <div className="flex justify-between items-start mb-6">
        <h3 className={`text-sm font-bold uppercase ${isDarkMode ? "text-white" : "text-black"}`}>
          Event {idx + 1}
        </h3>
        <div className="flex items-center gap-4">
          <button
            type="button"
            // Always allow unpublishing. Only allow publishing once the event
            // has a resolvable location, so a published event always pins.
            disabled={!event.isPublished && !eventCanPin}
            title={
              event.isPublished
                ? "Click to unpublish"
                : eventCanPin
                ? "Click to publish this event"
                : "Add an event location first — a published event needs a place to pin on the map."
            }
            onClick={() => {
              // The publish source is set explicitly by the "Publish from"
              // selector below, so the toggle here just flips isPublished.
              const newEvents = [...profileData.events];
              const next = { ...newEvents[idx], isPublished: !event.isPublished };
              // Default the source if it hasn't been set yet (e.g. legacy event
              // from before the selector existed).
              if (next.isPublished && !next.publishedFrom) {
                next.publishedFrom = profileData.role === "user" ? "user" : "shop";
              }
              newEvents[idx] = next;
              setProfileData({ ...profileData, events: newEvents });

              trackEvent(next.isPublished ? "publish_event" : "unpublish_event", {
                event_title: event.title || "Untitled",
                event_category: event.category || "None",
                published_from: next.publishedFrom || "shop",
              });
            }}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              event.isPublished
                ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600"
                : "bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600"
            }`}
          >
            {event.isPublished ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            onClick={() => {
              const newEvents = profileData.events.filter((_: any, i: number) => i !== idx);
              setProfileData({ ...profileData, events: newEvents });
            }}
            className={`p-2 border-2 transition-colors ${
              isDarkMode
                ? "border-white/20 text-red-400 hover:border-red-400 hover:bg-red-400/10"
                : "border-black/20 text-red-600 hover:border-red-600 hover:bg-red-600/10"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAttendees && uid && (
        <div className="mb-6">
          <EventAttendeesPanel creatorId={uid} eventIdx={idx} isDarkMode={isDarkMode} />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Event Title"
            value={event.title}
            onChange={(e) => {
              const newEvents = [...profileData.events];
              newEvents[idx].title = e.target.value;
              setProfileData({ ...profileData, events: newEvents });
            }}
            className={`flex-1 p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDarkMode
                ? "border-white/20 text-white focus:ring-white focus:ring-offset-black placeholder-gray-600"
                : "border-black/20 text-black focus:ring-black focus:ring-offset-white placeholder-gray-400"
            }`}
          />
          <select
            value={event.category || ""}
            onChange={(e) => {
              const newEvents = [...profileData.events];
              newEvents[idx].category = e.target.value;
              setProfileData({ ...profileData, events: newEvents });
            }}
            className={`w-full md:w-1/3 p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDarkMode
                ? "border-white/20 text-white focus:ring-white focus:ring-offset-black"
                : "border-black/20 text-black focus:ring-black focus:ring-offset-white"
            }`}
          >
            <option value="" disabled className={isDarkMode ? "bg-black" : "bg-white"}>
              Select Category
            </option>
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className={isDarkMode ? "bg-black" : "bg-white"}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {isMultiDay ? "Start Date" : "Event Date"}
              </label>
              <DatePicker
                value={event.startDate || event.date || ""}
                isDarkMode={isDarkMode}
                onChange={(val) => {
                  const newEvents = [...profileData.events];
                  if (isMultiDay) {
                    newEvents[idx] = { ...newEvents[idx], startDate: val };
                  } else {
                    // Single-day: keep startDate and endDate in sync
                    newEvents[idx] = { ...newEvents[idx], startDate: val, endDate: val };
                  }
                  setProfileData({ ...profileData, events: newEvents });
                }}
              />
            </div>
            {isMultiDay && (
              <div className="space-y-2">
                <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  End Date
                </label>
                <DatePicker
                  value={event.endDate || ""}
                  min={event.startDate || undefined}
                  isDarkMode={isDarkMode}
                  onChange={(val) => {
                    const newEvents = [...profileData.events];
                    newEvents[idx] = { ...newEvents[idx], endDate: val };
                    setProfileData({ ...profileData, events: newEvents });
                  }}
                />
              </div>
            )}
          </div>
          <label className={`inline-flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            <input
              type="checkbox"
              checked={isMultiDay}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsMultiDay(checked);
                const newEvents = [...profileData.events];
                if (!checked) {
                  // Collapse: clear endDate so it's implicitly === startDate
                  newEvents[idx] = { ...newEvents[idx], endDate: newEvents[idx].startDate || "" };
                } else if (!newEvents[idx].endDate) {
                  // Seed endDate = startDate when first enabling
                  newEvents[idx] = { ...newEvents[idx], endDate: newEvents[idx].startDate || "" };
                }
                setProfileData({ ...profileData, events: newEvents });
              }}
              className="w-4 h-4 cursor-pointer accent-current"
            />
            Multi-day event
          </label>
        </div>

        {/* Optional time — start/end. Free-form `HH:MM` (browser-native time
            input). Empty means "no specific time". The end time only shows if
            a start time is set, to avoid awkward orphan inputs. */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Start time (optional)
            </label>
            <input
              type="time"
              value={event.startTime || ""}
              onChange={(e) => {
                const newEvents = [...profileData.events];
                newEvents[idx] = { ...newEvents[idx], startTime: e.target.value };
                setProfileData({ ...profileData, events: newEvents });
              }}
              className={`w-full p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDarkMode ? "border-white/20 text-white focus:ring-white focus:ring-offset-black" : "border-black/20 text-black focus:ring-black focus:ring-offset-white"
              }`}
            />
          </div>
          {event.startTime && (
            <div className="space-y-2">
              <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                End time (optional)
              </label>
              <input
                type="time"
                value={event.endTime || ""}
                onChange={(e) => {
                  const newEvents = [...profileData.events];
                  newEvents[idx] = { ...newEvents[idx], endTime: e.target.value };
                  setProfileData({ ...profileData, events: newEvents });
                }}
                className={`w-full p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDarkMode ? "border-white/20 text-white focus:ring-white focus:ring-offset-black" : "border-black/20 text-black focus:ring-black focus:ring-offset-white"
                }`}
              />
            </div>
          )}
        </div>

        {/* Recurrence — generates additional calendar occurrences from the
            event's startDate onwards. "Weekly" repeats every same-weekday,
            "monthly" every same-date-of-month. */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Repeats
          </label>
          <select
            value={event.recurrence || "none"}
            onChange={(e) => {
              const newEvents = [...profileData.events];
              newEvents[idx] = { ...newEvents[idx], recurrence: e.target.value === "none" ? "" : e.target.value };
              setProfileData({ ...profileData, events: newEvents });
            }}
            className={`w-full p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDarkMode ? "border-white/20 text-white focus:ring-white focus:ring-offset-black" : "border-black/20 text-black focus:ring-black focus:ring-offset-white"
            }`}
          >
            <option value="none" className={isDarkMode ? "bg-black" : "bg-white"}>Doesn't repeat</option>
            <option value="weekly" className={isDarkMode ? "bg-black" : "bg-white"}>Weekly (every same weekday)</option>
            <option value="monthly" className={isDarkMode ? "bg-black" : "bg-white"}>Monthly (every same date)</option>
          </select>
        </div>

        {/* Publish source — controls which profile the event appears under in
            the calendar. Defaults to "shop" for creators/admins; users without
            a shop don't see this selector since they can only publish as user. */}
        {(profileData.role === "creator" || profileData.role === "admin") && (() => {
          const currentSource = event.publishedFrom || "shop";
          const shopWillBePublished = !!profileData.isPublished && canPublishShop(profileData);
          const sources: { value: "shop" | "user"; label: string }[] = [
            { value: "shop", label: "Shop profile" },
            { value: "user", label: "User profile" },
          ];
          return (
            <div className="space-y-2">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Publish from
              </label>
              <div className="flex flex-wrap gap-2">
                {sources.map((s) => {
                  const active = currentSource === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        const newEvents = [...profileData.events];
                        newEvents[idx] = { ...newEvents[idx], publishedFrom: s.value };
                        setProfileData({ ...profileData, events: newEvents });
                      }}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                        active
                          ? isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
                          : isDarkMode ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white" : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {currentSource === "shop" && !shopWillBePublished && (
                <p className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
                  ⚠ Your shop is in draft. This event won't appear in the calendar until the shop is published. Switch to "User profile" to publish without the shop.
                </p>
              )}
            </div>
          );
        })()}

        {/* Event location — its own address, independent of the shop's. When
            geocoded it gives the event dedicated coordinates so it pins at the
            exact venue on the map instead of falling back to the shop's pin.
            A location is required to publish: shop owners can one-click reuse
            their shop's location, but it can always be refined to the exact venue. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Event location <span className="text-red-500">*</span>
            </label>
            {shopHasLocation && (
              <button
                type="button"
                onClick={useShopLocation}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition-colors ${
                  isDarkMode
                    ? "border-white/30 text-white hover:bg-white/10"
                    : "border-black/30 text-black hover:bg-black/5"
                }`}
              >
                <MapPin className="w-3 h-3" /> Use shop location
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Plaça de Catalunya, Barcelona, Spain"
              value={event.address || ""}
              onChange={(e) => {
                const newEvents = [...profileData.events];
                newEvents[idx] = { ...newEvents[idx], address: e.target.value };
                setProfileData({ ...profileData, events: newEvents });
              }}
              onBlur={onAddressBlur}
              className={`w-full pl-10 p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDarkMode
                  ? "border-white/20 text-white focus:ring-white focus:ring-offset-black placeholder-gray-600"
                  : "border-black/20 text-black focus:ring-black focus:ring-offset-white placeholder-gray-400"
              }`}
            />
            <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
            {geocoding && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Locating...
              </span>
            )}
          </div>
          {geocodeMessage && (
            <p className={`text-[10px] font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {geocodeMessage}
            </p>
          )}
          {eventCanPin ? (
            <p className={`text-[10px] ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
              Enter the exact venue so the event pins precisely on the map. City fills in automatically.
            </p>
          ) : (
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
              ⚠ A location is required to publish — type the venue address{shopHasLocation ? ` or tap "Use shop location"` : ""}.
            </p>
          )}
        </div>

        <input
          type="text"
          list="cities-list"
          placeholder="City"
          value={event.location}
          onChange={(e) => {
            const newEvents = [...profileData.events];
            newEvents[idx].location = e.target.value;
            setProfileData({ ...profileData, events: newEvents });
          }}
          className={`w-full p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDarkMode
              ? "border-white/20 text-white focus:ring-white focus:ring-offset-black placeholder-gray-600"
              : "border-black/20 text-black focus:ring-black focus:ring-offset-white placeholder-gray-400"
          }`}
        />
        <textarea
          rows={3}
          placeholder="Description"
          value={event.description}
          onChange={(e) => {
            const newEvents = [...profileData.events];
            newEvents[idx].description = e.target.value;
            setProfileData({ ...profileData, events: newEvents });
          }}
          className={`w-full p-3 text-sm border-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDarkMode
              ? "border-white/20 text-white focus:ring-white focus:ring-offset-black placeholder-gray-600"
              : "border-black/20 text-black focus:ring-black focus:ring-offset-white placeholder-gray-400"
          }`}
        />

        {/* Event Cover Image */}
        <div className="pt-4">
          <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Event Cover Image
          </label>
          <div className="flex flex-col gap-3 mt-2">
            {event.coverImage && (
              <div className="relative w-full">
                <img src={event.coverImage} alt="Event Cover" className="w-full h-32 object-cover border-2 border-white/20" referrerPolicy="no-referrer" />
                {coverProgress !== null && <UploadProgressOverlay percent={coverProgress} />}
              </div>
            )}
            <div
              {...getCoverRootProps()}
              className={`w-full p-6 border-2 border-dashed text-center cursor-pointer transition-colors ${
                isCoverDragActive
                  ? "border-black bg-black/5"
                  : isDarkMode
                  ? "border-white/20 hover:border-white/40 hover:bg-white/5"
                  : "border-black/20 hover:border-black/40 hover:bg-black/5"
              }`}
            >
              <input {...getCoverInputProps()} />
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Drag & drop a cover image here, or click to select
              </span>
            </div>
          </div>
        </div>

        {/* Event Gallery — multi-upload + drag-to-reorder. */}
        <div className="pt-4">
          <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Event Gallery Images (Max 5)
          </label>
          <div className="mt-2">
            <GalleryManager
              items={event.gallery || []}
              onChange={(gallery) => {
                const newEvents = [...profileData.events];
                newEvents[idx] = { ...newEvents[idx], gallery };
                setProfileData({ ...profileData, events: newEvents });
              }}
              folder={`creators/${uid}/events/${idx}/gallery`}
              isDarkMode={isDarkMode}
              maxItems={5}
              disabled={!uid}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The profile data is split conceptually in two:
 *   - Personal: applies to BOTH user and creator. Lives in users/{uid}.
 *   - Shop:     applies to creator only. Lives in creators/{uid}.
 *
 * EditProfile holds both in the same state object for editing convenience and
 * routes them to the right Firestore collection on save.
 */
type ProfileData = {
  // Personal — saved in users/{uid}
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  profileImage: string;
  favorites: string[];

  // Shop — saved in creators/{uid} (creator only)
  shopName: string;
  shopDescription: string;
  shopProfileImage: string;
  coverImage: string;
  location: string;
  country: string;
  address: string;
  coordinates: [number, number] | null;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
  gallery: any[];
  events: any[];
  isPublished: boolean;
  categories: Category[];
  subCategories: SubCategory[];
  filters: string[];
};

const EMPTY_PROFILE: ProfileData = {
  role: "user",
  firstName: "",
  lastName: "",
  email: "",
  bio: "",
  profileImage: "",
  favorites: [],

  shopName: "",
  shopDescription: "",
  shopProfileImage: "",
  coverImage: "",
  // Default to "Worldwide" so creators without a physical location are
  // categorized as remote until they enter an address. The map filters out
  // creators without coordinates, so worldwide shops won't appear there.
  location: "Worldwide",
  country: "Worldwide",
  address: "",
  coordinates: null,
  website: "",
  instagram: "",
  facebook: "",
  twitter: "",
  gallery: [],
  events: [],
  isPublished: false,
  categories: [],
  subCategories: [],
  filters: [],
};

// Top-level tabs visible inside EditProfile.
//   - Users see only "PROFILE" (rendered as "USER").
//   - Creators see "PROFILE" (the merged shop+account view), plus GALLERY and EVENTS.
type ActiveTab = "PROFILE" | "GALLERY" | "EVENTS";
// Sub-tabs that appear inside PROFILE for creators only. The literal "MY WORK"
// (with a space) is used both internally and for display to keep one source
// of truth — no separate label mapping needed.
type ProfileSubTab = "USER" | "MY WORK" | "CATEGORIES";

// Minimum requirements before a shop can go from Draft → Published. Saving as
// a draft is always allowed; this only gates `isPublished = true`.
function shopPublishMissing(p: ProfileData): string[] {
  const missing: string[] = [];
  if (!p.shopProfileImage) missing.push("Shop profile picture");
  if (!p.coverImage) missing.push("Cover image");
  if (!p.shopDescription.trim()) missing.push("Shop description");
  const hasAnyContact =
    !!p.website.trim() ||
    !!p.instagram.trim() ||
    !!p.facebook.trim() ||
    !!p.twitter.trim();
  if (!hasAnyContact) missing.push("At least one contact link (website / Instagram / Facebook / Twitter)");
  return missing;
}

function canPublishShop(p: ProfileData): boolean {
  return shopPublishMissing(p).length === 0;
}

// True while any image in the profile/events is still an optimistic blob:/data:
// preview (an upload is mid-flight). Auto-save defers until these resolve to
// real download URLs so we never persist a URL that dies on reload.
function hasEphemeralImages(p: any): boolean {
  const urls: (string | undefined)[] = [p.profileImage, p.shopProfileImage, p.coverImage];
  (p.gallery || []).forEach((g: any) => urls.push(typeof g === "string" ? g : g?.url));
  (p.events || []).forEach((e: any) => {
    urls.push(e?.coverImage);
    (e?.gallery || []).forEach((g: any) => urls.push(typeof g === "string" ? g : g?.url));
  });
  return urls.some((u) => isEphemeralUrl(u));
}

// Short, mobile-friendly description shown under each subcategory section
// title to help the creator pick the right bucket for their shop.
const SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {
  Products: "Frames, parts & accessories you make or sell.",
  SERVICES: "Workshops, repairs, paint & custom builds.",
  "Creative & Media": "Photo, film, illustration & publishing.",
  Community: "Clubs, collectives & grassroots groups.",
  Events: "Races, social rides, festivals & gatherings.",
};

export function EditProfile() {
  const navigate = useNavigate();
  const { isDarkMode, openCreatorProfile } = useUI();
  const { selectableCategories: SELECTABLE_CATEGORIES, subcategories: SUBCATEGORIES, getFlattenedSubcategories } = useCategories();
  const {
    currentUser,
    userProfile: userProfileRemote,
    updateUserProfile,
    hasPasswordProvider,
    setPasswordForCurrentUser,
  } = useAuth();

  const [profileData, setProfileData] = useState<ProfileData>(EMPTY_PROFILE);
  const [activeProfileTab, setActiveProfileTab] = useState<ActiveTab>("PROFILE");
  // Default to MY WORK — that's the shop content shown publicly, so it's the
  // most common reason a creator opens this page.
  const [activeProfileSubTab, setActiveProfileSubTab] = useState<ProfileSubTab>("MY WORK");
  // Auto-save status shown in the footer. "idle" before the first edit,
  // "saving" while a debounced write is in flight, "saved" once persisted,
  // "error" if the write failed (it retries on the next edit).
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);

  // Upload UI state. Spinners for profile/avatar (size unknown / typically small),
  // progress bars (0..100) for cover and gallery so the user sees how long the
  // upload will take. `null` = idle.
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [shopProfileImageUploading, setShopProfileImageUploading] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);

  // Publish gating — recompute on every render so the toggle and missing-list react live.
  const publishMissing = useMemo(() => shopPublishMissing(profileData), [profileData]);
  const canPublish = publishMissing.length === 0;

  // Add-password flow for Google-only users.
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addPasswordSuccess, setAddPasswordSuccess] = useState(false);

  // Cover preview modal — shown automatically right after a successful upload
  // so the creator can verify their image is framed correctly for both the
  // home card (side crop) and the profile page (top/bottom crop).
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);

  const handleAddressBlur = async () => {
    const address = profileData.address?.trim();
    if (!address) return;
    setGeocoding(true);
    setGeocodeMessage(null);
    try {
      const result = await geocodeAddress(address);
      if (!result) {
        setGeocodeMessage("Couldn't locate this address on the map.");
        return;
      }
      setProfileData(prev => ({
        ...prev,
        coordinates: result.coordinates,
        location: result.city || prev.location,
        country: result.country || prev.country,
      }));
      setGeocodeMessage(`Location found: ${result.formattedAddress}`);
    } catch (err) {
      console.error(err);
      setGeocodeMessage("Geocoding failed. Try again later.");
    } finally {
      setGeocoding(false);
    }
  };
  // Snapshot of the data as it exists in Firestore. Used to compute isDirty.
  // null while still loading.
  const [loadedSnapshot, setLoadedSnapshot] = useState<string | null>(null);

  // Tap-to-reveal tooltip for disabled tabs (mobile has no hover).
  // EVENTS is now enabled. The home calendar feature remains gated separately.
  const DISABLED_TABS: ActiveTab[] = [];
  const [tappedSoonTab, setTappedSoonTab] = useState<ActiveTab | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);
  const flashSoonTooltip = (tab: ActiveTab) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTappedSoonTab(tab);
    tooltipTimerRef.current = setTimeout(() => {
      setTappedSoonTab(null);
      tooltipTimerRef.current = null;
    }, 2500);
  };

  // Hydrate the personal half of the form from users/{uid}.
  // Migrate legacy `name` field to firstName/lastName when present.
  useEffect(() => {
    if (!userProfileRemote) return;
    setProfileData((prev) => {
      const r: any = userProfileRemote;
      let firstName = r.firstName || "";
      let lastName = r.lastName || "";
      if (!firstName && !lastName && r.name) {
        const parts = String(r.name).trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ");
      }
      const next = {
        ...prev,
        role: r.role || prev.role,
        firstName,
        lastName,
        email: r.email || prev.email,
        bio: r.bio || prev.bio,
        profileImage: r.profileImage || prev.profileImage,
        favorites: r.favorites || prev.favorites,
      };
      // Snapshot for unsaved-changes detection.
      setLoadedSnapshot(JSON.stringify(next));
      return next;
    });
  }, [userProfileRemote]);

  // Hydrate from creators/{uid} for ALL roles: creator/admin reload their full
  // shop + events; plain users only reload their saved events (the shop fields
  // are kept blank since users don't own shops). The save flow writes the doc
  // for all three roles so the load must too — otherwise events look "lost"
  // after a reload.
  useEffect(() => {
    if (!currentUser || !profileData.role) return;
    const role = profileData.role;
    const isCreator = role === "creator" || role === "admin";
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "creators", currentUser.uid));
        if (cancelled) return;
        if (!snap.exists()) {
          // No creator doc yet. Pre-fill default shop visuals only for
          // creator/admin so their SHOP tab isn't visually blank. Sync the
          // snapshot to these defaults so auto-save doesn't fire a phantom
          // write just from opening the editor.
          if (isCreator) {
            setProfileData((prev) => {
              const next = {
                ...prev,
                shopProfileImage: prev.shopProfileImage || CREATOR_DEFAULT_AVATAR,
                coverImage: prev.coverImage || CREATOR_DEFAULT_COVER,
              };
              setLoadedSnapshot(JSON.stringify(next));
              return next;
            });
          }
          return;
        }
        const c: any = snap.data();
        setProfileData((prev) => {
          // Events come back for everyone — that's the whole point of the
          // user-role flow (so non-creator users can also publish events).
          const next: any = { ...prev, events: c.events || [] };
          if (isCreator) {
            next.shopName = c.name || "";
            next.shopDescription = c.description || "";
            next.shopProfileImage = c.profileImage || CREATOR_DEFAULT_AVATAR;
            next.coverImage = c.coverImage || CREATOR_DEFAULT_COVER;
            next.location = c.location || "Worldwide";
            next.country = c.country || "Worldwide";
            next.address = c.address || "";
            next.coordinates = c.coordinates || null;
            next.website = c.website || "";
            next.instagram = c.socials?.instagram || "";
            next.facebook = c.socials?.facebook || "";
            next.twitter = c.socials?.twitter || "";
            next.gallery = c.gallery || [];
            next.isPublished = !!c.isPublished;
            next.categories = c.categories || [];
            next.subCategories = c.subCategories || [];
            next.filters = c.filters || [];
          }
          setLoadedSnapshot(JSON.stringify(next));
          return next;
        });
      } catch (err) {
        console.error("Failed to load creator data:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser, profileData.role]);

  // Datalists for cities/countries pulled from seed data so the user gets autocomplete.
  const countries = useMemo(() => {
    const set = new Set(creators.map((c) => c.country).filter(Boolean));
    return Array.from(set).sort();
  }, []);
  const cities = useMemo(() => {
    const set = new Set(creators.map((c) => c.location).filter(Boolean));
    return Array.from(set).sort();
  }, []);

  const isCreator = profileData.role === "creator";
  const isAdmin = profileData.role === "admin";
  // Admins manage their own shop the same way creators do — they see all tabs
  // (PROFILE / SHOP / GALLERY / EVENTS) and the data is stored in creators/{uid}.
  const isCreatorOrAdmin = isCreator || isAdmin;
  const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();

  // Has the user made any change since data was loaded / last saved?
  const isDirty = useMemo(
    () => loadedSnapshot !== null && JSON.stringify(profileData) !== loadedSnapshot,
    [profileData, loadedSnapshot]
  );

  // Native browser warning on tab close / refresh while a save is still pending,
  // so an auto-save that hasn't flushed yet isn't lost on a hard reload.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Auto-save ──────────────────────────────────────────────────────────
  // Persist any change ~1s after the user stops editing, so there's no manual
  // Save button. Publishing stays a deliberate action via its own toggle.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  useEffect(() => {
    // Don't run until the initial Firestore hydrate has set a snapshot.
    if (loadedSnapshot === null || !currentUser) return;
    if (!isDirty || savingRef.current) return;
    // Defer while an image upload is mid-flight (blob: previews present). The
    // URL swap that completes the upload re-triggers this effect.
    if (hasEphemeralImages(profileData)) {
      setSaveStatus("saving");
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      savingRef.current = true;
      setSaveError(null);
      setSaveStatus("saving");
      try {
        await saveProfile();
        setSaveStatus("saved");
      } catch (err: any) {
        console.error("Auto-save failed", err);
        setSaveError(err?.message || "Auto-save failed");
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    }, 1000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // saveProfile is intentionally omitted — it's recreated every render and
    // reads the latest profileData via closure when the timer fires.
  }, [profileData, isDirty, currentUser, loadedSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush a pending save when leaving the page (in-app navigation unmounts the
  // component before the debounce fires). Refs keep the flush reading fresh data.
  const saveProfileRef = useRef<() => Promise<void>>();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const ephemeralRef = useRef(false);
  ephemeralRef.current = hasEphemeralImages(profileData);
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      // Skip flush while an upload is in flight — the blob: URL isn't persisted
      // anyway, so writing it would only create a dead image reference.
      if (isDirtyRef.current && !savingRef.current && !ephemeralRef.current && saveProfileRef.current) {
        saveProfileRef.current().catch((e) => console.error("Flush save failed", e));
      }
    };
  }, []);

  const userFolder = currentUser ? `users/${currentUser.uid}` : null;
  const shopFolder = currentUser ? `creators/${currentUser.uid}` : null;

  const handlePersonalImageUpload = async (files: File[]) => {
    if (!files.length || !currentUser || !userFolder) return;
    setUploadError(null);
    setProfileImageUploading(true);
    try {
      const url = await uploadImage(files[0], `${userFolder}/avatar`);
      setProfileData((prev) => ({ ...prev, profileImage: url }));
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Upload failed");
    } finally {
      setProfileImageUploading(false);
    }
  };

  const handleShopProfileImageUpload = async (files: File[]) => {
    if (!files.length || !currentUser || !shopFolder) return;
    setUploadError(null);
    setShopProfileImageUploading(true);
    try {
      const url = await uploadImage(files[0], `${shopFolder}/profile`);
      setProfileData((prev) => ({ ...prev, shopProfileImage: url }));
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Upload failed");
    } finally {
      setShopProfileImageUploading(false);
    }
  };

  const handleCoverUpload = async (files: File[]) => {
    if (!files.length || !currentUser || !shopFolder) return;
    setUploadError(null);
    setCoverUploadProgress(0);
    try {
      const url = await uploadImage(files[0], `${shopFolder}/cover`, (pct) =>
        setCoverUploadProgress(pct),
      );
      setProfileData((prev) => ({ ...prev, coverImage: url }));
      // Pop the safe-zone preview modal so the creator can confirm their
      // image is framed correctly before saving.
      setCoverPreviewOpen(true);
    } catch (err: any) {
      console.error(err);
      setUploadError(err?.message || "Upload failed");
    } finally {
      setCoverUploadProgress(null);
    }
  };

  const {
    getRootProps: getEditProfileRootProps,
    getInputProps: getEditProfileInputProps,
    isDragActive: isEditProfileDragActive,
  } = useDropzone({ onDrop: handlePersonalImageUpload, accept: { "image/*": [] }, maxFiles: 1 } as any);

  const {
    getRootProps: getEditCoverRootProps,
    getInputProps: getEditCoverInputProps,
    isDragActive: isEditCoverDragActive,
    open: openCoverPicker,
  } = useDropzone({
    onDrop: handleCoverUpload,
    accept: { "image/*": [] },
    maxFiles: 1,
    // When there's already a cover loaded we don't want clicks to open the
    // file picker — clicks should open the preview modal instead. Drag-and-drop
    // still works in both cases. We trigger the picker programmatically from
    // the modal's "Replace" button via `openCoverPicker`.
    noClick: !!profileData.coverImage,
  } as any);

  const {
    getRootProps: getShopProfileRootProps,
    getInputProps: getShopProfileInputProps,
    isDragActive: isShopProfileDragActive,
  } = useDropzone({ onDrop: handleShopProfileImageUpload, accept: { "image/*": [] }, maxFiles: 1 } as any);

  // NOTE: role changes (user ↔ creator ↔ admin) are now exclusively done by
  // admins from the /admin/users panel. The previous in-page promote/demote
  // flows have been removed deliberately — see the read-only "Account type"
  // line in the USER section.

  // Pure save: writes Firestore only. Caller decides what to do next.
  // Throws on failure so the caller can react.
  const saveProfile = async () => {
    if (!currentUser) throw new Error("You must be logged in to save your profile.");

    // 1. Personal data → users/{uid}
    await updateUserProfile({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      // Keep `name` derived for any legacy reads (Header avatar, etc.)
      name: fullName,
      email: profileData.email,
      role: profileData.role,
      bio: profileData.bio,
      profileImage: profileData.profileImage,
      favorites: profileData.favorites,
    });

    // 2. If creator or admin, write the shop half to creators/{uid}
    if (isCreatorOrAdmin) {
      // No physical address → categorize the shop as remote/Worldwide. The map
      // filters by `coordinates`, so worldwide shops won't pin on the map.
      const hasAddress = !!profileData.address.trim();
      const location = hasAddress ? (profileData.location || "Worldwide") : "Worldwide";
      const country = hasAddress ? (profileData.country || "Worldwide") : "Worldwide";

      // Publish gating: an unfinished shop can be saved as draft, but never
      // pushed live. We silently downgrade isPublished if requirements aren't met.
      const isPublished = !!profileData.isPublished && canPublishShop(profileData);

      const creatorDoc: Partial<Creator> & { id: string; isPublished: boolean } = {
        id: currentUser.uid,
        name: profileData.shopName || fullName || "",
        description: profileData.shopDescription || "",
        website: normalizeUrl(profileData.website),
        socials: {
          instagram: normalizeUrl(profileData.instagram),
          facebook: normalizeUrl(profileData.facebook),
          twitter: normalizeUrl(profileData.twitter),
        },
        profileImage: profileData.shopProfileImage || "",
        coverImage: profileData.coverImage || "",
        gallery: profileData.gallery || [],
        events: profileData.events || [],
        filters: profileData.filters || [],
        categories: profileData.categories || [],
        subCategories: profileData.subCategories || [],
        location,
        country,
        address: profileData.address || "",
        creatorId: currentUser.uid,
        creatorName: fullName,
        creatorImage: profileData.shopProfileImage || profileData.profileImage || "",
        isPublished,
      };
      // Firestore rejects `undefined` — only include coordinates when present
      // AND the shop has a real address. Worldwide/remote shops never pin.
      if (hasAddress && profileData.coordinates) {
        creatorDoc.coordinates = profileData.coordinates;
      }
      await setDoc(doc(db, "creators", currentUser.uid), stripUndefined(creatorDoc), { merge: true });
      // Reflect any forced-draft downgrade locally so the UI stays in sync.
      if (profileData.isPublished && !isPublished) {
        setProfileData((prev) => ({ ...prev, isPublished: false }));
      }
    } else if ((profileData.events || []).length > 0) {
      // Plain users (role = "user") can also publish events from their user
      // profile. Persist them on a minimal `creators/{uid}` doc so the
      // calendar (which reads from the creators collection) can pick them up.
      // The doc is kept unpublished so this user never surfaces as a shop in
      // the directory grid, but it's auto-tagged with the "Events" category so
      // it's categorized correctly (and can surface under the Events filter in
      // the explorer if that's enabled later).
      const userOnlyDoc: any = {
        id: currentUser.uid,
        name: fullName || profileData.email || "User",
        profileImage: profileData.profileImage || "",
        creatorId: currentUser.uid,
        creatorName: fullName,
        creatorImage: profileData.profileImage || "",
        // Hard-pin these so the doc is never treated as a public shop.
        isPublished: false,
        categories: ["Events"],
        subCategories: [],
        gallery: [],
        country: "Worldwide",
        location: "Worldwide",
        // The actual reason this doc exists.
        events: profileData.events,
      };
      await setDoc(doc(db, "creators", currentUser.uid), stripUndefined(userOnlyDoc), { merge: true });
    }

    // Sync snapshot — the form is now in sync with Firestore.
    setLoadedSnapshot(JSON.stringify(profileData));
  };
  // Keep the unmount-flush ref pointed at the latest closure.
  saveProfileRef.current = saveProfile;

  // Tab list depends on the role.
  // Events were moved out to /my-events. The profile editor keeps the static
  // tabs (PROFILE, GALLERY for shops) only.
  const TABS: ActiveTab[] = isCreatorOrAdmin
    ? ["PROFILE", "GALLERY"]
    : ["PROFILE"];

  // If the user used to be a creator and switched to user mid-edit, jump back.
  useEffect(() => {
    if (!TABS.includes(activeProfileTab)) {
      setActiveProfileTab("PROFILE");
    }
  }, [isCreatorOrAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputClass = (extra = "") => `w-full p-4 border-2 bg-transparent focus:outline-none transition-colors ${
    isDarkMode
      ? "border-white/20 focus:border-white text-white placeholder-gray-600 bg-white/5"
      : "border-black/20 focus:border-black text-black placeholder-gray-400 bg-black/5"
  } ${extra}`;
  const labelClass = `block text-xs font-bold uppercase tracking-widest mb-3 ${
    isDarkMode ? "text-white" : "text-black"
  }`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header
        profileData={{ ...profileData, name: fullName }}
        setSelectedCreator={(creator) => openCreatorProfile(creator.id)}
      />

      <main className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        <div className={`w-full max-w-5xl mx-auto flex-1 relative flex flex-col brutalist-border brutalist-shadow mb-12 ${isDarkMode ? "bg-black" : "bg-white"}`}>
          <div className={`p-4 md:p-6 flex flex-row items-center justify-between gap-3 border-b-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
            <div className="flex items-center gap-3 min-w-0">
              <h2 className={`text-lg md:text-2xl font-bold uppercase tracking-widest truncate ${isDarkMode ? "text-white" : "text-black"}`}>
                Edit profile
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {/* Auto-save status — kept here at the top so it stays visible
                  while editing, instead of being buried below the content. */}
              <div className="flex items-center gap-1.5 min-w-0">
                {uploadError ? (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 truncate" title={`Upload error: ${uploadError}`}>
                    Upload failed
                  </span>
                ) : saveStatus === "saving" || (isDirty && saveStatus !== "error") ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      Saving…
                    </span>
                  </>
                ) : saveStatus === "error" ? (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 truncate" title={saveError || "Save failed"}>
                    Save failed
                  </span>
                ) : saveStatus === "saved" ? (
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                    <span className="sm:hidden">✓</span><span className="hidden sm:inline">✓ Saved</span>
                  </span>
                ) : null}
              </div>
              {isCreatorOrAdmin && (
                <button
                  type="button"
                  // Always allow toggling Published → Draft. Only allow Draft → Published when requirements are met.
                  disabled={!profileData.isPublished && !canPublish}
                  onClick={() => setProfileData({ ...profileData, isPublished: !profileData.isPublished })}
                  className={`px-3 md:px-6 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    profileData.isPublished
                      ? "bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600"
                      : "bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600"
                  }`}
                  title={
                    profileData.isPublished
                      ? "Shop visible on the home — click to unpublish"
                      : canPublish
                      ? "Click to publish your shop"
                      : `Missing to publish: ${publishMissing.join(", ")}`
                  }
                >
                  {profileData.isPublished ? "Unpublish" : "Publish"}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={`p-1.5 md:p-2 border-2 transition-colors ${
                  isDarkMode
                    ? "border-white/20 text-white hover:border-white hover:bg-white/10"
                    : "border-black/20 text-black hover:border-black hover:bg-black/10"
                }`}
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {TABS.length > 1 && (
            <div className={`flex border-b-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
              {TABS.map((tab, i, all) => {
                const isDisabled = DISABLED_TABS.includes(tab);
                const showTooltip = isDisabled && tappedSoonTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      if (isDisabled) {
                        flashSoonTooltip(tab);
                        return;
                      }
                      setActiveProfileTab(tab);
                    }}
                    onMouseEnter={() => {
                      if (isDisabled) {
                        if (tooltipTimerRef.current) {
                          clearTimeout(tooltipTimerRef.current);
                          tooltipTimerRef.current = null;
                        }
                        setTappedSoonTab(tab);
                      }
                    }}
                    onMouseLeave={() => {
                      if (isDisabled) {
                        if (tooltipTimerRef.current) {
                          clearTimeout(tooltipTimerRef.current);
                          tooltipTimerRef.current = null;
                        }
                        setTappedSoonTab(null);
                      }
                    }}
                    aria-disabled={isDisabled}
                    className={`relative flex-1 min-w-fit md:min-w-[120px] py-3 px-2 md:py-4 md:px-4 text-xs md:text-sm font-bold uppercase tracking-widest transition-colors ${
                      i < all.length - 1 ? `border-r-2 ${isDarkMode ? "border-white/20" : "border-black/20"}` : ""
                    } ${
                      activeProfileTab === tab && !isDisabled
                        ? isDarkMode
                          ? "bg-white text-black"
                          : "bg-black text-white"
                        : isDarkMode
                        ? `text-gray-400 ${!isDisabled && "hover:text-white hover:bg-white/5"}`
                        : `text-gray-500 ${!isDisabled && "hover:text-black hover:bg-black/5"}`
                    }`}
                  >
                    <span className={isDisabled ? "opacity-50" : ""}>
                      {tab === "PROFILE" && !isCreatorOrAdmin ? "USER" : tab}
                    </span>
                    <AnimatePresence>
                      {showTooltip && (
                        <motion.span
                          key="soon"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.18 }}
                          className={`pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest brutalist-border whitespace-nowrap z-30 ${
                            isDarkMode ? "bg-white text-black" : "bg-black text-white"
                          }`}
                        >
                          Soon
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          )}

          <form className="flex flex-col flex-1 overflow-hidden" onSubmit={(e) => e.preventDefault()}>
            <div className={`p-4 md:p-6 overflow-y-auto flex-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              <div className="space-y-6 max-w-2xl mx-auto">

                {/* Sub-tab strip for creators inside PROFILE — keep it at the top so
                    it acts as the visible navigation for the section below. */}
                {isCreatorOrAdmin && activeProfileTab === "PROFILE" && (
                  <div className={`flex border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                    {(["USER", "MY WORK", "CATEGORIES"] as const).map((sub, i, all) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setActiveProfileSubTab(sub)}
                        className={`flex-1 py-2.5 px-4 text-[11px] md:text-xs font-bold uppercase tracking-widest transition-colors ${
                          i < all.length - 1 ? `border-r-2 ${isDarkMode ? "border-white/20" : "border-black/20"}` : ""
                        } ${
                          activeProfileSubTab === sub
                            ? isDarkMode
                              ? "bg-white text-black"
                              : "bg-black text-white"
                            : isDarkMode
                            ? "text-gray-400 hover:text-white hover:bg-white/5"
                            : "text-gray-500 hover:text-black hover:bg-black/5"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                {/* Personal info — shown directly for users, and as the USER sub-tab for creators. */}
                {activeProfileTab === "PROFILE" && (!isCreatorOrAdmin || activeProfileSubTab === "USER") && (
                  <>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-shrink-0">
                        <label className={labelClass}>Profile picture</label>
                        <div className={`relative w-32 h-32 rounded-full overflow-hidden group border-2 border-dashed ${isDarkMode ? "border-white/40 hover:border-white" : "border-black/40 hover:border-black"} transition-colors`}>
                          {profileData.profileImage && (
                            <img src={profileData.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          <div
                            {...getEditProfileRootProps()}
                            className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-colors ${
                              isEditProfileDragActive
                                ? "bg-black/40"
                                : profileData.profileImage
                                ? "bg-black/20 hover:bg-black/40"
                                : isDarkMode
                                ? "bg-white/5 hover:bg-white/10"
                                : "bg-black/5 hover:bg-black/10"
                            }`}
                          >
                            <input {...getEditProfileInputProps()} />
                            <Plus className={`w-8 h-8 transition-opacity ${profileData.profileImage ? "text-white opacity-70 group-hover:opacity-100" : isDarkMode ? "text-white/50" : "text-black/50"}`} />
                          </div>
                          {profileImageUploading && <UploadSpinnerOverlay />}
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>First name</label>
                        <input
                          type="text"
                          required
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Last name</label>
                        <input
                          type="text"
                          required
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className={inputClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        readOnly
                        className={`${inputClass()} opacity-70 cursor-not-allowed`}
                      />
                      <p className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        Email is set at signup and can't be changed here.
                      </p>

                      {/* Account type — read-only for everyone. Role changes
                          happen exclusively from the admin panel (/admin/users). */}
                      <div className={`mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        <span>Account type</span>
                        <span
                          className={`px-2 py-0.5 border ${
                            profileData.role === "admin"
                              ? (isDarkMode ? "border-red-400/60 text-red-300 bg-red-500/10" : "border-red-500/60 text-red-700 bg-red-50")
                              : (isDarkMode ? "border-white/30 text-white" : "border-black/30 text-black")
                          }`}
                        >
                          {profileData.role === "admin" ? "Admin" : profileData.role === "creator" ? "Creator" : "User"}
                        </span>
                        <span className="opacity-70 normal-case tracking-normal font-medium">
                          — set at signup, contact an admin to change.
                        </span>
                      </div>

                      {/* Google-only users can add a password to also sign in with email/password. */}
                      {currentUser && !hasPasswordProvider && (
                        <div className={`mt-4 p-4 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                          {addPasswordSuccess ? (
                            <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                              ✓ Password added. You can now sign in with email and password too.
                            </p>
                          ) : !showAddPassword ? (
                            <div className="flex flex-col gap-2">
                              <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                You signed in with Google. Add a password if you also want to sign in with email and password.
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowAddPassword(true)}
                                className={`self-start px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                                  isDarkMode ? "border-white text-white hover:bg-white/10" : "border-black text-black hover:bg-black/5"
                                }`}
                              >
                                Add password
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                Choose a password for <strong>{profileData.email}</strong>.
                              </p>
                              <PasswordSetupForm
                                isDarkMode={isDarkMode}
                                submitLabel="Save password"
                                onSubmit={async (newPassword) => {
                                  await setPasswordForCurrentUser(newPassword);
                                  setAddPasswordSuccess(true);
                                  setShowAddPassword(false);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowAddPassword(false)}
                                className={`text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Short bio (optional)</label>
                      <textarea
                        rows={3}
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        placeholder="A line or two about you (max 280 chars)."
                        maxLength={280}
                        className={inputClass()}
                      />
                    </div>
                  </>
                )}


                {isCreatorOrAdmin && activeProfileTab === "PROFILE" && activeProfileSubTab === "MY WORK" && (
                  <>
                    {!canPublish && (
                      <div className={`p-4 border-2 ${isDarkMode ? "border-yellow-500/50 bg-yellow-500/5" : "border-yellow-500/60 bg-yellow-500/10"}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-yellow-300" : "text-yellow-700"}`}>
                          Complete to publish
                        </p>
                        <ul className={`text-xs space-y-1 ${isDarkMode ? "text-yellow-100/90" : "text-yellow-900"}`}>
                          {publishMissing.map((m) => (
                            <li key={m}>• {m}</li>
                          ))}
                        </ul>
                        <p className={`mt-2 text-[10px] uppercase tracking-widest ${isDarkMode ? "text-yellow-200/70" : "text-yellow-800/80"}`}>
                          You can still save as draft.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-shrink-0">
                        <label className={labelClass}>Shop profile picture</label>
                        <div className={`relative w-32 h-32 rounded-full overflow-hidden group border-2 border-dashed ${isDarkMode ? "border-white/40 hover:border-white" : "border-black/40 hover:border-black"} transition-colors`}>
                          {profileData.shopProfileImage && (
                            <img src={profileData.shopProfileImage} alt="Shop profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          <div
                            {...getShopProfileRootProps()}
                            className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-colors ${
                              isShopProfileDragActive
                                ? "bg-black/40"
                                : profileData.shopProfileImage
                                ? "bg-black/20 hover:bg-black/40"
                                : isDarkMode
                                ? "bg-white/5 hover:bg-white/10"
                                : "bg-black/5 hover:bg-black/10"
                            }`}
                          >
                            <input {...getShopProfileInputProps()} />
                            <Plus className={`w-8 h-8 transition-opacity ${profileData.shopProfileImage ? "text-white opacity-70 group-hover:opacity-100" : isDarkMode ? "text-white/50" : "text-black/50"}`} />
                          </div>
                          {shopProfileImageUploading && <UploadSpinnerOverlay />}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Cover image</label>
                      <div
                        className={`relative w-full h-40 overflow-hidden group border-2 border-dashed ${isDarkMode ? "border-white/40 hover:border-white" : "border-black/40 hover:border-black"} transition-colors ${profileData.coverImage ? "cursor-pointer" : ""}`}
                        onClick={profileData.coverImage ? () => setCoverPreviewOpen(true) : undefined}
                      >
                        {profileData.coverImage && (
                          <img src={profileData.coverImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                        <div
                          {...getEditCoverRootProps()}
                          className={`absolute inset-0 flex items-center justify-center transition-colors ${profileData.coverImage ? "" : "cursor-pointer"} ${
                            isEditCoverDragActive
                              ? "bg-black/40"
                              : profileData.coverImage
                              ? "bg-transparent group-hover:bg-black/30"
                              : isDarkMode
                              ? "bg-white/5 hover:bg-white/10"
                              : "bg-black/5 hover:bg-black/10"
                          }`}
                        >
                          <input {...getEditCoverInputProps()} />
                          {!profileData.coverImage ? (
                            <Plus className={`w-8 h-8 transition-opacity ${isDarkMode ? "text-white/50" : "text-black/50"}`} />
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              Click to preview
                            </span>
                          )}
                        </div>
                        {coverUploadProgress !== null && <UploadProgressOverlay percent={coverUploadProgress} />}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Shop name</label>
                      <input
                        type="text"
                        value={profileData.shopName}
                        onChange={(e) => setProfileData({ ...profileData, shopName: e.target.value })}
                        placeholder="e.g. Officina Battaglin"
                        className={inputClass()}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Shop description</label>
                      <textarea
                        rows={4}
                        value={profileData.shopDescription}
                        onChange={(e) => setProfileData({ ...profileData, shopDescription: e.target.value })}
                        placeholder="What does your shop offer? Style, materials, philosophy..."
                        className={inputClass()}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Full address</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          onBlur={handleAddressBlur}
                          placeholder="e.g. Via Roma 94, Marostica, Italy"
                          className={`${inputClass()} pl-12`}
                        />
                        <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                        {geocoding && (
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Locating...
                          </span>
                        )}
                      </div>
                      {geocodeMessage && (
                        <p className={`mt-2 text-[10px] font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {geocodeMessage}
                        </p>
                      )}
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        We'll use this to pin your shop on the map. City and country will fill in automatically. Leave empty for Worldwide / remote shops (won't appear on the map).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Country</label>
                        <input
                          type="text"
                          list="countries-list"
                          value={profileData.country}
                          onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                          placeholder="e.g. Spain"
                          className={inputClass()}
                        />
                        <datalist id="countries-list">
                          {countries.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input
                          type="text"
                          list="cities-list"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          placeholder="e.g. Madrid"
                          className={inputClass()}
                        />
                        <datalist id="cities-list">
                          {cities.map((city) => (
                            <option key={city} value={city} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Website</label>
                        <input
                          type="text"
                          inputMode="url"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          placeholder="www.yourwebsite.com"
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Instagram</label>
                        <input
                          type="text"
                          inputMode="url"
                          value={profileData.instagram}
                          onChange={(e) => setProfileData({ ...profileData, instagram: e.target.value })}
                          placeholder="instagram.com/username"
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Facebook</label>
                        <input
                          type="text"
                          inputMode="url"
                          value={profileData.facebook}
                          onChange={(e) => setProfileData({ ...profileData, facebook: e.target.value })}
                          placeholder="facebook.com/username"
                          className={inputClass()}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Twitter / X</label>
                        <input
                          type="text"
                          inputMode="url"
                          value={profileData.twitter}
                          onChange={(e) => setProfileData({ ...profileData, twitter: e.target.value })}
                          placeholder="twitter.com/username"
                          className={inputClass()}
                        />
                      </div>
                    </div>
                  </>
                )}

                {isCreatorOrAdmin && activeProfileTab === "PROFILE" && activeProfileSubTab === "CATEGORIES" && (
                  <div className="space-y-6">
                    <div>
                      <div className="mb-6">
                        <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>
                          Main categories
                        </h3>
                        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Select the categories in which you want your shop to be featured.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 mb-8">
                        {SELECTABLE_CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              if (profileData.categories.includes(c)) {
                                const newCategories = profileData.categories.filter((cat) => cat !== c);
                                const subcatsToRemove = getFlattenedSubcategories(c);
                                const newSubCategories = profileData.subCategories.filter((sub) => !subcatsToRemove.includes(sub));
                                setProfileData({ ...profileData, categories: newCategories, subCategories: newSubCategories });
                              } else {
                                setProfileData({ ...profileData, categories: [...profileData.categories, c] });
                              }
                            }}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                              profileData.categories.includes(c)
                                ? isDarkMode
                                  ? "bg-white text-black border-white"
                                  : "bg-black text-white border-black"
                                : isDarkMode
                                ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white"
                                : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>

                      {/* Subcategories — one section per main category, always visible.
                          Chips inside a section are disabled until that main category
                          is selected, so the user always sees the full picture. */}
                      <div className="space-y-6">
                        {SELECTABLE_CATEGORIES.map((category) => {
                          const group = SUBCATEGORIES[category];
                          if (!group) return null;
                          const isSelected = profileData.categories.includes(category);
                          const description = SUBCATEGORY_DESCRIPTIONS[category as string] || "";
                          // The category name in the title uses the same active/inactive
                          // chip styling as the main category buttons. It's also a real
                          // toggle — clicking it activates/deactivates the main category,
                          // same as the buttons up top.
                          const categoryChipClass = `px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                            isSelected
                              ? isDarkMode
                                ? "bg-white text-black border-white hover:bg-gray-200"
                                : "bg-black text-white border-black hover:bg-gray-800"
                              : isDarkMode
                              ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white"
                              : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                          }`;
                          const toggleMainCategory = () => {
                            if (isSelected) {
                              const newCategories = profileData.categories.filter((cat) => cat !== category);
                              const subcatsToRemove = getFlattenedSubcategories(category);
                              const newSubCategories = profileData.subCategories.filter((sub) => !subcatsToRemove.includes(sub));
                              setProfileData({ ...profileData, categories: newCategories, subCategories: newSubCategories });
                            } else {
                              setProfileData({ ...profileData, categories: [...profileData.categories, category] });
                            }
                          };
                          // Chip styling — disabled state when the parent main category is off.
                          const chipClass = (selected: boolean) =>
                            `mr-3 mb-3 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              selected
                                ? isDarkMode
                                  ? "bg-white text-black border-white"
                                  : "bg-black text-white border-black"
                                : isDarkMode
                                ? "bg-black text-gray-400 border-white/20 enabled:hover:border-white enabled:hover:text-white"
                                : "bg-white text-gray-500 border-black/20 enabled:hover:border-black enabled:hover:text-black"
                            }`;
                          return (
                            <div key={category}>
                              <h4 className={`flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>
                                <span>Subcategories of</span>
                                <button
                                  type="button"
                                  onClick={toggleMainCategory}
                                  title={isSelected ? `Click to remove ${category} from your shop` : `Click to add ${category} to your shop`}
                                  className={categoryChipClass}
                                >
                                  {category}
                                </button>
                              </h4>
                              {description && (
                                <p className={`mt-2 mb-3 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                  {description}
                                </p>
                              )}
                              {group.map((item, idx) => {
                                if (typeof item === "string") {
                                  return (
                                    <button
                                      key={item}
                                      type="button"
                                      disabled={!isSelected}
                                      onClick={() => {
                                        if (profileData.subCategories.includes(item as SubCategory)) {
                                          setProfileData({ ...profileData, subCategories: profileData.subCategories.filter((s) => s !== item) });
                                        } else {
                                          setProfileData({ ...profileData, subCategories: [...profileData.subCategories, item as SubCategory] });
                                        }
                                      }}
                                      className={chipClass(profileData.subCategories.includes(item as SubCategory))}
                                    >
                                      {item}
                                    </button>
                                  );
                                }
                                return (
                                  <div key={idx} className="mb-4">
                                    {/* "Category" group name is redundant with the
                                        "Subcategories of {category}" title above —
                                        skip it visually. Other group names (Build,
                                        Material, etc.) are kept since they group
                                        meaningfully. */}
                                    {item.groupName !== "Category" && (
                                      <h5 className={`text-[10px] font-light uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                        {item.groupName}
                                      </h5>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      {item.options.map((sub) => (
                                        <button
                                          key={sub}
                                          type="button"
                                          disabled={!isSelected}
                                          onClick={() => {
                                            if (profileData.subCategories.includes(sub as SubCategory)) {
                                              const filtersToRemove = getFlattenedSubcategories(sub);
                                              setProfileData({
                                                ...profileData,
                                                subCategories: profileData.subCategories.filter((s) => s !== sub && !filtersToRemove.includes(s)),
                                              });
                                            } else {
                                              setProfileData({ ...profileData, subCategories: [...profileData.subCategories, sub as SubCategory] });
                                            }
                                          }}
                                          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                            profileData.subCategories.includes(sub as SubCategory)
                                              ? isDarkMode
                                                ? "bg-white text-black border-white"
                                                : "bg-black text-white border-black"
                                              : isDarkMode
                                              ? "bg-black text-gray-400 border-white/20 enabled:hover:border-white enabled:hover:text-white"
                                              : "bg-white text-gray-500 border-black/20 enabled:hover:border-black enabled:hover:text-black"
                                          }`}
                                        >
                                          {sub}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Inline filters — for any direct subcategory of
                                  THIS main category that the user has selected
                                  AND that has its own filter groups (e.g.
                                  Bikes & Frames → Build / Material), render
                                  them right here so filters live with their
                                  parent section. Values go into the same
                                  `subCategories` array (consumed by the
                                  visitor-side filter UI). */}
                              {(() => {
                                const directSubs = getFlattenedSubcategories(category);
                                const sections = directSubs
                                  .filter((s) => profileData.subCategories.includes(s))
                                  .map((sub) => {
                                    const groups = SUBCATEGORIES[sub as string] || [];
                                    // Include ALL groups (including "Category") so the
                                    // shop form surfaces exactly what the explorer's
                                    // SubcategoryFilter offers visitors. The "Category"
                                    // header itself is hidden below — redundant with
                                    // the "Filters for {sub}" caption.
                                    const filterGroups = groups.filter(
                                      (g) => typeof g !== "string",
                                    ) as { groupName: string; options: SubCategory[] }[];
                                    return { sub, filterGroups };
                                  })
                                  .filter((s) => s.filterGroups.length > 0);
                                if (sections.length === 0) return null;
                                return (
                                  <div className={`mt-6 pt-6 border-t-2 space-y-5 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
                                    {sections.map(({ sub, filterGroups }) => (
                                      <div key={sub as string}>
                                        <h5 className={`flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-white" : "text-black"}`}>
                                          <span>Filters for</span>
                                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border-2 ${
                                            isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
                                          }`}>
                                            {sub}
                                          </span>
                                        </h5>
                                        {filterGroups.map((g) => (
                                          <div key={g.groupName} className="mb-3">
                                            {g.groupName !== "Category" && (
                                              <h6 className={`text-[10px] font-light uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                                {g.groupName}
                                              </h6>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                              {g.options.map((opt) => {
                                                const selected = profileData.subCategories.includes(opt as SubCategory);
                                                return (
                                                  <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => {
                                                      if (selected) {
                                                        setProfileData({
                                                          ...profileData,
                                                          subCategories: profileData.subCategories.filter((s) => s !== opt),
                                                        });
                                                      } else {
                                                        setProfileData({
                                                          ...profileData,
                                                          subCategories: [...profileData.subCategories, opt as SubCategory],
                                                        });
                                                      }
                                                    }}
                                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                                                      selected
                                                        ? isDarkMode
                                                          ? "bg-white text-black border-white"
                                                          : "bg-black text-white border-black"
                                                        : isDarkMode
                                                        ? "bg-black text-gray-400 border-white/20 hover:border-white hover:text-white"
                                                        : "bg-white text-gray-500 border-black/20 hover:border-black hover:text-black"
                                                    }`}
                                                  >
                                                    {opt}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {isCreatorOrAdmin && activeProfileTab === "GALLERY" && (
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-white" : "text-black"}`}>
                      Gallery Images (Max 8)
                    </label>
                    <GalleryManager
                      items={profileData.gallery || []}
                      onChange={(gallery) => setProfileData({ ...profileData, gallery })}
                      folder={shopFolder ? `${shopFolder}/gallery` : "gallery"}
                      isDarkMode={isDarkMode}
                      maxItems={8}
                      disabled={!shopFolder}
                    />
                  </div>
                )}

              </div>
            </div>

          </form>
        </div>
      </main>

      <CoverPreviewModal
        open={coverPreviewOpen}
        imageUrl={profileData.coverImage || null}
        isDarkMode={isDarkMode}
        onClose={() => setCoverPreviewOpen(false)}
        onReplace={openCoverPicker}
        onDelete={() => setProfileData((prev) => ({ ...prev, coverImage: CREATOR_DEFAULT_COVER }))}
        isDefault={profileData.coverImage === CREATOR_DEFAULT_COVER}
      />
    </div>
  );
}
