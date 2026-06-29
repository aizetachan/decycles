import { useState, useRef, useEffect, type FC, type ReactNode } from "react";
import { Heart, MoreHorizontal, Link2, Trash2, Check, Pencil } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useUI } from "../../contexts/UIContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLike } from "../../hooks/useLike";
import { ImageLightbox } from "./ImageLightbox";
import { EditPostModal } from "./EditPostModal";
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
  const { openCreatorProfile, openUserProfile } = useUI();
  const { currentUser, userProfile } = useAuth();
  const [lightbox, setLightbox] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Real likes for live posts; mock posts (no backend) fall back to a local toggle.
  const isMock = post.id.startsWith("mock-");
  const { isLiked, toggleLike } = useLike("post", isMock ? undefined : post.id);
  const likeCount = (post.likesCount || 0) + (isLiked ? 1 : 0);
  const images = post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];

  const isAuthor = !!currentUser && currentUser.uid === post.authorId;
  const canDelete = isAuthor || (!!currentUser && (userProfile as any)?.role === "admin");
  const canEdit = isAuthor && !isMock;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const deletePost = async () => {
    setMenuOpen(false);
    if (isMock) return;
    if (!window.confirm("Delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", post.id));
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };
  const goAuthor = () => {
    if (post.authorType === "creator") openCreatorProfile(post.authorId);
    else openUserProfile(post.authorId);
  };
  const onMention = (m: PostMention) => {
    if (m.type === "creator") openCreatorProfile(m.id);
    else openUserProfile(m.id);
  };

  return (
    <article className={`brutalist-border p-4 md:p-5 ${isDarkMode ? "bg-black" : "bg-white"}`}>
      <header className="flex items-start justify-between gap-2">
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

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Post options"
            className={`p-1 transition-colors ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className={`absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden brutalist-border ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
              <button
                type="button"
                onClick={() => {
                  copyLink();
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={deletePost}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-red-500 transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
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
      {editing && <EditPostModal post={post} isDarkMode={isDarkMode} onClose={() => setEditing(false)} />}
    </article>
  );
};
