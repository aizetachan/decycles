import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import type { FolloweeType } from "../types";

/**
 * Follow state + toggle for a single target (a creator/shop or a user).
 *
 * "Following or not" is just whether the doc `follows/{myUid}_{targetId}`
 * exists — we subscribe to that one doc for a live, cheap (1-doc) read. The
 * toggle creates/deletes it optimistically; the syncFollowCounts function keeps
 * the cached follower/following counts in step.
 */
export function useFollow(targetId: string | undefined, targetType: FolloweeType) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const followId = currentUser && targetId ? `${currentUser.uid}_${targetId}` : null;

  useEffect(() => {
    if (!followId) {
      setIsFollowing(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "follows", followId),
      (snap) => setIsFollowing(snap.exists()),
      (err) => console.error("follow subscription error", err),
    );
    return () => unsub();
  }, [followId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUser || !targetId || loading) return;
    if (currentUser.uid === targetId) return; // can't follow yourself
    const ref = doc(db, "follows", `${currentUser.uid}_${targetId}`);
    const next = !isFollowing;
    setLoading(true);
    setIsFollowing(next); // optimistic
    try {
      if (next) {
        await setDoc(ref, {
          followerId: currentUser.uid,
          followeeId: targetId,
          followeeType: targetType,
          createdAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(ref);
      }
    } catch (err) {
      console.error("Failed to toggle follow", err);
      setIsFollowing(!next); // rollback
    } finally {
      setLoading(false);
    }
  }, [currentUser, targetId, targetType, isFollowing, loading]);

  return {
    isFollowing,
    toggleFollow,
    loading,
    canFollow: !!currentUser && currentUser.uid !== targetId,
  };
}
