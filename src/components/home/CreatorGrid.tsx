import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Creator } from "../../types";

// Shared with CreatorGridSkeleton so the loading placeholders match the real
// cards exactly (no layout jump when the grid swaps in).
export const CREATOR_GRID_CLASS = "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6";
export const creatorCardClass = (isDarkMode: boolean) =>
  `flex flex-col brutalist-border brutalist-shadow overflow-hidden ${isDarkMode ? "bg-black" : "bg-white"}`;
export const creatorCardMediaClass = (isDarkMode: boolean) =>
  `relative aspect-[4/3] overflow-hidden ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`;
export const creatorCardBodyClass = (isDarkMode: boolean) =>
  `flex flex-col p-3 sm:p-4 ${isDarkMode ? "bg-zinc-900" : "bg-gray-50"}`;

// Cover image that fades in over a shimmering placeholder, so a card scrolled
// into view before its image arrives never shows an empty box.
function CardCover({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="absolute inset-0 skeleton-shimmer" aria-hidden />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
      />
    </>
  );
}

interface CreatorGridProps {
  isDarkMode: boolean;
  filteredCreators: Creator[];
  setSelectedCreator: (creator: Creator) => void;
}

export function CreatorGrid({ isDarkMode, filteredCreators, setSelectedCreator }: CreatorGridProps) {
  return (
    <motion.div
      layout
      className={CREATOR_GRID_CLASS}
    >
      {/* initial={false}: cards already on screen when the grid first mounts
          (i.e. right after the loading skeleton) don't pop/scale in — the frame
          simply replaces the skeleton card in place and only the content
          (image + texts) fades in. Filter changes still animate cards. */}
      <AnimatePresence initial={false}>
        {filteredCreators.map((creator) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            key={creator.id}
            onClick={() => setSelectedCreator(creator)}
            className={`${creatorCardClass(isDarkMode)} group cursor-pointer transition-colors`}
          >
            {/* Image Container */}
            <div className={creatorCardMediaClass(isDarkMode)}>
              <CardCover src={creator.coverImage} alt={creator.name} />

              {/* Category Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {(creator.categories || []).slice(0, 2).map((category, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 brutalist-border brutalist-shadow ${
                      !isDarkMode ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>

            {/* Content Container — border lives on the parent card now so it
                wraps both the image and the content as a single frame. */}
            <div className={creatorCardBodyClass(isDarkMode)}>
              {/* Header with Title and Location */}
              <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1 sm:mb-2 content-fade-in">
                <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                  <h3 className={`text-base sm:text-xl font-display uppercase tracking-wide transition-colors line-clamp-1 ${isDarkMode ? "text-white group-hover:text-gray-300" : "text-black group-hover:text-gray-600"}`}>
                    {creator.name}
                  </h3>
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {creator.location}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
