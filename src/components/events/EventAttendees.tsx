import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { UserCircle } from "lucide-react";

type AttendeeRow = {
  userId: string;
  status: "going" | "interested";
  name: string;
  profileImage?: string;
};

/**
 * Live RSVP list for one event. Subscribes to `rsvps` filtered by
 * creatorId+eventIdx, then enriches each row with the user's display name
 * and avatar from `users/{uid}`. User lookups are memoized in a local map
 * so re-renders don't re-fetch.
 */
function useEventAttendees(creatorId: string | undefined, eventIdx: number | undefined) {
  const [rsvps, setRsvps] = useState<Array<{ userId: string; status: "going" | "interested" }>>([]);
  const [usersById, setUsersById] = useState<Record<string, { name: string; profileImage?: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId || typeof eventIdx !== "number") {
      setRsvps([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "rsvps"),
      where("creatorId", "==", creatorId),
      where("eventIdx", "==", eventIdx),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRsvps(snap.docs.map((d) => {
        const data = d.data() as any;
        return { userId: data.userId, status: data.status };
      }));
      setLoading(false);
    });
    return () => unsub();
  }, [creatorId, eventIdx]);

  // Fetch any user docs we don't have cached yet.
  useEffect(() => {
    const missing = rsvps.map((r) => r.userId).filter((id) => id && !usersById[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, { name: string; profileImage?: string }> = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "users", id));
            if (snap.exists()) {
              const d = snap.data() as any;
              results[id] = { name: d.name || d.displayName || "Anonymous", profileImage: d.profileImage };
            } else {
              results[id] = { name: "Anonymous" };
            }
          } catch {
            results[id] = { name: "Anonymous" };
          }
        }),
      );
      if (!cancelled) setUsersById((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [rsvps]); // eslint-disable-line react-hooks/exhaustive-deps

  const attendees: AttendeeRow[] = rsvps.map((r) => ({
    userId: r.userId,
    status: r.status,
    name: usersById[r.userId]?.name || "…",
    profileImage: usersById[r.userId]?.profileImage,
  }));

  const going = attendees.filter((a) => a.status === "going");
  const interested = attendees.filter((a) => a.status === "interested");

  return { attendees, going, interested, loading };
}

/**
 * Tiny inline badge for the collapsed event row in the events list.
 * Shows "N going · M interested" only when there's at least one RSVP.
 */
export function EventRowAttendees({
  creatorId,
  eventIdx,
  isDarkMode,
}: {
  creatorId: string;
  eventIdx: number;
  isDarkMode: boolean;
}) {
  const { going, interested, loading } = useEventAttendees(creatorId, eventIdx);
  if (loading) return null;
  if (going.length === 0 && interested.length === 0) return null;
  return (
    <div className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
      {going.length > 0 && <span>{going.length} going</span>}
      {going.length > 0 && interested.length > 0 && <span className="mx-1">·</span>}
      {interested.length > 0 && <span>{interested.length} interested</span>}
    </div>
  );
}

/**
 * Full attendees panel rendered inside the expanded event editor.
 * Shows two columns (Going / Interested) with avatar + name per attendee.
 */
export function EventAttendeesPanel({
  creatorId,
  eventIdx,
  isDarkMode,
}: {
  creatorId: string;
  eventIdx: number;
  isDarkMode: boolean;
}) {
  const { going, interested, loading } = useEventAttendees(creatorId, eventIdx);

  const renderList = (rows: AttendeeRow[], label: string) => (
    <div className="flex-1 min-w-0">
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label} <span className={isDarkMode ? "text-white" : "text-black"}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className={`text-[11px] uppercase tracking-wider ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
          No one yet
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.userId} className="flex items-center gap-2">
              {r.profileImage ? (
                <img
                  src={r.profileImage}
                  alt=""
                  className={`w-7 h-7 rounded-full object-cover border ${isDarkMode ? "border-white/20" : "border-black/20"}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDarkMode ? "bg-white/10 text-white" : "bg-black/10 text-black"}`}>
                  <UserCircle className="w-5 h-5" />
                </div>
              )}
              <span className="text-xs font-bold truncate">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className={`p-4 border-2 ${isDarkMode ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"}`}>
      <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDarkMode ? "text-white" : "text-black"}`}>
        Attendees
      </div>
      {loading ? (
        <div className={`text-[11px] uppercase tracking-wider ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
          Loading…
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6">
          {renderList(going, "Going")}
          {renderList(interested, "Interested")}
        </div>
      )}
    </div>
  );
}
