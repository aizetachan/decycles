import type { FC } from "react";
import { useUI } from "../../contexts/UIContext";
import type { Post } from "../../types";

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
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w`;
  return d.toLocaleDateString();
}

export const PostCard: FC<{ post: Post; isDarkMode: boolean }> = ({ post, isDarkMode }) => {
  const { openCreatorProfile } = useUI();
  const goAuthor = () => {
    if (post.authorType === "creator") openCreatorProfile(post.authorId);
  };

  return (
    <article className={`brutalist-border p-4 md:p-5 ${isDarkMode ? "bg-black" : "bg-white"}`}>
      <header>
        <button onClick={goAuthor} className="flex items-center gap-3 min-w-0 text-left">
          {post.authorImage ? (
            <img
              src={post.authorImage}
              alt=""
              className="w-10 h-10 rounded-full object-cover brutalist-border shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full brutalist-border bg-gray-200 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-bold uppercase tracking-wide text-sm truncate">{post.authorName}</div>
            <div className={`text-[11px] uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {post.authorType === "creator" ? "Shop" : "User"} · {timeAgo(post.createdAt)}
            </div>
          </div>
        </button>
      </header>

      {post.text && (
        <p className={`mt-3 whitespace-pre-wrap break-words ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
          {post.text}
        </p>
      )}

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          className="mt-3 w-full max-h-[28rem] object-cover brutalist-border"
          referrerPolicy="no-referrer"
        />
      )}

      {post.authorType === "creator" && (
        <button
          onClick={goAuthor}
          className={`mt-3 text-xs font-bold uppercase tracking-widest transition-colors ${
            isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
          }`}
        >
          View shop →
        </button>
      )}
    </article>
  );
};
