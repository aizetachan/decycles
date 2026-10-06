import React from "react";
import { Bike } from "lucide-react";
import { motion } from "motion/react";
import {
  CREATOR_CARD_AVATAR_SIZE,
  CREATOR_GRID_CLASS,
  creatorCardBodyClass,
  creatorCardClass,
  creatorCardMediaClass,
} from "./CreatorGrid";

const SKELETON_CARDS = 12; // fills the first screen at every breakpoint

interface CreatorGridSkeletonProps {
  isDarkMode: boolean;
  label: string;
  /** "map" shows the map frame instead of cards (same loading gate). */
  variant?: "grid" | "map";
}

/**
 * Explore loading state: shimmering placeholders shaped exactly like the
 * real cards (shared classes from CreatorGrid), with the pulsing bike loader
 * on top. Keeps the page from looking empty while the first covers load.
 */
export function CreatorGridSkeleton({ isDarkMode, label, variant = "grid" }: CreatorGridSkeletonProps) {
  const bar = isDarkMode ? "bg-zinc-800" : "bg-gray-200";

  return (
    <div className="relative" aria-busy="true" aria-live="polite">
      {variant === "map" ? (
        <div className={`h-[600px] w-full brutalist-border brutalist-shadow skeleton-shimmer ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`} />
      ) : (
        <div className={CREATOR_GRID_CLASS} aria-hidden>
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <div key={i} className={creatorCardClass(isDarkMode)}>
              <div className={`${creatorCardMediaClass(isDarkMode)} skeleton-shimmer`} />
              <div className={creatorCardBodyClass(isDarkMode)}>
                {/* Each bar sits in a box with the exact line height of the
                    real title (text-base / sm:text-xl) and location
                    (9px / sm:10px × 1.5), so the card height matches 1:1. */}
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <div className={`${CREATOR_CARD_AVATAR_SIZE} shrink-0 rounded-full skeleton-shimmer ${bar}`} />
                  <div className="flex flex-col gap-0.5 sm:gap-1 flex-1 min-w-0">
                    <div className="h-6 sm:h-7 flex items-center">
                      <div className={`h-3.5 sm:h-5 w-3/4 skeleton-shimmer ${bar}`} />
                    </div>
                    <div className="h-[13.5px] sm:h-[15px] flex items-center">
                      <div className={`h-2 sm:h-2.5 w-1/3 skeleton-shimmer ${bar}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bike loader on top — sticky so it stays visible near the top of the
          viewport while the skeleton extends below the fold. */}
      <div className="absolute inset-0 flex justify-center pointer-events-none">
        <div
          className={`sticky top-1/3 h-fit mt-24 flex flex-col items-center gap-3 px-8 py-6 brutalist-border brutalist-shadow ${
            isDarkMode ? "bg-black" : "bg-white"
          }`}
        >
          <motion.div
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className={isDarkMode ? "text-white" : "text-black"}
          >
            <Bike className="w-12 h-12" />
          </motion.div>
          <div className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
