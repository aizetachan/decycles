import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Creator } from '../../types';

interface GalleryImageModalProps {
  // The currently displayed image (creator + single-image url). When `gallery`
  // is provided, `selectedImage.img` is treated as the fallback and the actual
  // shown image is derived from `gallery[currentIndex]`.
  selectedImage: { img: string; creator: Creator } | null;
  onClose: () => void;
  // Optional: full gallery + index for navigation. When provided, the modal
  // renders prev/next arrows and a thumbnail strip for browsing.
  gallery?: string[];
  currentIndex?: number;
  onIndexChange?: (idx: number) => void;
}

export const GalleryImageModal: React.FC<GalleryImageModalProps> = ({
  selectedImage,
  onClose,
  gallery,
  currentIndex,
  onIndexChange,
}) => {
  const hasGallery = Array.isArray(gallery) && gallery.length > 1 && typeof currentIndex === "number" && !!onIndexChange;
  const total = gallery?.length || 0;
  const idx = typeof currentIndex === "number" ? currentIndex : 0;
  const displayedImg = hasGallery && gallery ? gallery[idx] : selectedImage?.img;

  const goPrev = () => {
    if (!hasGallery || !onIndexChange) return;
    onIndexChange((idx - 1 + total) % total);
  };
  const goNext = () => {
    if (!hasGallery || !onIndexChange) return;
    onIndexChange((idx + 1) % total);
  };

  // Keyboard navigation while the lightbox is open.
  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!hasGallery) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedImage, hasGallery, idx, total]);

  return (
    <AnimatePresence>
      {selectedImage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 brutalist-border brutalist-shadow bg-black text-white hover:bg-white hover:text-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col w-full max-h-[90vh]">
              <div className="relative flex items-center justify-center">
                {hasGallery && (
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous image"
                    className="absolute left-2 md:left-4 z-10 p-2 brutalist-border brutalist-shadow bg-black text-white hover:bg-white hover:text-black transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                <img
                  src={displayedImg}
                  alt={selectedImage.creator.name}
                  className="max-w-full max-h-[75vh] object-contain mx-auto"
                  referrerPolicy="no-referrer"
                />
                {hasGallery && (
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next image"
                    className="absolute right-2 md:right-4 z-10 p-2 brutalist-border brutalist-shadow bg-black text-white hover:bg-white hover:text-black transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {hasGallery && gallery && (
                <div className="flex gap-2 mt-4 overflow-x-auto px-2 justify-center">
                  {gallery.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => onIndexChange?.(i)}
                      className={`shrink-0 w-16 h-16 md:w-20 md:h-20 overflow-hidden brutalist-border transition-opacity ${
                        i === idx ? "opacity-100 ring-2 ring-white" : "opacity-50 hover:opacity-100"
                      }`}
                      aria-label={`Show image ${i + 1}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center w-full mt-4 px-4">
                <span className="text-white font-display uppercase tracking-widest text-2xl">
                  {selectedImage.creator.name}
                  {hasGallery && (
                    <span className="ml-3 text-sm font-bold tracking-wider opacity-70">
                      {idx + 1} / {total}
                    </span>
                  )}
                </span>
                {selectedImage.creator.socials?.instagram && (
                  <a
                    href={selectedImage.creator.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-black hover:bg-white brutalist-border px-3 py-1 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Instagram
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
