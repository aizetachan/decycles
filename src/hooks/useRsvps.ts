import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export type RsvpStatus = "going" | "interested";

const rsvpId = (creatorId: string, eventIdx: number, userId: string) =>
  `${creatorId}_${eventIdx}_${userId}`;

/**
 * Live RSVP state for a single event. Returns counts (for both statuses), the
 * current user's status (or null if they haven't RSVP'd / aren't signed in),
 * and a setter. Setter passing `null` clears the RSVP.
 *
 * Updates from any client propagate immediately via `onSnapshot`, so counts
 * stay live without polling.
 */
export function useRsvps(creatorId: string | undefined, eventIdx: number | undefined) {
  const { currentUser } = useAuth();
  const [docs, setDocs] = useState<Array<{ userId: string; status: RsvpStatus }>>([]);
  const [loading, setLoading] = useState(true);

  const canSubscribe = !!creatorId && typeof eventIdx === "number";

  useEffect(() => {
    if (!canSubscribe) {
      setDocs([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "rsvps"),
      where("creatorId", "==", creatorId),
      where("eventIdx", "==", eventIdx),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return { userId: data.userId, status: data.status };
          }),
        );
        setLoading(false);
      },
      (err) => {
        console.error("rsvps subscription failed:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [creatorId, eventIdx, canSubscribe]);

  const counts = useMemo(() => {
    let going = 0;
    let interested = 0;
    docs.forEach((d) => {
      if (d.status === "going") going += 1;
      else if (d.status === "interested") interested += 1;
    });
    return { going, interested };
  }, [docs]);

  const myStatus: RsvpStatus | null = useMemo(() => {
    if (!currentUser) return null;
    const mine = docs.find((d) => d.userId === currentUser.uid);
    return (mine?.status as RsvpStatus) || null;
  }, [docs, currentUser]);

  const setStatus = async (next: RsvpStatus | null) => {
    if (!currentUser || !creatorId || typeof eventIdx !== "number") return;
    const id = rsvpId(creatorId, eventIdx, currentUser.uid);
    const ref = doc(db, "rsvps", id);
    if (next === null) {
      await deleteDoc(ref);
      return;
    }
    await setDoc(ref, {
      creatorId,
      eventIdx,
      userId: currentUser.uid,
      status: next,
      updatedAt: serverTimestamp(),
    });
  };

  return { counts, myStatus, loading, setStatus, canRsvp: !!currentUser };
}
