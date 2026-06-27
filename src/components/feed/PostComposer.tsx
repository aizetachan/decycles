import { useState, useRef, type ChangeEvent } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { createPost } from "../../lib/posts";

/**
 * Inline composer at the top of the feed. Text + optional image. Posts as the
 * signed-in account (a creator posts as their shop — see createPost).
 */
export function PostComposer({ isDarkMode, onPosted }: { isDarkMode: boolean; onPosted?: () => void }) {
  const { currentUser, userProfile } = useAuth();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const pickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f && f.type.startsWith("image/")) {
      if (preview) URL.revokeObjectURL(preview);
      setImageFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };
  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImageFile(null);
    setPreview(null);
  };

  const canPost = !posting && (text.trim().length > 0 || !!imageFile);

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
        imageFile,
      });
      setText("");
      clearImage();
      onPosted?.();
    } catch (err) {
      console.error("Failed to create post", err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={`brutalist-border p-4 ${isDarkMode ? "bg-black" : "bg-white"}`}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share an update…"
        rows={3}
        className={`w-full resize-none bg-transparent outline-none ${isDarkMode ? "text-white placeholder-gray-500" : "text-black placeholder-gray-400"}`}
      />
      {preview && (
        <div className="relative mt-2 inline-block">
          <img src={preview} alt="" className="max-h-60 object-cover brutalist-border" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
        >
          <ImagePlus className="w-4 h-4" /> Add image
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        <button
          type="button"
          onClick={submit}
          disabled={!canPost}
          className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-widest brutalist-border transition-colors disabled:opacity-50 ${
            isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {posting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Post
        </button>
      </div>
    </div>
  );
}
