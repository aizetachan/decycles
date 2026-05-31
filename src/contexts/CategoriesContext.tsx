import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  SELECTABLE_CATEGORIES as FALLBACK_SELECTABLE,
  SUBCATEGORIES as FALLBACK_SUBCATEGORIES,
  FilterItem,
  FilterGroup,
} from "../constants/categories";
import { Category, SubCategory } from "../types";

/**
 * Live taxonomy state. Categories used to live as hardcoded constants in
 * src/constants/categories.ts. They now live in Firestore at `taxonomy/main`
 * so admins can edit them from /admin/categories without a redeploy.
 *
 * The bundled constants stay as a fallback so the app renders something even
 * when Firestore is unreachable.
 */
interface CategoriesContextValue {
  loading: boolean;
  selectableCategories: Category[];
  subcategories: Record<string, FilterItem[]>;
  getFlattenedSubcategories: (category: string) => SubCategory[];
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [selectableCategories, setSelectableCategories] = useState<Category[]>(FALLBACK_SELECTABLE);
  const [subcategories, setSubcategories] = useState<Record<string, FilterItem[]>>(FALLBACK_SUBCATEGORIES);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "taxonomy", "main"),
      (snap) => {
        if (snap.exists()) {
          const data: any = snap.data();
          if (Array.isArray(data.selectableCategories)) {
            setSelectableCategories(data.selectableCategories as Category[]);
          }
          if (data.subcategories && typeof data.subcategories === "object") {
            setSubcategories(data.subcategories as Record<string, FilterItem[]>);
          }
        }
        setLoading(false);
      },
      (err) => {
        // Fall back to bundled constants — already in state.
        console.error("taxonomy listener failed:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const value = useMemo<CategoriesContextValue>(() => {
    const getFlattenedSubcategories = (category: string): SubCategory[] => {
      const items = subcategories[category];
      if (!items) return [];
      return items.flatMap((item) =>
        typeof item === "string" ? item : (item as FilterGroup).options,
      );
    };
    return { loading, selectableCategories, subcategories, getFlattenedSubcategories };
  }, [loading, selectableCategories, subcategories]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used within a CategoriesProvider");
  return ctx;
}
