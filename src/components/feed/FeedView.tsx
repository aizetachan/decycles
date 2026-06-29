import { useState, useRef, useEffect } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostComposer } from "./PostComposer";
import { useUI } from "../../contexts/UIContext";
import { useAuth } from "../../contexts/AuthContext";
import { useFeed } from "../../hooks/useFeed";
import { MOCK_POSTS } from "./mockPosts";
import { isMockMode } from "../../lib/previewMock";

type FeedFilter = "ALL" | "SHOPS" | "PEOPLE";

/**
 * The feed itself — rendered inline as a home tab (under the shared Banner
 * hero), like GALLERY / EVENTS. A sticky sub-menu (All/Shops/People) pins below
 * the global header once the hero scrolls away.
 */
export function FeedView({ isDarkMode }: { isDarkMode: boolean }) {
  const { openJoinModal } = useUI();
  const { currentUser } = useAuth();
  const { feed, loading, followsNobody } = useFeed();
  const [filter, setFilter] = useState<FeedFilter>("ALL");

  // Feed-only FAB: appears after scrolling down, jumps back up to the composer.
  const composerRef = useRef<HTMLDivElement>(null);
  const [showFab, setShowFab] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollToComposer = () =>
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // Sample posts on ?mock=1 or on a preview channel (never in prod). See isMockMode.
  const mock = isMockMode();
  const source = mock ? MOCK_POSTS : feed;

  const filtered = source.filter((p) =>
    filter === "ALL" ? true : filter === "SHOPS" ? p.authorType === "creator" : p.authorType === "user",
  );

  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className="w-full">
      {/* Feed sub-menu — same language as the EXPLORE FilterBar: full-width bar
          with an inverted background, sticking below the global header once the
          hero scrolls off. Active item is a solid box; the rest are text links. */}
      <div
        className={`sticky top-[66px] md:top-[82px] z-40 brutalist-border border-t-0 border-l-0 border-r-0 transition-colors duration-300 ${
          !isDarkMode ? "bg-black" : "bg-white"
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-2">
          {(["ALL", "SHOPS", "PEOPLE"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 transition-all duration-300 ${
                filter === f
                  ? !isDarkMode
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : `text-gray-500 ${!isDarkMode ? "hover:text-white hover:bg-zinc-900" : "hover:text-black hover:bg-gray-50"}`
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div ref={composerRef} className="scroll-mt-28">
          {currentUser && <PostComposer isDarkMode={isDarkMode} />}
        </div>

        {mock ? (
          filtered.map((p) => <PostCard key={p.id} post={p} isDarkMode={isDarkMode} />)
        ) : !currentUser ? (
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

      {showFab && (
        <button
          type="button"
          onClick={scrollToComposer}
          aria-label="New post"
          title="New post"
          className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center brutalist-border brutalist-shadow transition-colors ${
            isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
