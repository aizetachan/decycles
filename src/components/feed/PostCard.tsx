import { useState, type FC, type ReactNode } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { useUI } from "../../contexts/UIContext";
import { useLike } from "../../hooks/useLike";
import { ImageLightbox } from "./ImageLightbox";
import type { Post, PostMention } from "../../types";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Render post text with @mentions turned into clickable links. */
function renderText(
  text: string,
  mentions: PostMention[] | undefined,
  onMention: (m: PostMention) => void,
  isDarkMode: boolean,
): ReactNode {
  if (!mentions?.length) return text;
  const byLength = [...mentions].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp("@(" + byLength.map((m) => escapeRegex(m.name)).join("|") + ")", "g");
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const name = match[1];
    const mention = mentions.find((m) => m.name === name);
    out.push(
      <button
        key={`m${key++}`}
        type="button"
        onClick={() => mention && onMention(mention)}
        className={`font-extrabold underline decoration-1 underline-offset-2 ${isDarkMode ? "text-white" : "text-black"}`}
      >
        @{name}
      </button>,
    );
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

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
  const [lightbox, setLightbox] = useState(-1);
  // Real likes for live posts; mock posts (no backend) fall back to a local toggle.
  const isMock = post.id.startsWith("mock-");
  const { isLiked, toggleLike } = useLike("post", isMock ? undefined : post.id);
  const likeCount = (post.likesCount || 0) + (isLiked ? 1 : 0);
  const images = post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];
  const goAuthor = () => {
    if (post.authorType === "creator") openCreatorProfile(post.authorId);
  };
  const onMention = (m: PostMention) => {
    if (m.type === "creator") openCreatorProfile(m.id);
    // user mentions: no public profile yet — styled link, no navigation.
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
          {renderText(post.text, post.mentions, onMention, isDarkMode)}
        </p>
      )}

      {images.length > 0 && (
        <div className={`mt-3 grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              onClick={() => setLightbox(i)}
              referrerPolicy="no-referrer"
              className={`w-full object-cover brutalist-border cursor-pointer ${
                images.length === 1 ? "max-h-[28rem]" : "aspect-square"
              }`}
            />
          ))}
        </div>
      )}

      <footer className={`mt-4 flex items-center gap-5 text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        <button
          type="button"
          onClick={() => toggleLike()}
          aria-pressed={isLiked}
          className={`flex items-center gap-1.5 transition-colors ${isDarkMode ? "hover:text-white" : "hover:text-black"}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current text-red-500" : ""}`} />
          {likeCount}
        </button>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" />
          0
        </span>
        {post.authorType === "creator" && (
          <button
            type="button"
            onClick={goAuthor}
            className={`ml-auto transition-colors ${isDarkMode ? "hover:text-white" : "hover:text-black"}`}
          >
            View shop →
          </button>
        )}
      </footer>

      {lightbox >= 0 && (
        <ImageLightbox images={images} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(-1)} />
      )}
    </article>
  );
};
