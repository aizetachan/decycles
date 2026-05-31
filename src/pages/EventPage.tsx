import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { X, Calendar as CalendarIcon, MapPin, ArrowRight, Share2, Check, Loader2 } from "lucide-react";
import { db } from "../firebase";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";
import { useRsvps, type RsvpStatus } from "../hooks/useRsvps";
import { Header } from "../components/layout/Header";
import { EVENT_CATEGORY_COLORS } from "../constants/categories";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatDate = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const formatRange = (start?: string, end?: string): string | null => {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s && !e) return null;
  if (!e || s === e) return s;
  return `${s} → ${e}`;
};

/**
 * Public, shareable event page mounted at `/event/:creatorId/:eventIdx`.
 * Events live nested inside `creators/{uid}.events[]` so we identify them by
 * (creator id, array index). The page reads the creator doc once and pulls the
 * specific event out of the array.
 */
export function EventPage() {
  const { creatorId = "", eventIdx = "0" } = useParams<{ creatorId: string; eventIdx: string }>();
  const navigate = useNavigate();
  const { isDarkMode, openCreatorProfile, openJoinModal } = useUI();
  const { currentUser } = useAuth();
  const rsvps = useRsvps(creatorId, parseInt(eventIdx, 10));

  const [creator, setCreator] = useState<any | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied">("idle");

  // Close → land on the home with the CALENDAR tab pre-selected. This makes
  // shared links feel like a deep-link overlay rather than a dead-end page.
  const closeToCalendar = () => navigate("/?tab=calendar");

  const handleShare = async () => {
    const url = window.location.href;
    // Touch devices (mobile/tablet) get the native share sheet. Desktop
    // (including macOS Safari which also exposes navigator.share) copies.
    const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;
    if (isTouch && typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: event?.title || "Event", url });
      } catch {}
      return;
    }
    setShareState("loading");
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1800);
    } catch (err) {
      console.warn("Clipboard write failed:", err);
      setShareState("idle");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "creators", creatorId));
        if (cancelled) return;
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const c = snap.data();
        const i = parseInt(eventIdx, 10);
        const e = Array.isArray((c as any).events) ? (c as any).events[i] : null;
        if (!e) {
          setNotFound(true);
        } else {
          setCreator({ id: snap.id, ...c });
          setEvent(e);
          // Optional page title for share previews / browser tab.
          document.title = `${e.title || "Event"} · Decycles`;
        }
      } catch (err) {
        console.error("EventPage fetch failed:", err);
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [creatorId, eventIdx]);

  useEffect(() => () => {
    document.title = "Decycles";
  }, []);

  const dateLabel = formatRange(event?.startDate, event?.endDate);
  const timeLabel = event?.startTime ? (event?.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime) : null;
  const category = event?.category as string | undefined;
  const categoryColor = category ? EVENT_CATEGORY_COLORS[category] : undefined;
  const publishedFrom: "shop" | "user" | undefined = event?.publishedFrom;

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header profileData={{} as any} setSelectedCreator={() => {}} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={closeToCalendar}
            className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            <X className="w-4 h-4" /> Close
          </button>
          {event && (
            <button
              type="button"
              onClick={handleShare}
              disabled={shareState !== "idle"}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-80 ${
                isDarkMode ? "border-white/30 text-white hover:bg-white/10" : "border-black/30 text-black hover:bg-black/5"
              }`}
            >
              {shareState === "loading" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Copying…</>
              ) : shareState === "copied" ? (
                <><Check className="w-3.5 h-3.5" /> Link copied</>
              ) : (
                <><Share2 className="w-3.5 h-3.5" /> Share</>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full" />
          </div>
        ) : notFound || !event ? (
          <div className={`p-12 text-center border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
            <h1 className="font-display tracking-wider text-3xl mb-4">Event not found</h1>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} mb-6`}>
              The event you're looking for doesn't exist or was removed.
            </p>
            <Link
              to="/"
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                isDarkMode ? "bg-white text-black border-white hover:bg-zinc-200" : "bg-black text-white border-black hover:bg-zinc-800"
              }`}
            >
              Back to home
            </Link>
          </div>
        ) : (
          <article className={`brutalist-border overflow-hidden ${isDarkMode ? "bg-black border-white" : "bg-white border-black"}`}>
            {/* Cover */}
            <div className="relative w-full h-64 md:h-96 bg-gray-200">
              {event.coverImage ? (
                <img src={event.coverImage} alt={event.title || "Event cover"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`}>
                  <CalendarIcon className="w-16 h-16 opacity-40" />
                </div>
              )}
              {dateLabel && (
                <div className={`absolute bottom-4 left-4 px-4 py-2 text-sm font-bold uppercase tracking-widest border-2 ${
                  isDarkMode ? "bg-black text-white border-white" : "bg-white text-black border-black"
                }`}>
                  {dateLabel}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-6 md:p-10 space-y-6">
              <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Event</div>
              <h1 className="font-display tracking-wider text-4xl md:text-6xl leading-[0.95]">{event.title || "Untitled event"}</h1>

              <div className={`flex flex-wrap gap-x-5 gap-y-2 text-xs md:text-sm font-bold uppercase tracking-widest items-center ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                {dateLabel && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 opacity-70" />
                    {dateLabel}{timeLabel ? ` · ${timeLabel}` : ""}
                  </span>
                )}
                {(event.address || event.location) && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-70" />
                    {event.location && event.address
                      ? `${event.location} · ${event.address}`
                      : event.address || event.location}
                  </span>
                )}
                {category && (
                  <span className={`inline-flex items-center gap-2 px-2.5 py-1 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                    {categoryColor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />}
                    {category}
                  </span>
                )}
                {event.recurrence && event.recurrence !== "none" && (
                  <span className={`px-2.5 py-1 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                    Repeats {event.recurrence}
                  </span>
                )}
              </div>

              {event.description && (
                <p className={`text-base md:text-lg leading-relaxed whitespace-pre-line ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                  {event.description}
                </p>
              )}

              {/* RSVPs — same UI as the EventModal so the public page feels
                  consistent with the in-app overlay. */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: "going" as RsvpStatus, label: "Going", count: rsvps.counts.going },
                    { key: "interested" as RsvpStatus, label: "Interested", count: rsvps.counts.interested },
                  ]).map(({ key, label, count }) => {
                    const active = rsvps.myStatus === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            openJoinModal("signin");
                            return;
                          }
                          rsvps.setStatus(active ? null : key);
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                          active
                            ? isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
                            : isDarkMode ? "border-white/30 text-white hover:bg-white/10" : "border-black/30 text-black hover:bg-black/5"
                        }`}
                      >
                        {label}
                        <span className={`text-[10px] px-1.5 py-0.5 ${
                          active
                            ? isDarkMode ? "bg-black text-white" : "bg-white text-black"
                            : isDarkMode ? "bg-white/10" : "bg-black/10"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!currentUser && (
                  <p className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    Sign in to RSVP.
                  </p>
                )}
              </div>

              {/* Host */}
              {creator && (
                <button
                  type="button"
                  onClick={() => openCreatorProfile(creator.id)}
                  className={`group w-full flex items-center gap-3 p-4 border-2 transition-colors ${
                    isDarkMode ? "border-white/20 hover:border-white hover:bg-white/5" : "border-black/20 hover:border-black hover:bg-black/5"
                  }`}
                >
                  <div className={`w-12 h-12 shrink-0 border-2 overflow-hidden ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                    {creator.profileImage ? (
                      <img src={creator.profileImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-base font-bold ${isDarkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
                        {(creator.name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      Hosted by{publishedFrom === "user" ? " (user)" : ""}
                    </div>
                    <div className="font-bold text-sm md:text-base truncate">{creator.name || "Unknown host"}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
