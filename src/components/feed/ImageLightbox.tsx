import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Minimal fullscreen image lightbox with prev/next + keyboard nav. Used to
 * preview composer attachments and post images as a gallery.
 */
export function ImageLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const total = images.length;
  const prev = () => onIndex((index - 1 + total) % total);
  const next = () => onIndex((index + 1) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (index < 0 || !images[index]) return null;

  const iconBtn =
    "absolute z-10 flex items-center justify-center rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button onClick={onClose} className={`${iconBtn} top-4 right-4`} aria-label="Close">
        <X className="w-5 h-5" />
      </button>
      {total > 1 && (
        <button onClick={prev} className={`${iconBtn} left-4`} aria-label="Previous">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <img
        src={images[index]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        referrerPolicy="no-referrer"
      />
      {total > 1 && (
        <button onClick={next} className={`${iconBtn} right-4`} aria-label="Next">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
}
