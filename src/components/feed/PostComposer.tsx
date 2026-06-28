import { useState, useRef, type ChangeEvent } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { createPost } from "../../lib/posts";
import { ImageLightbox } from "./ImageLightbox";

const MAX_IMAGES = 5;

/**
 * Inline composer at the top of the feed. Text + up to 5 images. Posts as the
 * signed-in account (a creator posts as their shop — see createPost).
 */
export function PostComposer({ isDarkMode, onPosted }: { isDarkMode: boolean; onPosted?: () => void }) {
  const { currentUser, userProfile } = useAuth();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState(-1);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Grow from a single-line input into a textarea as the text expands.
  const autoGrow = () => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };
  const resetGrow = () => {
    if (textRef.current) textRef.current.style.height = "auto";
  };

  if (!currentUser) return null;

  const addImages = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from<File>(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!picked.length) return;
    const room = MAX_IMAGES - files.length;
    const next = picked.slice(0, room);
    setFiles((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))]);
  };
  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };
  const clearImages = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
  };

  const canPost = !posting && (text.trim().length > 0 || files.length > 0);

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      await createPost({
        uid: currentUser.uid,
        role: (userProfile as any)?.role,
        userName: (userProfile as any)?.name,
        userImage: (userProfile as any)?.profileImage,
        text,
        imageFiles: files,
      });
      setText("");
      resetGrow();
      clearImages();
      onPosted?.();
    } catch (err) {
      console.error("Failed to create post", err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={`brutalist-border brutalist-shadow p-4 ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white"}`}>
      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoGrow();
        }}
        placeholder="What's new? Share an update, a new drop or an event…"
        rows={1}
        className={`w-full resize-none overflow-hidden p-3 border-2 outline-none text-sm md:text-base transition-colors ${
          isDarkMode
            ? "bg-black border-zinc-700 text-white placeholder-gray-500 focus:border-white"
            : "bg-gray-50 border-gray-300 text-black placeholder-gray-400 focus:border-black"
        }`}
      />

      <div className={`mt-3 flex items-center gap-2 border-t pt-3 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
        {/* Add image (square) + thumbnails to its right, same row. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= MAX_IMAGES}
            aria-label="Add image"
            title={files.length >= MAX_IMAGES ? `Up to ${MAX_IMAGES} images` : "Add image"}
            className={`flex w-9 h-9 shrink-0 items-center justify-center brutalist-border transition-colors disabled:opacity-40 ${
              isDarkMode
                ? "border-zinc-700 text-gray-300 hover:text-white hover:bg-zinc-800"
                : "text-gray-500 hover:text-black hover:bg-gray-50"
            }`}
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          {previews.map((src, i) => (
            <div key={src} className="relative w-9 h-9 shrink-0">
              <img
                src={src}
                alt=""
                onClick={() => setLightbox(i)}
                className="w-full h-full object-cover brutalist-border cursor-pointer"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-black/80 p-0.5 text-white hover:bg-black"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
        <button
          type="button"
          onClick={submit}
          disabled={!canPost}
          className={`ml-auto shrink-0 inline-flex h-9 items-center gap-1.5 px-5 text-xs font-bold uppercase tracking-widest brutalist-border transition-colors disabled:opacity-50 ${
            isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {posting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Post
        </button>
      </div>

      {lightbox >= 0 && (
        <ImageLightbox images={previews} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(-1)} />
      )}
    </div>
  );
}
