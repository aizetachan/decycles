import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "../i18n/en";
import { es } from "../i18n/es";

export type Lang = "en" | "es";

const DICTS: Record<Lang, Record<string, string>> = { en, es };
const STORAGE_KEY = "decycles.lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const detectInitialLang = (): Lang => {
  // English by default. The toggle is currently disabled in the UI, so we
  // ignore any previously-stored or browser-detected preference and always
  // start in English until ES is re-enabled.
  return "en";
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (privacy mode) — silent.
    }
  };

  // Reflect the active language onto <html lang="..."> so screen readers and
  // browser translation prompts behave correctly.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = DICTS[lang] || DICTS.en;
    return {
      lang,
      setLang,
      // Look up `key`. Fall back to English dictionary, then to the literal
      // key (or provided fallback). Keeps things working when a key hasn't
      // been translated yet.
      t: (key, fallback) => dict[key] ?? DICTS.en[key] ?? fallback ?? key,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
