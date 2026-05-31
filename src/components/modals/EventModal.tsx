import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar as CalendarIcon, MapPin, ArrowRight, Share2, Check, Loader2 } from "lucide-react";
import { useUI } from "../../contexts/UIContext";
import { useAuth } from "../../contexts/AuthContext";
import { useT } from "../../contexts/LanguageContext";
import { useRsvps, type RsvpStatus } from "../../hooks/useRsvps";
import { EVENT_CATEGORY_COLORS } from "../../constants/categories";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatDate = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

const formatRange = (start?: string, end?: string): string | null => {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s && !e) return null;
  if (!e || s === e) return s;
  return `${s} → ${e}`;
};

export function EventModal() {
  const { isDarkMode, selectedEvent, closeEvent, openCreatorProfile, openJoinModal } = useUI();
  const { currentUser } = useAuth();
  const { t } = useT();
  const open = !!selectedEvent;
  const rsvps = useRsvps(selectedEvent?.creatorId, selectedEvent?._eventIdx);
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied">("idle");

  const handleShare = async () => {
    if (!selectedEvent?.creatorId || typeof selectedEvent?._eventIdx !== "number") return;
    const url = `${window.location.origin}/event/${selectedEvent.creatorId}/${selectedEvent._eventIdx}`;
    // Desktop Safari also exposes navigator.share, so feature-detection alone
    // would open the macOS Share sheet on Mac — we want clipboard there.
    // `pointer: coarse` is the most reliable touch-device hint.
    const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;
    if (isTouch && typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: selectedEvent.name || "Event", url });
      } catch {
        // User dismissed the share sheet — ignore.
      }
      return;
    }
    // Desktop / non-touch: show loading → copied → back to idle.
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

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeEvent(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeEvent]);

  const e = selectedEvent;
  const dateLabel = formatRange(e?.eventDate, e?.endDate);
  // Optional time of day. Both single-day and multi-day events can carry
  // start/end times; display as "HH:MM – HH:MM" when both exist, else just
  // the start time.
  const timeLabel = e?.startTime
    ? (e?.endTime ? `${e.startTime} – ${e.endTime}` : e.startTime)
    : null;
  const publishedFrom: "shop" | "user" | undefined = e?.publishedFrom;
  // Heuristic to render a friendlier "Hosted by" label. For shop-published
  // events we say "Hosted by SHOP". For user-published events we say "Hosted
  // by USER", because the creator doc backing the event is a minimal user-only
  // doc that has no shop identity.
  const hostLabel = publishedFrom === "user" ? "Hosted by" : "Hosted by";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="event-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeEvent}
        >
          <motion.div
            key="event-modal-body"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(ev) => ev.stopPropagation()}
            className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto brutalist-border ${
              isDarkMode ? "bg-black text-white border-white" : "bg-white text-black border-black"
            }`}
          >
            <button
              type="button"
              onClick={closeEvent}
              aria-label="Close"
              className={`absolute top-3 right-3 z-10 p-2 brutalist-border transition-colors ${
                isDarkMode ? "border-white bg-black hover:bg-white/10" : "border-black bg-white hover:bg-black/5"
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cover */}
            <div className="relative w-full h-56 md:h-80 bg-gray-300">
              {e?.coverImage ? (
                <img
                  src={e.coverImage}
                  alt={e.name || "Event cover"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`}>
                  <CalendarIcon className="w-12 h-12 opacity-40" />
                </div>
              )}
              {dateLabel && (
                <div className={`absolute bottom-3 left-3 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border-2 ${
                  isDarkMode ? "bg-black text-white border-white" : "bg-white text-black border-black"
                }`}>
                  {dateLabel}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-5 md:p-8 space-y-5">
              <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Event
              </div>
              <h2 className="font-display tracking-wider text-3xl md:text-5xl leading-[0.95]">
                {e?.name || "Untitled Event"}
              </h2>

              {/* Meta row: date / location / category. Category gets its own
                  pill with the color dot that matches the calendar chip. */}
              <div className={`flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-widest items-center ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                {dateLabel && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 opacity-70" />
                    {dateLabel}{timeLabel ? ` · ${timeLabel}` : ""}
                  </span>
                )}
                {(e?.address || e?.location) && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-70" />
                    {e?.location && e?.address ? `${e.location} · ${e.address}` : e?.address || e?.location}
                  </span>
                )}
                {e?.subCategories?.[0] && (() => {
                  const cat = e.subCategories[0];
                  const color = EVENT_CATEGORY_COLORS[cat];
                  return (
                    <span className={`inline-flex items-center gap-2 px-2.5 py-1 border-2 ${
                      isDarkMode ? "border-white/20" : "border-black/20"
                    }`}>
                      {color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      )}
                      {cat}
                    </span>
                  );
                })()}
              </div>

              {e?.description && (
                <p className={`text-sm md:text-base leading-relaxed whitespace-pre-line ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                  {e.description}
                </p>
              )}

              {/* RSVPs — signed-in users mark Going / Interested. The
                  visible counts are live (onSnapshot). Anonymous visitors see
                  the counts and a prompt to sign in. */}
              {e?.creatorId && typeof e?._eventIdx === "number" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "going" as RsvpStatus, label: t("event.going"), count: rsvps.counts.going },
                      { key: "interested" as RsvpStatus, label: t("event.interested"), count: rsvps.counts.interested },
                    ]).map(({ key, label, count }) => {
                      const active = rsvps.myStatus === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              closeEvent();
                              openJoinModal("signin");
                              return;
                            }
                            rsvps.setStatus(active ? null : key);
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                            active
                              ? isDarkMode
                                ? "bg-white text-black border-white"
                                : "bg-black text-white border-black"
                              : isDarkMode
                              ? "border-white/30 text-white hover:bg-white/10"
                              : "border-black/30 text-black hover:bg-black/5"
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
                      {t("event.signInToRsvp")}
                    </p>
                  )}
                </div>
              )}

              {/* Share — uses the Web Share API on mobile, falls back to
                  clipboard. The URL points at the public event page which
                  works for both signed-in and signed-out visitors. */}
              {e?.creatorId && typeof e?._eventIdx === "number" && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={shareState !== "idle"}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-80 ${
                    isDarkMode ? "border-white/30 text-white hover:bg-white/10" : "border-black/30 text-black hover:bg-black/5"
                  }`}
                >
                  {shareState === "loading" ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("event.copying")}</>
                  ) : shareState === "copied" ? (
                    <><Check className="w-3.5 h-3.5" /> {t("event.linkCopied")}</>
                  ) : (
                    <><Share2 className="w-3.5 h-3.5" /> {t("event.share")}</>
                  )}
                </button>
              )}

              {/* Host card — links to the creator's full profile. Shop-
                  published events open the shop page; user-published events
                  open the user-owned (sparse) creator doc. */}
              {e?.creatorId && (
                <button
                  type="button"
                  onClick={() => {
                    closeEvent();
                    openCreatorProfile(e.creatorId);
                  }}
                  className={`group w-full flex items-center gap-3 p-3 border-2 transition-colors ${
                    isDarkMode ? "border-white/20 hover:border-white hover:bg-white/5" : "border-black/20 hover:border-black hover:bg-black/5"
                  }`}
                >
                  <div className={`w-12 h-12 shrink-0 border-2 overflow-hidden ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                    {e.creatorImage ? (
                      <img src={e.creatorImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-base font-bold ${isDarkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
                        {(e.creatorName || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      {hostLabel}{publishedFrom === "user" ? " (user)" : ""}
                    </div>
                    <div className="font-bold text-sm md:text-base truncate">
                      {e.creatorName || "Unknown host"}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
