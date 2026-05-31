import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { SubCategory } from "../../types";
import { useCategories } from "../../contexts/CategoriesContext";

// Re-exports kept for backward compat with existing imports across the app.
// The live data comes from useCategories(); these are the static fallbacks.
export {
  SUBCATEGORIES,
  getFlattenedSubcategories,
  type FilterGroup,
  type FilterItem,
} from "../../constants/categories";

interface SubcategoryFilterProps {
  isDarkMode: boolean;
  currentSidebarCategory: string | null;
  activeSubCategories: SubCategory[];
  setActiveSubCategories: React.Dispatch<React.SetStateAction<SubCategory[]>>;
}

export function SubcategoryFilter({
  isDarkMode,
  currentSidebarCategory,
  activeSubCategories,
  setActiveSubCategories
}: SubcategoryFilterProps) {
  const { subcategories } = useCategories();
  if (!currentSidebarCategory || !subcategories[currentSidebarCategory]) return null;

  return (
    <aside className="hidden md:block w-48 shrink-0 sticky top-48">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col gap-1.5"
        >
          <h3 className={`text-xs font-light uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Filter by {currentSidebarCategory}
          </h3>
          <button
            onClick={() => setActiveSubCategories([])}
            className={`text-left text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-300 ${
              activeSubCategories.length === 0
                ? isDarkMode ? "bg-white text-black brutalist-border brutalist-shadow" : "bg-black text-white brutalist-border brutalist-shadow"
                : `text-gray-500 brutalist-border ${isDarkMode ? "hover:text-white" : "hover:text-black"}`
            }`}
          >
            ALL {currentSidebarCategory}
          </button>
          {subcategories[currentSidebarCategory].map((item, idx) => {
            if (typeof item === 'string') {
              const sub = item;
              return (
                <button
                  key={sub}
                  onClick={() => {
                    setActiveSubCategories(prev => 
                      prev.includes(sub) 
                        ? prev.filter(s => s !== sub)
                        : [...prev, sub]
                    );
                  }}
                  className={`text-left text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-300 ${
                    activeSubCategories.includes(sub)
                      ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                      : `text-gray-500 border ${isDarkMode ? "border-white/10 hover:text-white" : "border-black/10 hover:text-black"}`
                  }`}
                >
                  {sub}
                </button>
              );
            } else {
              return (
                <div key={item.groupName} className="mt-3 first:mt-0">
                  <h4 className={`text-[10px] font-light uppercase tracking-widest mb-1.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {item.groupName}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {item.options.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => {
                          setActiveSubCategories(prev => 
                            prev.includes(sub) 
                              ? prev.filter(s => s !== sub)
                              : [...prev, sub]
                          );
                        }}
                        className={`text-left text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-300 ${
                          activeSubCategories.includes(sub)
                            ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                            : `text-gray-500 border ${isDarkMode ? "border-white/10 hover:text-white" : "border-black/10 hover:text-black"}`
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
          })}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
