import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Map, Grid, ChevronDown, Globe, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Category, SubCategory } from "../../types";
import { useCategories } from "../../contexts/CategoriesContext";
import { useT } from "../../contexts/LanguageContext";

// EVENT_CATEGORIES is curated separately (subset of Events subcategories that
// excludes Competitions). Re-exported here for backward compat with consumers
// like EventCalendar that already import it from this module.
export { EVENT_CATEGORIES } from "../../constants/categories";

interface FilterBarProps {
  isDarkMode: boolean;
  viewMode: "grid" | "map";
  setViewMode: (mode: "grid" | "map") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCountry: string;
  setIsCountryDropdownOpen: (open: boolean) => void;
  setIsMobileFiltersOpen: (open: boolean) => void;
  activeCategory: Category;
  handleCategoryChange: (c: Category) => void;
  activeProductCategory: Category | null;
  handleProductCategoryChange: (c: Category) => void;
  activeServiceCategory: Category | null;
  handleServiceCategoryChange: (c: Category) => void;
  activeEventCategory: Category | null;
  handleEventCategoryChange: (c: Category) => void;
  activeCollectiveCategory: Category | null;
  handleCollectiveCategoryChange: (c: Category) => void;
  activeArtsCategory: Category | null;
  handleArtsCategoryChange: (c: Category) => void;
  currentCombinedValue: string;
  activeSubCategories: SubCategory[];
  /**
   * Parent category whose filters apply (the deepest active subcategory).
   * Drives the visibility + label of the mobile "Filters" button.
   */
  currentSidebarCategory: string | null;
  setIsFiltersDrawerOpen: (open: boolean) => void;
}

export function FilterBar({
  isDarkMode,
  viewMode, setViewMode,
  searchQuery, setSearchQuery,
  selectedCountry, setIsCountryDropdownOpen,
  setIsMobileFiltersOpen,
  activeCategory, handleCategoryChange,
  activeProductCategory, handleProductCategoryChange,
  activeServiceCategory, handleServiceCategoryChange,
  activeEventCategory, handleEventCategoryChange,
  activeCollectiveCategory, handleCollectiveCategoryChange,
  activeArtsCategory, handleArtsCategoryChange,
  currentCombinedValue,
  activeSubCategories,
  currentSidebarCategory,
  setIsFiltersDrawerOpen,
}: FilterBarProps) {
  const { t } = useT();
  // Live taxonomy from Firestore (admin can edit at /admin/categories).
  const { selectableCategories, getFlattenedSubcategories, subcategories } = useCategories();
  // True when the current category has at least one filter group. For main
  // categories the "Category" group is the subcategory list and isn't a
  // filter — exclude it. For non-main parents (Bikes & Frames, Components,
  // Accessories, etc.) every group counts as a filter, including "Category"
  // which there represents bike types / item types / etc.
  const hasFiltersForCurrent = !!(
    currentSidebarCategory &&
    (subcategories[currentSidebarCategory] || []).some((g) => {
      if (typeof g === "string") return false;
      const isMain = selectableCategories.includes(currentSidebarCategory as any);
      if (isMain && (g as any).groupName === "Category") return false;
      return true;
    })
  );
  // Top categories list for the desktop strip — "All" + the live mains.
  const CATEGORIES = useMemo<Category[]>(() => ["All", ...selectableCategories], [selectableCategories]);
  // Direct subcategory options of each main, used by the secondary filter rows.
  const PRODUCT_CATEGORIES = useMemo(() => getFlattenedSubcategories("Products"), [getFlattenedSubcategories]);
  const SERVICE_CATEGORIES = useMemo(() => getFlattenedSubcategories("SERVICES"), [getFlattenedSubcategories]);
  const EVENT_SUB_CATEGORIES = useMemo(() => getFlattenedSubcategories("Events"), [getFlattenedSubcategories]);
  const COLLECTIVE_CATEGORIES = useMemo(() => getFlattenedSubcategories("Community"), [getFlattenedSubcategories]);
  const ARTS_CATEGORIES = useMemo(() => getFlattenedSubcategories("Creative & Media"), [getFlattenedSubcategories]);

  // Categories that are currently disabled. The home calendar (CALENDAR tab in
  // Banner.tsx) is the only thing still gated — Events as a category is now
  // active everywhere else.
  const DISABLED_CATEGORIES: Category[] = [];
  const [tappedSoonCat, setTappedSoonCat] = useState<Category | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);
  const flashSoonTooltip = (cat: Category) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTappedSoonCat(cat);
    tooltipTimerRef.current = setTimeout(() => {
      setTappedSoonCat(null);
      tooltipTimerRef.current = null;
    }, 2500);
  };

  return (
    <div className={`sticky top-[66px] md:top-[82px] z-40 brutalist-border border-t-0 border-l-0 border-r-0 transition-colors duration-300 ${!isDarkMode ? "bg-black" : "bg-white"}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Categories.
              Note on overflow: keep overflow-x-auto on mobile (the row may
              scroll horizontally) but switch to visible on md+ so the EVENTS
              "Soon" tooltip — which extends ABOVE the button — isn't clipped.
              CSS forces overflow-y to auto whenever overflow-x is auto, which
              would otherwise hide the tooltip. */}
          <div className="flex items-center gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar w-full md:w-auto md:min-w-max">
            {/* Country Dropdown */}
            <button
              onClick={() => setIsCountryDropdownOpen(true)}
              className={`flex-none flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm font-bold uppercase tracking-wider px-3 md:px-4 py-2 brutalist-border brutalist-shadow transition-colors shrink-0 ${
                !isDarkMode
                  ? "bg-black text-white hover:bg-zinc-900 border-zinc-700"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
            >
              <span className="truncate hidden md:inline">{selectedCountry === "All" ? "WORLDWIDE" : selectedCountry}</span>
              <span className="md:hidden flex items-center justify-center truncate">
                {selectedCountry === "All" ? <Globe className="w-4 h-4" /> : <span className="truncate">{selectedCountry}</span>}
              </span>
              <ChevronDown className="hidden md:block w-4 h-4 shrink-0" />
            </button>

            {/* Mobile View Toggle */}
            <div className={`md:hidden flex items-center brutalist-border brutalist-shadow shrink-0 ${!isDarkMode ? "bg-black border-zinc-700" : "bg-white"}`}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${
                  viewMode === "grid"
                    ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                    : !isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
                }`}
                aria-label="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <div className={`w-px h-full ${!isDarkMode ? "bg-white" : "bg-black"}`} />
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 transition-colors ${
                  viewMode === "map"
                    ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                    : !isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
                }`}
                aria-label="Map View"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Categories Button — split into label (opens drawer) and
                icon (chevron when nothing is selected, X-to-clear when there
                is an active category). */}
            <div
              className={`md:hidden flex-1 flex items-stretch brutalist-border brutalist-shadow shrink-0 ${
                !isDarkMode ? "bg-black border-zinc-700" : "bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(true)}
                className={`flex-1 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors min-w-0 ${
                  !isDarkMode ? "text-white hover:bg-zinc-900" : "text-black hover:bg-gray-50"
                }`}
              >
                <span className="truncate">
                  {currentCombinedValue === "All" ? "CATEGORIES" : currentCombinedValue}
                </span>
              </button>
              {currentCombinedValue === "All" ? (
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  aria-label="Open categories"
                  className={`px-3 flex items-center transition-colors ${
                    !isDarkMode ? "text-white hover:bg-zinc-900" : "text-black hover:bg-gray-50"
                  }`}
                >
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCategoryChange("All")}
                  aria-label="Clear category"
                  title="Clear all categories"
                  className={`px-3 flex items-center transition-colors border-l-2 ${
                    !isDarkMode ? "text-white hover:bg-zinc-900 border-zinc-700" : "text-black hover:bg-gray-50 border-black/20"
                  }`}
                >
                  <X className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>

            {/* Mobile Filters button — visible only when the current category
                has filter groups available. Shows badge with active count. */}
            {hasFiltersForCurrent && (
              <button
                onClick={() => setIsFiltersDrawerOpen(true)}
                aria-label="Open filters"
                className={`md:hidden flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-2 brutalist-border brutalist-shadow transition-colors shrink-0 ${
                  !isDarkMode
                    ? "bg-black text-white hover:bg-zinc-900 border-zinc-700"
                    : "bg-white text-black hover:bg-gray-50"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                {activeSubCategories.length > 0 && (
                  <span className={`text-[10px] font-bold ${!isDarkMode ? "text-white" : "text-black"}`}>
                    ({activeSubCategories.length})
                  </span>
                )}
              </button>
            )}

            <div className={`hidden md:block w-px h-8 mx-2 ${!isDarkMode ? "bg-white" : "bg-black"}`} />

            {/* Desktop Categories List */}
            <div className="hidden md:flex items-center gap-2">
              {CATEGORIES.map((category) => {
                const isDisabled = DISABLED_CATEGORIES.includes(category);
                const showTooltip = isDisabled && tappedSoonCat === category;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      if (isDisabled) {
                        flashSoonTooltip(category);
                        return;
                      }
                      handleCategoryChange(category);
                    }}
                    onMouseEnter={() => {
                      if (isDisabled) {
                        if (tooltipTimerRef.current) {
                          clearTimeout(tooltipTimerRef.current);
                          tooltipTimerRef.current = null;
                        }
                        setTappedSoonCat(category);
                      }
                    }}
                    onMouseLeave={() => {
                      if (isDisabled) {
                        if (tooltipTimerRef.current) {
                          clearTimeout(tooltipTimerRef.current);
                          tooltipTimerRef.current = null;
                        }
                        setTappedSoonCat(null);
                      }
                    }}
                    aria-disabled={isDisabled}
                    className={`relative text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                      activeCategory === category && !isDisabled
                        ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                        : `text-gray-500 border border-transparent ${
                            !isDisabled
                              ? !isDarkMode
                                ? "hover:text-white hover:bg-zinc-900 hover:border-white/10"
                                : "hover:text-black hover:bg-gray-50 hover:border-black/10"
                              : ""
                          }`
                    }`}
                  >
                    <span className={isDisabled ? "opacity-50" : ""}>{category}</span>
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
                          Soon
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            {/* View Toggle */}
            <div className={`hidden md:flex items-center brutalist-border brutalist-shadow ${!isDarkMode ? "bg-black border-zinc-700" : "bg-white"}`}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 md:p-2 transition-colors ${
                  viewMode === "grid"
                    ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                    : !isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
                }`}
                aria-label="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <div className={`w-px h-full ${!isDarkMode ? "bg-white" : "bg-black"}`} />
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 md:p-2 transition-colors ${
                  viewMode === "map"
                    ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                    : !isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
                }`}
                aria-label="Map View"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center relative flex-1 md:w-64 group">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 z-10 ${!isDarkMode ? "text-gray-500 group-focus-within:text-white" : "text-gray-400 group-focus-within:text-black"}`} />
              <input
                type="text"
                placeholder={t("filter.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`relative z-10 w-full pl-9 pr-8 py-2 focus:outline-none text-xs md:text-sm font-bold transition-all duration-300 uppercase tracking-wider brutalist-border brutalist-shadow ${
                  !isDarkMode
                    ? "bg-black text-white placeholder-gray-600 border-zinc-700"
                    : "bg-white text-black placeholder-gray-400"
                }`}
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 transition-colors ${!isDarkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black"}`}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Product Categories */}
        {activeCategory === "Products" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"
            >
              {["All", ...PRODUCT_CATEGORIES].map((category) => (
                <button
                  key={category}
                  onClick={() => handleProductCategoryChange(category as Category)}
                  className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                    activeProductCategory === category || (category === "All" && activeProductCategory === null)
                      ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border border-transparent ${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}`
                  }`}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {activeCategory === "SERVICES" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"
            >
              {["All", ...SERVICE_CATEGORIES].map((category) => (
                <button
                  key={category}
                  onClick={() => handleServiceCategoryChange(category as Category)}
                  className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                    activeServiceCategory === category || (category === "All" && activeServiceCategory === null)
                      ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border border-transparent ${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}`
                  }`}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {activeCategory === "Creative & Media" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"
            >
              {["All", ...ARTS_CATEGORIES].map((category) => (
                <button
                  key={category}
                  onClick={() => handleArtsCategoryChange(category as Category)}
                  className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                    activeArtsCategory === category || (category === "All" && activeArtsCategory === null)
                      ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border border-transparent ${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}`
                  }`}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {activeCategory === "Events" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"
            >
              {["All", ...EVENT_SUB_CATEGORIES].map((category) => (
                <button
                  key={category}
                  onClick={() => handleEventCategoryChange(category as Category)}
                  className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                    activeEventCategory === category || (category === "All" && activeEventCategory === null)
                      ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border border-transparent ${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}`
                  }`}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {activeCategory === "Community" && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar min-w-max pt-2"
            >
              {["All", ...COLLECTIVE_CATEGORIES].map((category) => (
                <button
                  key={category}
                  onClick={() => handleCollectiveCategoryChange(category as Category)}
                  className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                    activeCollectiveCategory === category || (category === "All" && activeCollectiveCategory === null)
                      ? !isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border border-transparent ${!isDarkMode ? "hover:text-white hover:bg-zinc-900 hover:border-white/10" : "hover:text-black hover:bg-gray-50 hover:border-black/10"}`
                  }`}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
