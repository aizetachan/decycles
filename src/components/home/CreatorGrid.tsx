import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Creator } from "../../types";

interface CreatorGridProps {
  isDarkMode: boolean;
  filteredCreators: Creator[];
  setSelectedCreator: (creator: Creator) => void;
}

export function CreatorGrid({ isDarkMode, filteredCreators, setSelectedCreator }: CreatorGridProps) {
  return (
    <motion.div
      layout
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
    >
      <AnimatePresence>
        {filteredCreators.map((creator) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            key={creator.id}
            onClick={() => setSelectedCreator(creator)}
            className={`flex flex-col group cursor-pointer transition-colors brutalist-border brutalist-shadow overflow-hidden ${
              isDarkMode
                ? "bg-black"
                : "bg-white"
            }`}
          >
            {/* Image Container */}
            <div className={`relative aspect-[4/3] overflow-hidden ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`}>
              <img
                src={creator.coverImage}
                alt={creator.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                referrerPolicy="no-referrer"
              />

              {/* Category Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {creator.categories.slice(0, 2).map((category, idx) => (
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
            <div className={`flex flex-col p-3 sm:p-4 ${isDarkMode ? "bg-zinc-900" : "bg-gray-50"}`}>
              {/* Header with Title and Location */}
              <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1 sm:mb-2">
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
