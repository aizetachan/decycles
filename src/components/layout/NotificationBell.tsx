import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import { useUI } from "../../contexts/UIContext";
import type { Notification } from "../../types";

function timeAgo(ts: any): string {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function label(n: Notification): string {
  if (n.type === "follow") return "started following you";
  if (n.type === "like") return "liked your post";
  return "mentioned you in a post";
}

export function NotificationBell({ isDarkMode }: { isDarkMode: boolean }) {
  const { items, unreadCount, markAllRead } = useNotifications();
  const { openPost, openUserProfile } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onItemClick = (n: Notification) => {
    setOpen(false);
    if (n.postId) openPost(n.postId);
    else if (n.type === "follow") openUserProfile(n.actorId);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className={`relative flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-70`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] overflow-hidden brutalist-border ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}
        >
          <div className={`px-4 py-3 text-xs font-bold uppercase tracking-widest ${isDarkMode ? "border-b border-white/10 text-gray-400" : "border-b border-black/10 text-gray-500"}`}>
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className={`px-4 py-8 text-center text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                No notifications yet.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    !n.read ? (isDarkMode ? "bg-white/5" : "bg-black/5") : ""
                  } ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
                >
                  {n.actorImage ? (
                    <img src={n.actorImage} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 shrink-0" />
                  )}
                  <p className="min-w-0 flex-1 text-sm leading-tight">
                    <span className="font-bold">{n.actorName}</span> {label(n)}
                  </p>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
