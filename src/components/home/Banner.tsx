import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useT } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { isMockMode } from "../../lib/previewMock";
import { creators } from "../../data";

export const BANNER_IMAGES = [
  "https://drive.google.com/thumbnail?id=1U-dO41Q-1syFz8tCCGGOwbD5o4Bb-ghx&sz=w1600",
  creators[0]?.coverImage || "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1600&q=80",
  creators[1]?.coverImage || "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1600&q=80"
];

export type FeaturedTab = "EXPLORE" | "GALLERY" | "FEED" | "CALENDAR";

interface BannerProps {
  isDarkMode: boolean;
  featuredTab: FeaturedTab;
  setFeaturedTab: (tab: FeaturedTab) => void;
}

export function Banner({ isDarkMode, featuredTab, setFeaturedTab }: BannerProps) {
  const { t } = useT();
  const { userProfile } = useAuth();
  // v1: the feed is admin-only (non-admins see FEED as "Soon"). On a preview
  // channel the gate is lifted so the team can demo the feed.
  const isAdmin = (userProfile as any)?.role === "admin" || isMockMode();
  // Tap-to-reveal tooltip for disabled tabs (mobile has no hover).
  const [tappedSoonTab, setTappedSoonTab] = useState<string | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const flashSoonTooltip = (tab: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTappedSoonTab(tab);
    tooltipTimerRef.current = setTimeout(() => {
      setTappedSoonTab(null);
      tooltipTimerRef.current = null;
    }, 2500);
  };

  return (
    <div className="w-full h-[24rem] sm:h-[28rem] md:h-[32rem] relative overflow-hidden bg-black group">
      <AnimatePresence mode="wait">
        <motion.img 
          key="static-banner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          src={BANNER_IMAGES[0]} 
          alt="Banner image" 
          className="w-full h-full object-cover grayscale absolute inset-0"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 pointer-events-none">
        <AnimatePresence mode="wait">
            <motion.div
              key="static-slide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center px-4"
            >
              <h1 className="text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-display uppercase tracking-widest text-white drop-shadow-lg mb-0 md:mb-4 text-center">
                Crafted for <br className="md:hidden" /><span className="text-gray-300">Cyclists</span>
              </h1>
              <p className="hidden md:block text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-gray-300 max-w-2xl mb-8 md:mb-12">
                Explore the world's finest bicycle creators, builders, events and communities.
              </p>
            </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Banner Controls */}
      <div className="absolute inset-x-0 bottom-4 md:bottom-8 flex justify-center z-20 pointer-events-auto">
        <div className="flex justify-center w-full mb-2 px-2 md:px-4">
          <div className={`inline-flex items-center p-1.5 md:p-2 brutalist-border brutalist-shadow rounded-full ${isDarkMode ? "bg-black" : "bg-white"}`}>
            {(["EXPLORE", "GALLERY", "FEED", "CALENDAR"] as const).map((tab) => {
              // The feed is admin-only in v1 — non-admins see FEED as "Soon".
              const isDisabled = tab === "FEED" && !isAdmin;
              const showTooltip = isDisabled && tappedSoonTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    if (isDisabled) {
                      // Mobile tap (no hover) — flash for 2.5s then hide.
                      flashSoonTooltip(tab);
                      return;
                    }
                    setFeaturedTab(tab);
                  }}
                  onMouseEnter={() => {
                    // Desktop hover — show as long as the cursor is on the button.
                    if (isDisabled) {
                      if (tooltipTimerRef.current) {
                        clearTimeout(tooltipTimerRef.current);
                        tooltipTimerRef.current = null;
                      }
                      setTappedSoonTab(tab);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isDisabled) {
                      if (tooltipTimerRef.current) {
                        clearTimeout(tooltipTimerRef.current);
                        tooltipTimerRef.current = null;
                      }
                      setTappedSoonTab(null);
                    }
                  }}
                  aria-disabled={isDisabled}
                  className={`relative px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3.5 text-xs sm:text-sm md:text-lg font-display uppercase tracking-widest transition-colors whitespace-nowrap rounded-full ${
                    featuredTab === tab && !isDisabled
                      ? isDarkMode ? "text-black" : "text-white"
                      : isDarkMode
                        ? `text-gray-300 ${!isDisabled && "hover:text-white"}`
                        : `text-gray-600 ${!isDisabled && "hover:text-black"}`
                  }`}
                >
                  {/* Apply the dim only to the label so the tooltip stays at full opacity. */}
                  <span className={`relative z-10 inline-flex items-center gap-1.5 ${isDisabled ? "opacity-60" : ""}`}>
                    {tab === "EXPLORE" ? t("tabs.explore") : tab === "GALLERY" ? t("tabs.gallery") : tab === "FEED" ? t("tabs.feed") : t("tabs.calendar")}
                    {isDisabled && (
                      <span className="rounded-sm bg-gray-500 px-1 py-0.5 text-[8px] font-bold leading-none tracking-widest text-white">
                        {t("tabs.soon")}
                      </span>
                    )}
                  </span>
                  {featuredTab === tab && !isDisabled && (
                    <motion.div
                      layoutId="active-pill"
                      className={`absolute inset-0 brutalist-border rounded-full ${isDarkMode ? "bg-white" : "bg-black"}`}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {/* Tooltip "Soon" — sits directly above THIS button, not above
                      the whole pill. The pill wrapper has no overflow so it isn't
                      clipped. */}
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.span
                        key="soon"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className={`pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest brutalist-border whitespace-nowrap z-30 ${
                          isDarkMode ? "bg-white text-black" : "bg-black text-white"
                        }`}
                      >
                        {t("tabs.soon")}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
