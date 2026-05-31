import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, RefreshCw } from "lucide-react";

interface CoverPreviewModalProps {
  open: boolean;
  imageUrl: string | null;
  isDarkMode: boolean;
  onClose: () => void;
  // Optional actions. If provided, the modal renders the corresponding button
  // and calls the callback after closing itself. Both are optional so the
  // modal can also be used in read-only previews.
  onReplace?: () => void;
  onDelete?: () => void;
  // True when the current image is the bundled default. Hides the Delete
  // button (deleting a default is a no-op).
  isDefault?: boolean;
}

/**
 * Cover preview modal.
 *
 * The cover is meant to be 16:9. It gets rendered in two contexts where the
 * crop is different:
 *   - Home card: aspect 4:3 with object-cover → the LEFT and RIGHT 12.5% of
 *     the 16:9 source are cropped (visible area is the central 75% width).
 *   - Profile page: full width, fixed height → can crop TOP and BOTTOM.
 *
 * The dashed rectangle marks the central 75% — the area that is always
 * visible on home cards. Side bands are darkened so the user sees the
 * cropped parts at a glance.
 */
export function CoverPreviewModal({
  open,
  imageUrl,
  isDarkMode,
  onClose,
  onReplace,
  onDelete,
  isDefault = false,
}: CoverPreviewModalProps) {
  const showDelete = !!onDelete && !isDefault;
  const showReplace = !!onReplace;

  const handleReplace = () => {
    onClose();
    onReplace?.();
  };
  const handleDelete = () => {
    onClose();
    onDelete?.();
  };

  return (
    <AnimatePresence>
      {open && imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-3xl relative shadow-2xl max-h-[90vh] overflow-y-auto brutalist-border brutalist-shadow ${
              isDarkMode ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            <button
              onClick={onClose}
              aria-label="Close preview"
              className={`absolute top-4 right-4 z-10 transition-colors ${
                isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
              }`}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-4 md:p-6">
              <h2 className={`text-xl font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>
                Preview your cover
              </h2>
              <p className={`text-sm font-bold mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Make sure your focus (face, bike, logo) stays inside the dashed frame — that's the area shown on home cards.
              </p>

              {/* 16:9 preview with the home-card safe zone overlay. */}
              <div className={`relative w-full aspect-[16/9] overflow-hidden ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`}>
                <img
                  src={imageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Safe zone — 75% of the width centered, full height. The
                    side bands (12.5% each) are darkened to visualize the
                    parts that get cropped on home cards. */}
                <div className="absolute inset-y-0 left-0 w-[12.5%] bg-black/55 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-[12.5%] bg-black/55 pointer-events-none" />
                <div className="absolute inset-y-0 left-[12.5%] right-[12.5%] border-2 border-dashed border-white pointer-events-none" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-black pointer-events-none">
                  Visible on home card
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Left cluster — Replace + Delete (Delete only when there
                    is a real uploaded image to throw away). */}
                <div className="flex flex-wrap gap-3">
                  {showReplace && (
                    <button
                      type="button"
                      onClick={handleReplace}
                      className={`inline-flex items-center gap-2 px-4 py-3 brutalist-border font-bold uppercase tracking-widest text-sm transition-colors ${
                        isDarkMode ? "border-white text-white hover:bg-white/10" : "border-black text-black hover:bg-black/5"
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Replace
                    </button>
                  )}
                  {showDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={`inline-flex items-center gap-2 px-4 py-3 brutalist-border font-bold uppercase tracking-widest text-sm transition-colors ${
                        isDarkMode ? "border-red-500/60 text-red-300 hover:bg-red-500/10" : "border-red-500/60 text-red-600 hover:bg-red-500/5"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>

                {/* Right cluster — Looks good (close). */}
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-6 py-3 brutalist-border brutalist-shadow font-bold uppercase tracking-widest text-sm transition-colors ${
                    isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  Looks good
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
