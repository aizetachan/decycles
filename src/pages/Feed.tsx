import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "../components/layout/Header";
import { BANNER_IMAGES } from "../components/home/Banner";
import { PostCard } from "../components/feed/PostCard";
import { PostComposer } from "../components/feed/PostComposer";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";
import { useFeed } from "../hooks/useFeed";

type FeedTab = "ALL" | "SHOPS" | "PEOPLE";

export function Feed() {
  const { isDarkMode, openCreatorProfile, openJoinModal } = useUI();
  const { currentUser, userProfile } = useAuth();
  const { feed, loading, followsNobody } = useFeed();
  const [tab, setTab] = useState<FeedTab>("ALL");

  const filtered = feed.filter((p) =>
    tab === "ALL" ? true : tab === "SHOPS" ? p.authorType === "creator" : p.authorType === "user",
  );

  const wrap = isDarkMode ? "bg-black text-white" : "bg-white text-black";
  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-h-screen ${wrap}`}>
      <Header profileData={userProfile || {}} setSelectedCreator={(c: any) => openCreatorProfile(c.id)} />

      {/* Hero — same brand language, shorter than the directory's. Scrolls away
          naturally (no height animation → no image distortion). */}
      <div className="relative w-full h-[240px] overflow-hidden bg-black">
        <img
          src={BANNER_IMAGES[0]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="font-display uppercase tracking-widest text-white text-5xl md:text-6xl drop-shadow-lg">
            Feed
          </h1>
        </div>
      </div>

      {/* Feed menu — sticks just below the global header once the hero scrolls off. */}
      <div className={`sticky top-16 md:top-20 z-40 brutalist-border border-t-0 border-l-0 border-r-0 ${wrap}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          {(["ALL", "SHOPS", "PEOPLE"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest brutalist-border transition-colors ${
                tab === t
                  ? isDarkMode
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : "bg-transparent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {currentUser && <PostComposer isDarkMode={isDarkMode} />}

        {!currentUser ? (
          <div className={`brutalist-border p-8 text-center ${muted}`}>
            <p className="text-sm font-bold uppercase tracking-widest">Sign in to see your feed</p>
            <button
              onClick={() => openJoinModal("signup")}
              className={`mt-4 px-5 py-2 text-xs font-bold uppercase tracking-widest brutalist-border ${
                isDarkMode ? "bg-white text-black" : "bg-black text-white"
              }`}
            >
              Join
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className={`w-6 h-6 animate-spin ${muted}`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`brutalist-border p-8 text-center ${muted}`}>
            <p className="text-sm font-bold uppercase tracking-widest">
              {followsNobody ? "Build your feed" : "No posts yet"}
            </p>
            <p className="mt-2 text-xs">
              {followsNobody
                ? "Follow shops and people to see their updates here."
                : "The shops and people you follow haven't posted yet."}
            </p>
          </div>
        ) : (
          filtered.map((p) => <PostCard key={p.id} post={p} isDarkMode={isDarkMode} />)
        )}
      </div>
    </div>
  );
}
