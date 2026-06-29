import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import type { Post } from "../types";

/**
 * The signed-in user's feed: recent posts authored by the creators/users they
 * follow (plus their own posts), newest first.
 *
 * MVP approach: subscribe to recent posts globally and filter to followed
 * authors client-side. Simple and index-free; fine at current scale. At larger
 * scale this becomes a per-author query (chunked `in`) or a precomputed timeline.
 */
export function useFeed() {
  const { currentUser } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Who I follow.
  useEffect(() => {
    if (!currentUser) {
      setFollowedIds(new Set());
      return;
    }
    const q = query(collection(db, "follows"), where("followerId", "==", currentUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => setFollowedIds(new Set(snap.docs.map((d) => (d.data() as any).followeeId))),
      (err) => console.error("feed: follows subscription error", err),
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Recent posts.
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]);
        setLoading(false);
      },
      (err) => {
        console.error("feed: posts subscription error", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const feed = useMemo<Post[]>(() => {
    if (!currentUser) return [];
    const allowed = new Set(followedIds);
    allowed.add(currentUser.uid); // include my own posts
    return posts.filter((p) => allowed.has(p.authorId));
  }, [posts, followedIds, currentUser?.uid]);

  return { feed, loading, followsNobody: followedIds.size === 0 };
}
