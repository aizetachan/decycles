import { useState, useRef, type ChangeEvent } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { db } from "../../firebase";
import { uploadImage } from "../../lib/upload";
import { MentionInput } from "./MentionInput";
import type { Post, PostMention } from "../../types";

const MAX_IMAGES = 5;

/** Edit an existing post: text + @mentions + images (keep/remove existing, add new). */
export function EditPostModal({ post, isDarkMode, onClose }: { post: Post; isDarkMode: boolean; onClose: () => void }) {
  const initialUrls = post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];
  const [text, setText] = useState(post.text || "");
  const [mentions, setMentions] = useState<PostMention[]>(post.mentions || []);
  const [keptUrls, setKeptUrls] = useState<string[]>(initialUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = keptUrls.length + newFiles.length;

  const addImages = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from<File>(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    const next = picked.slice(0, MAX_IMAGES - total);
    setNewFiles((p) => [...p, ...next]);
    setNewPreviews((p) => [...p, ...next.map((f) => URL.createObjectURL(f))]);
  };
  const removeKept = (i: number) => setKeptUrls((p) => p.filter((_, idx) => idx !== i));
  const removeNew = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewFiles((p) => p.filter((_, idx) => idx !== i));
    setNewPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const canSave = !saving && (text.trim().length > 0 || total > 0);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const uploaded: string[] = [];
      for (const f of newFiles) uploaded.push(await uploadImage(f, `posts/${post.authorId}`));
      const body = text.trim();
      const imageUrls = [...keptUrls, ...uploaded];
      const activeMentions = mentions.filter((m) => body.includes(`@${m.name}`));
      await updateDoc(doc(db, "posts", post.id), {
        text: body,
        imageUrls,
        mentions: activeMentions,
      });
      newPreviews.forEach((p) => URL.revokeObjectURL(p));
      onClose();
    } catch (err) {
      console.error("Failed to update post", err);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-2xl brutalist-border brutalist-shadow p-4 ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white"}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest">Edit post</h3>
          <button type="button" onClick={onClose} aria-label="Close" className={isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <MentionInput
          isDarkMode={isDarkMode}
          placeholder="What's new?…"
          resetKey={0}
          initialText={post.text}
          initialMentions={post.mentions}
          onChange={(t, m) => {
            setText(t);
            setMentions(m);
          }}
        />

        <div className={`mt-3 flex items-center gap-2 border-t pt-3 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={total >= MAX_IMAGES}
              aria-label="Add image"
              className={`flex w-9 h-9 shrink-0 items-center justify-center brutalist-border transition-colors disabled:opacity-40 ${
                isDarkMode ? "border-zinc-700 text-gray-300 hover:text-white hover:bg-zinc-800" : "text-gray-500 hover:text-black hover:bg-gray-50"
              }`}
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            {keptUrls.map((src, i) => (
              <div key={src} className="relative w-9 h-9 shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover brutalist-border" referrerPolicy="no-referrer" />
                <button type="button" onClick={() => removeKept(i)} className="absolute -top-1.5 -right-1.5 rounded-full bg-black/80 p-0.5 text-white hover:bg-black" aria-label="Remove image">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div key={src} className="relative w-9 h-9 shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover brutalist-border" referrerPolicy="no-referrer" />
                <button type="button" onClick={() => removeNew(i)} className="absolute -top-1.5 -right-1.5 rounded-full bg-black/80 p-0.5 text-white hover:bg-black" aria-label="Remove image">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={`ml-auto shrink-0 inline-flex h-9 items-center gap-1.5 px-5 text-xs font-bold uppercase tracking-widest brutalist-border transition-colors disabled:opacity-50 ${
              isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
