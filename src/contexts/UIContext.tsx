import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type JoinModalMode = 'signup' | 'signin';
export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'decycles.theme';

interface UIContextType {
  // Derived: true when the resolved theme (after applying "system") is dark.
  // All existing consumers use this and don't care about the underlying mode.
  isDarkMode: boolean;
  // Back-compat setter — toggling it flips between explicit light/dark.
  setIsDarkMode: (val: boolean) => void;
  // The explicit user choice: 'light', 'dark', or 'system' (follow OS).
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isJoinModalOpen: boolean;
  setIsJoinModalOpen: (val: boolean) => void;
  joinModalMode: JoinModalMode;
  setJoinModalMode: (mode: JoinModalMode) => void;
  openJoinModal: (mode?: JoinModalMode) => void;
  isAboutModalOpen: boolean;
  setIsAboutModalOpen: (val: boolean) => void;
  isContactModalOpen: boolean;
  setIsContactModalOpen: (val: boolean) => void;
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (val: boolean) => void;
  isAuthSidebarOpen: boolean;
  setIsAuthSidebarOpen: (val: boolean) => void;
  // Creator profile modal — opens on top of any page when the user clicks a
  // creator card. `null` = closed. Routes that point at /creator/:id also
  // populate this state so deep links keep working.
  selectedCreatorId: string | null;
  openCreatorProfile: (id: string) => void;
  closeCreatorProfile: () => void;
  selectedPostId: string | null;
  openPost: (id: string) => void;
  closePost: () => void;
  // Event detail modal — opens on top of any page when an event chip in the
  // calendar (or anywhere) is clicked. Holds the event payload directly
  // because events live nested inside creator docs, not in a dedicated
  // collection, so we can't refetch them by id alone.
  selectedEvent: any | null;
  openEvent: (event: any) => void;
  closeEvent: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  // Theme persistence + system tracking. The user picks 'light', 'dark', or
  // 'system'; we listen for OS-level preference changes when in 'system' so
  // the page flips with the OS without a reload.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const stored = window.localStorage?.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch (e) {
      // localStorage is unavailable or throws a SecurityError (e.g. Safari Private Browsing)
    }
    return 'system';
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDarkMode = theme === 'dark' ? true : theme === 'light' ? false : systemPrefersDark;
  const setTheme = (next: Theme) => {
    setThemeState(next);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  };
  // Back-compat shim: any call site that flips `isDarkMode` switches the
  // explicit choice (never goes back to "system" via the old toggle).
  const setIsDarkMode = (val: boolean) => setTheme(val ? 'dark' : 'light');

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinModalMode, setJoinModalMode] = useState<JoinModalMode>('signup');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isAuthSidebarOpen, setIsAuthSidebarOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const openJoinModal = (mode: JoinModalMode = 'signup') => {
    setJoinModalMode(mode);
    setIsJoinModalOpen(true);
  };

  const openCreatorProfile = (id: string) => setSelectedCreatorId(id);
  const closeCreatorProfile = () => setSelectedCreatorId(null);
  const openPost = (id: string) => setSelectedPostId(id);
  const closePost = () => setSelectedPostId(null);

  const openEvent = (event: any) => setSelectedEvent(event);
  const closeEvent = () => setSelectedEvent(null);

  // Mirror isDarkMode to a `.dark` class on the <body>. The CSS rules in
  // index.css (body / body.dark) set the document background, scrollbar
  // colors, brutalist borders, etc. — without this sync the body would
  // stay on its light default and reveal a white strip under the content
  // on overscroll / scroll past the min-height container.
  useEffect(() => {
    const body = document.body;
    if (isDarkMode) {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <UIContext.Provider
      value={{
        isDarkMode,
        setIsDarkMode,
        theme,
        setTheme,
        isJoinModalOpen,
        setIsJoinModalOpen,
        joinModalMode,
        setJoinModalMode,
        openJoinModal,
        isAboutModalOpen,
        setIsAboutModalOpen,
        isContactModalOpen,
        setIsContactModalOpen,
        isSupportModalOpen,
        setIsSupportModalOpen,
        isAuthSidebarOpen,
        setIsAuthSidebarOpen,
        selectedCreatorId,
        openCreatorProfile,
        closeCreatorProfile,
        selectedPostId,
        openPost,
        closePost,
        selectedEvent,
        openEvent,
        closeEvent,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
