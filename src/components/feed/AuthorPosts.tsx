import { useEffect, useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { PostCard } from "./PostCard";
import type { Post } from "../../types";

/** A profile's own posts (newest first). Hidden when the author has none. */
export function AuthorPosts({ authorId, isDarkMode }: { authorId: string; isDarkMode: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    getDocs(query(collection(db, "posts"), where("authorId", "==", authorId), limit(50)))
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setPosts(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  if (!loaded || posts.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-6 pb-10">
      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Posts</h3>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} isDarkMode={isDarkMode} />
      ))}
    </div>
  );
}
