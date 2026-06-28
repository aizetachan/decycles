import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, Sun, Moon, Monitor, User, UserCircle, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useT } from '../../contexts/LanguageContext';
import { Creator } from '../../types';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  profileData: any;
  setSelectedCreator: (creator: Creator) => void;
}

export const Header: React.FC<HeaderProps> = ({ profileData, setSelectedCreator }) => {
  const {
    isDarkMode, setIsDarkMode,
    theme, setTheme,
    openJoinModal,
    setIsAboutModalOpen,
    setIsContactModalOpen,
  } = useUI();

  const { currentUser: loggedInUser, userProfile: profileDataRemote, logout, loading: authLoading } = useAuth();
  const { t, lang, setLang } = useT();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Refs to each dropdown's wrapper (trigger + panel). Clicking outside any
  // open dropdown closes it. Refs include the trigger button so re-clicking
  // it correctly toggles (the trigger's onClick still wins the race).
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  // Mobile trigger lives in the header row but the panel renders as a sibling
  // below — they're not in a shared wrapper, so we ref the trigger too and
  // treat clicks on it as "inside" to avoid the open/close race.
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);
  const authDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDesktopMenuOpen && !isMobileMenuOpen && !isProfileDropdownOpen && !isAuthDropdownOpen) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isDesktopMenuOpen && desktopMenuRef.current && !desktopMenuRef.current.contains(target)) {
        setIsDesktopMenuOpen(false);
      }
      if (isMobileMenuOpen
          && mobileMenuRef.current && !mobileMenuRef.current.contains(target)
          && mobileTriggerRef.current && !mobileTriggerRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
      if (isProfileDropdownOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileDropdownOpen(false);
      }
      if (isAuthDropdownOpen && authDropdownRef.current && !authDropdownRef.current.contains(target)) {
        setIsAuthDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllPopovers();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktopMenuOpen, isMobileMenuOpen, isProfileDropdownOpen, isAuthDropdownOpen]);

  const closeAllPopovers = () => {
    setIsProfileDropdownOpen(false);
    setIsAuthDropdownOpen(false);
    setIsDesktopMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Display short name: "First L." so two-line surnames don't overflow the
  // header row. Falls back to the raw name when there's no last-name token.
  const shortDisplayName = (() => {
    const raw = (profileData?.name || "User").trim();
    const parts = raw.split(/\s+/);
    if (parts.length < 2) return raw;
    return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
  })();

  return (
    <header className={`sticky top-0 z-50 brutalist-border border-t-0 border-l-0 border-r-0 transition-colors duration-300 ${isDarkMode ? "bg-black" : "bg-white"}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className={`text-2xl sm:text-3xl md:text-4xl font-display tracking-wider transition-colors duration-300 ${isDarkMode ? "text-white" : "text-black"}`}>
              DECYCLES.CC
            </span>
          </Link>
          <div className={`hidden lg:block h-8 w-px transition-colors duration-300 ${isDarkMode ? "bg-white/20" : "bg-black/20"}`}></div>
          <span className="hidden lg:block text-sm font-bold uppercase tracking-widest text-gray-500">
            Discover cycling culture worldwide
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end relative">
          {/* Auth-loading skeleton: the avatar slot stays in place with a
              spinning ring around the white UserCircle while we resolve
              whether the user is signed in. Prevents the "Join DECYCLES.CC"
              CTA from flashing for a returning logged-in user. */}
          {authLoading && (
            <div className="relative w-10 h-10 flex items-center justify-center" aria-label="Loading account">
              <UserCircle className={`w-6 h-6 ${isDarkMode ? "text-white" : "text-black"} opacity-60`} />
              <span className={`absolute inset-0 rounded-full border-2 border-transparent animate-spin ${
                isDarkMode ? "border-t-white" : "border-t-black"
              }`} />
            </div>
          )}

          {!authLoading && loggedInUser && (
            <span className={`hidden md:block text-sm font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>
              {shortDisplayName}
            </span>
          )}
          {!authLoading && !loggedInUser && (
            <button
              onClick={() => openJoinModal('signup')}
              className={`hidden md:block text-xs md:text-sm font-bold uppercase tracking-widest px-3 md:px-4 py-1.5 md:py-2 brutalist-border brutalist-shadow transition-colors ${
                isDarkMode
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "bg-black text-white hover:bg-zinc-800"
              }`}
            >
              <span className="hidden md:inline">{t("header.join")}</span>
              <span className="md:hidden">{t("header.join.short")}</span>
            </button>
          )}

          {/* Auth dropdown — visible on ALL sizes when not logged in */}
          {!authLoading && !loggedInUser && (
            <div className="relative" ref={authDropdownRef}>
              <button
                onClick={() => {
                  setIsAuthDropdownOpen(!isAuthDropdownOpen);
                  setIsDesktopMenuOpen(false);
                  setIsProfileDropdownOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2 transition-colors ${isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600"}`}
                aria-label="Account"
              >
                <UserCircle className="w-6 h-6" />
              </button>

              <AnimatePresence>
                {isAuthDropdownOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`absolute top-full right-0 mt-2 w-56 brutalist-border overflow-hidden z-50 ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}
                  >
                    <div className={`px-6 py-6 flex flex-col gap-4 ${isDarkMode ? "bg-black" : "bg-white"}`}>
                      <button
                        onClick={() => {
                          setIsAuthDropdownOpen(false);
                          openJoinModal('signin');
                        }}
                        className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center gap-2"
                      >
                        <LogIn className="w-4 h-4" /> {t("header.login")}
                      </button>
                      <button
                        onClick={() => {
                          setIsAuthDropdownOpen(false);
                          openJoinModal('signup');
                        }}
                        className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" /> {t("header.signup")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Profile dropdown — visible on ALL sizes when logged in */}
          {!authLoading && loggedInUser && (
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  setIsDesktopMenuOpen(false);
                  setIsAuthDropdownOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2 transition-colors ${isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600"}`}
                aria-label="Profile"
              >
                {profileDataRemote?.profileImage ? (
                  <img src={profileDataRemote.profileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle className={`w-6 h-6 ${isDarkMode ? "text-white" : "text-black"}`} />
                )}
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`absolute top-full right-0 mt-2 w-56 brutalist-border overflow-hidden z-50 ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}
                  >
                    <div className={`px-6 py-6 flex flex-col gap-4 ${isDarkMode ? "bg-black" : "bg-white"}`}>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          navigate('/profile/edit');
                        }}
                        className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                      >
                        {t("header.viewProfile")}
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          navigate('/?tab=feed');
                        }}
                        className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                      >
                        Feed
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          navigate('/my-events');
                        }}
                        className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                      >
                        {t("header.events")}
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          navigate('/favorites');
                        }}
                        className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                      >
                        {t("header.favorites")}
                      </button>
                      {profileDataRemote?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            navigate('/admin');
                          }}
                          className={`text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                        >
                          {t("header.adminPanel")}
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setIsProfileDropdownOpen(false);
                          await logout();
                          // Always land on the explorer after logout so no
                          // protected/owner page sticks around with stale UI.
                          navigate('/');
                        }}
                        className={`text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                      >
                        {t("header.logout")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Desktop "burger" menu — site links only. Language and theme
              selectors live inside this menu now, freeing space in the
              main header row. */}
          <div className="relative hidden md:block" ref={desktopMenuRef}>
            <button
              className={`p-2 transition-colors ${isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600"}`}
              onClick={() => {
                setIsDesktopMenuOpen(!isDesktopMenuOpen);
                setIsAuthDropdownOpen(false);
                setIsProfileDropdownOpen(false);
              }}
            >
              {isDesktopMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <AnimatePresence>
              {isDesktopMenuOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`absolute top-full right-0 mt-2 w-56 brutalist-border overflow-hidden z-50 ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}
                >
                  <div className={`px-6 py-6 flex flex-col gap-4 ${isDarkMode ? "bg-black" : "bg-white"}`}>
                    {/* Theme selector — icon-only 3-way group. Persisted to
                        localStorage; "System" follows the OS preference live. */}
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        Theme
                      </div>
                      <div className={`grid grid-cols-3 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                        {([
                          { value: "light" as const, label: "Light", Icon: Sun },
                          { value: "dark" as const, label: "Dark", Icon: Moon },
                          { value: "system" as const, label: "System", Icon: Monitor },
                        ]).map(({ value, label, Icon }) => {
                          const active = theme === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setTheme(value)}
                              title={label}
                              aria-label={label}
                              className={`flex items-center justify-center py-2.5 transition-colors ${
                                active
                                  ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                                  : isDarkMode ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-black/5"
                              }`}
                              aria-pressed={active}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Language selector — disabled while ES is incomplete. */}
                    <div className={`pb-4 border-b-2 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        Language
                      </div>
                      <div className={`grid grid-cols-2 border-2 opacity-50 cursor-not-allowed ${isDarkMode ? "border-white/20" : "border-black/20"}`} aria-disabled>
                        {(["en", "es"] as const).map((code) => {
                          const active = lang === code;
                          return (
                            <span
                              key={code}
                              className={`py-2 text-[10px] font-bold uppercase tracking-widest text-center select-none ${
                                active
                                  ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                                  : isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                              title="Spanish coming soon"
                            >
                              {code.toUpperCase()}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsDesktopMenuOpen(false);
                        setIsAboutModalOpen(true);
                      }}
                      className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                      {t("header.about")}
                    </button>
                    <button
                      onClick={() => {
                        setIsDesktopMenuOpen(false);
                        setIsContactModalOpen(true);
                      }}
                      className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                      {t("header.contact")}
                    </button>
                    <a href="https://www.instagram.com/decycles.cc/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">
                      {t("header.follow")}
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile burger — site links only (auth/profile is in the avatar dropdown) */}
          <button
            ref={mobileTriggerRef}
            className={`md:hidden p-2 transition-colors ${isDarkMode ? "text-white" : "text-black"}`}
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsAuthDropdownOpen(false);
              setIsProfileDropdownOpen(false);
            }}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu — site links only */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`md:hidden border-t overflow-hidden ${isDarkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}
          >
            <div className={`px-4 py-6 space-y-4 ${isDarkMode ? "bg-black" : "bg-white"}`}>
              {/* Theme selector — icon-only group. */}
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Theme
                </div>
                <div className={`grid grid-cols-3 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                  {([
                    { value: "light" as const, label: "Light", Icon: Sun },
                    { value: "dark" as const, label: "Dark", Icon: Moon },
                    { value: "system" as const, label: "System", Icon: Monitor },
                  ]).map(({ value, label, Icon }) => {
                    const active = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        title={label}
                        aria-label={label}
                        className={`flex items-center justify-center py-2.5 transition-colors ${
                          active
                            ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                            : isDarkMode ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-black/5"
                        }`}
                        aria-pressed={active}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language selector — disabled (Spanish coming soon). */}
              <div className={`pb-4 border-b-2 ${isDarkMode ? "border-white/10" : "border-black/10"}`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Language
                </div>
                <div className={`grid grid-cols-2 border-2 opacity-50 cursor-not-allowed ${isDarkMode ? "border-white/20" : "border-black/20"}`} aria-disabled>
                  {(["en", "es"] as const).map((code) => {
                    const active = lang === code;
                    return (
                      <span
                        key={code}
                        className={`py-2 text-[10px] font-bold uppercase tracking-widest text-center select-none ${
                          active
                            ? isDarkMode ? "bg-white text-black" : "bg-black text-white"
                            : isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                        title="Spanish coming soon"
                      >
                        {code.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Discover cycling culture worldwide
              </span>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsAboutModalOpen(true);
                  }}
                  className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                >
                  About
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsContactModalOpen(true);
                  }}
                  className="text-left text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                >
                  Contact
                </button>
                <a href="https://www.instagram.com/decycles.cc/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">
                  Follow us
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
