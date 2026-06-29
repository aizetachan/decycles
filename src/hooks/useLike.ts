import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import type { LikeTargetType } from "../types";

/**
 * ♥ like state + toggle for a target (post / creator / user).
 *
 * Persists to `likes/{uid}_{targetType}_{targetId}` when there's a signed-in
 * user and a targetId; the syncLikeCounts function keeps the cached likesCount
 * in step. With no targetId (or no user) it falls back to a purely local toggle
 * — handy for the mock/preview feed where writes aren't available.
 */
export function useLike(targetType: LikeTargetType, targetId?: string) {
  const { currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const persist = !!(currentUser && targetId);
  const likeId = persist ? `${currentUser!.uid}_${targetType}_${targetId}` : null;

  useEffect(() => {
    if (!likeId) return;
    const unsub = onSnapshot(
      doc(db, "likes", likeId),
      (snap) => setIsLiked(snap.exists()),
      (err) => console.error("like subscription error", err),
    );
    return () => unsub();
  }, [likeId]);

  const toggleLike = useCallback(async () => {
    const next = !isLiked;
    setIsLiked(next); // optimistic (and the only effect in local-only mode)
    if (!persist || !currentUser || !targetId) return;
    const ref = doc(db, "likes", `${currentUser.uid}_${targetType}_${targetId}`);
    try {
      if (next) {
        await setDoc(ref, {
          userId: currentUser.uid,
          targetType,
          targetId,
          createdAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(ref);
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
      setIsLiked(!next); // rollback
    }
  }, [isLiked, persist, currentUser, targetType, targetId]);

  return { isLiked, toggleLike, canLike: !!currentUser };
}
