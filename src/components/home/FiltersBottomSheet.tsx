import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { SubCategory } from "../../types";
import { useCategories } from "../../contexts/CategoriesContext";
import { FilterGroup } from "../../constants/categories";

interface FiltersBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  /**
   * Parent whose filter groups we're showing — typically the deepest active
   * subcategory the user is browsing (Bikes & Frames, Components, etc.).
   */
  parent: string | null;
  activeSubCategories: SubCategory[];
  setActiveSubCategories: React.Dispatch<React.SetStateAction<SubCategory[]>>;
}

/**
 * Mobile-only bottom sheet for filters.
 *
 * Slides up from the bottom and lets the visitor narrow results down by the
 * filter groups attached to the currently active subcategory (e.g. Build,
 * Material, Wheels for "Bikes & Frames"). Multi-select inside each group;
 * "Clear all" wipes selections, "Apply" just dismisses the sheet (state is
 * already live so the grid updates as the user toggles chips).
 *
 * Desktop uses the SubcategoryFilter sidebar instead — this drawer is hidden
 * for md+ at the call site.
 */
export function FiltersBottomSheet({
  isOpen,
  onClose,
  isDarkMode,
  parent,
  activeSubCategories,
  setActiveSubCategories,
}: FiltersBottomSheetProps) {
  const { subcategories, selectableCategories } = useCategories();
  const groups = parent ? (subcategories[parent] || []) : [];
  // Filter groups = anything that's not the special "Category" group on a
  // main category. For non-main parents (Bikes & Frames, etc.) the
  // "Category" group is a real filter (bike types, etc.) and gets shown.
  const isMainParent = !!(parent && selectableCategories.includes(parent as any));
  const filterGroups: FilterGroup[] = groups.filter((g): g is FilterGroup => {
    if (typeof g === "string") return false;
    const fg = g as FilterGroup;
    if (isMainParent && fg.groupName === "Category") return false;
    return true;
  });

  const toggle = (sub: string) => {
    setActiveSubCategories((prev) =>
      prev.includes(sub as SubCategory)
        ? prev.filter((s) => s !== sub)
        : [...prev, sub as SubCategory],
    );
  };
  const clearAll = () => setActiveSubCategories([]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className={`fixed inset-x-0 bottom-0 z-[101] md:hidden flex flex-col max-h-[85vh] brutalist-border ${
              isDarkMode ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  Filters
                  {parent && (
                    <span className={`ml-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      · {parent}
                    </span>
                  )}
                </h3>
                {activeSubCategories.length > 0 && (
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {activeSubCategories.length} active
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`p-2 transition-colors ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable accordion-like list of filter groups. */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {filterGroups.length === 0 ? (
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {parent
                    ? `No filters available for ${parent} yet.`
                    : "Pick a subcategory first to see its filters."}
                </p>
              ) : (
                filterGroups.map((g) => (
                  <div key={g.groupName}>
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {g.groupName}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {g.options.map((opt) => {
                        const optStr = String(opt);
                        const isActive = activeSubCategories.includes(optStr as SubCategory);
                        return (
                          <button
                            key={optStr}
                            type="button"
                            onClick={() => toggle(optStr)}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                              isActive
                                ? isDarkMode
                                  ? "bg-white text-black border-white"
                                  : "bg-black text-white border-black"
                                : isDarkMode
                                ? "bg-black text-gray-300 border-white/20 hover:border-white"
                                : "bg-white text-gray-700 border-black/20 hover:border-black"
                            }`}
                          >
                            {optStr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer — Clear / Apply. Apply just dismisses since state is live. */}
            <div className={`flex gap-2 p-3 border-t-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
              <button
                type="button"
                onClick={clearAll}
                disabled={activeSubCategories.length === 0}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 transition-colors disabled:opacity-50 ${
                  isDarkMode ? "border-white/30 text-white hover:bg-white/10" : "border-black/30 text-black hover:bg-black/5"
                }`}
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest brutalist-border brutalist-shadow transition-colors ${
                  isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
