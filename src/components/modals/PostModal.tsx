import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { X, Loader2 } from "lucide-react";
import { db } from "../../firebase";
import { useUI } from "../../contexts/UIContext";
import { PostCard } from "../feed/PostCard";
import { MOCK_POSTS } from "../feed/mockPosts";
import type { Post } from "../../types";

/** Opens a single post by id (e.g. from a notification). Reuses PostCard. */
export function PostModal() {
  const { isDarkMode, selectedPostId, closePost } = useUI();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPostId) {
      setPost(null);
      return;
    }
    const mockPost = MOCK_POSTS.find((p) => p.id === selectedPostId);
    if (mockPost) {
      setPost(mockPost);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, "posts", selectedPostId))
      .then((snap) => setPost(snap.exists() ? ({ id: snap.id, ...snap.data() } as Post) : null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [selectedPostId]);

  useEffect(() => {
    if (!selectedPostId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePost();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPostId, closePost]);

  if (!selectedPostId) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closePost();
      }}
    >
      <div className="relative w-full max-w-2xl">
        <button
          type="button"
          onClick={closePost}
          aria-label="Close"
          className="absolute -top-10 right-0 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
        >
          <X className="w-5 h-5" />
        </button>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : post ? (
          <PostCard post={post} isDarkMode={isDarkMode} />
        ) : (
          <div className={`brutalist-border p-8 text-center ${isDarkMode ? "bg-black text-gray-400" : "bg-white text-gray-500"}`}>
            <p className="text-sm font-bold uppercase tracking-widest">Post not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
