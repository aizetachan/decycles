import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { X, Loader2 } from "lucide-react";
import { db } from "../../firebase";
import { useUI } from "../../contexts/UIContext";
import { FollowButton } from "../ui/FollowButton";
import { PostCard } from "../feed/PostCard";
import type { Post } from "../../types";

interface UserDoc {
  name?: string;
  profileImage?: string;
  bio?: string;
  followersCount?: number;
}

/** Lightweight public profile for a regular user: avatar, name, short bio,
 *  Follow, and their posts. Reuses the user doc + PostCard. */
export function UserProfileModal() {
  const { isDarkMode, selectedUserId, closeUserProfile, openJoinModal } = useUI();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedUserId) {
      setUser(null);
      setPosts([]);
      return;
    }
    setLoading(true);
    Promise.all([
      getDoc(doc(db, "users", selectedUserId)),
      getDocs(query(collection(db, "posts"), where("authorId", "==", selectedUserId), limit(50))),
    ])
      .then(([userSnap, postsSnap]) => {
        setUser(userSnap.exists() ? (userSnap.data() as UserDoc) : null);
        const list = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setPosts(list);
      })
      .catch(() => {
        setUser(null);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUserProfile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedUserId, closeUserProfile]);

  if (!selectedUserId) return null;

  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeUserProfile();
      }}
    >
      <div className="relative w-full max-w-2xl">
        <button
          type="button"
          onClick={closeUserProfile}
          aria-label="Close"
          className="absolute -top-10 right-0 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : !user ? (
          <div className={`brutalist-border p-8 text-center ${isDarkMode ? "bg-black" : "bg-white"} ${muted}`}>
            <p className="text-sm font-bold uppercase tracking-widest">User not found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`brutalist-border p-6 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
              <div className="flex flex-col items-center text-center">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-24 h-24 rounded-full object-cover brutalist-border" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-24 h-24 rounded-full brutalist-border bg-gray-300" />
                )}
                <h2 className="mt-3 text-2xl font-bold uppercase tracking-widest">{user.name || "User"}</h2>
                {user.bio && <p className={`mt-2 max-w-md text-sm ${muted}`}>{user.bio}</p>}
                <div className="mt-4 flex items-center gap-3">
                  <FollowButton
                    targetId={selectedUserId}
                    targetType="user"
                    isDarkMode={isDarkMode}
                    onRequireAuth={() => openJoinModal("signup")}
                  />
                  {typeof user.followersCount === "number" && user.followersCount > 0 && (
                    <span className={`text-xs font-bold uppercase tracking-widest ${muted}`}>
                      {user.followersCount} {user.followersCount === 1 ? "follower" : "followers"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {posts.length === 0 ? (
              <div className={`brutalist-border p-8 text-center ${isDarkMode ? "bg-black" : "bg-white"} ${muted}`}>
                <p className="text-xs font-bold uppercase tracking-widest">No posts yet</p>
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} isDarkMode={isDarkMode} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
