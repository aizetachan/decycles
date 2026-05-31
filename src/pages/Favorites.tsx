import React, { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useT } from "../contexts/LanguageContext";
import { useCreators } from "../hooks/useCreators";
import { Header } from "../components/layout/Header";
import { CreatorGrid } from "../components/home/CreatorGrid";
import { Creator } from "../types";

export function Favorites() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { isDarkMode, openCreatorProfile } = useUI();
  const { creators, loading: creatorsLoading } = useCreators();
  const { t } = useT();

  // Match the user's favorite ids against the live creators feed. We keep the
  // user-side order so the "most recently saved" shows first if the form
  // appended to the array — but in practice favourites are a small set so
  // ordering isn't critical.
  const favourites = useMemo<Creator[]>(() => {
    if (!userProfile?.favorites?.length) return [];
    const ids: string[] = userProfile.favorites;
    const byId = new Map(creators.map((c) => [c.id, c]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Creator[];
  }, [creators, userProfile?.favorites]);

  // Page is auth-gated — unauthenticated users get bounced to the landing.
  if (!authLoading && !currentUser) {
    return <Navigate to="/welcome" replace />;
  }

  const isLoading = authLoading || creatorsLoading;
  const isEmpty = !isLoading && favourites.length === 0;

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header profileData={userProfile || {}} setSelectedCreator={(c) => openCreatorProfile(c.id)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              {t("favorites.subtitle")}
            </div>
            <h1 className="font-display tracking-wider text-4xl md:text-6xl leading-[0.95]">
              {t("favorites.title")}
              {favourites.length > 0 && (
                <span className={`ml-3 text-2xl md:text-3xl ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  {favourites.length}
                </span>
              )}
            </h1>
          </div>
          <Link
            to="/"
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-colors self-start sm:self-auto ${
              isDarkMode ? "border-white/30 hover:bg-white/10" : "border-black/30 hover:bg-black/5"
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> {t("favorites.backToExplore")}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full" />
          </div>
        ) : isEmpty ? (
          <div className={`flex flex-col items-center justify-center py-24 text-center border-2 border-dashed ${
            isDarkMode ? "border-white/20 text-gray-400" : "border-black/20 text-gray-500"
          }`}>
            <Heart className={`w-16 h-16 mb-6 ${isDarkMode ? "text-white/20" : "text-black/20"}`} />
            <h2 className={`text-xl font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>
              {t("favorites.empty.title")}
            </h2>
            <p className="text-sm font-bold uppercase tracking-wider mb-6 max-w-md">
              {t("favorites.empty.body")}
            </p>
            <Link
              to="/"
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                isDarkMode ? "bg-white text-black border-white hover:bg-zinc-200" : "bg-black text-white border-black hover:bg-zinc-800"
              }`}
            >
              {t("favorites.empty.cta")}
            </Link>
          </div>
        ) : (
          <CreatorGrid
            isDarkMode={isDarkMode}
            filteredCreators={favourites}
            setSelectedCreator={(c) => openCreatorProfile(c.id)}
          />
        )}
      </main>
    </div>
  );
}
