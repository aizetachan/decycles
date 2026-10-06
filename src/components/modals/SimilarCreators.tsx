import React, { useMemo } from "react";
import { Creator } from "../../types";
import { useCreators } from "../../hooks/useCreators";
import { CREATOR_DEFAULT_AVATAR } from "../../lib/defaultAvatars";
import { trackEvent } from "../../lib/analytics";

const MAX_SUGGESTIONS = 6;

const norm = (s?: string) => (s || "").trim().toLowerCase();

function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Stable pseudo-random tie-break per (creator, candidate) pair. */
function tieBreak(seed: string, id: string): number {
  let h = 2166136261;
  for (const ch of `${seed}:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Similarity score — what makes two creators "alike" in this directory:
 * shared subcategories weigh most, then main categories, then place
 * (same city > same country) and physical proximity. 0 = unrelated.
 */
function similarity(a: Creator, b: Creator): number {
  let score = 0;
  const subs = new Set((a.subCategories || []).map((s) => norm(String(s))));
  (b.subCategories || []).forEach((s) => subs.has(norm(String(s))) && (score += 3));
  const cats = new Set((a.categories || []).map((c) => norm(String(c))));
  (b.categories || []).forEach((c) => cats.has(norm(String(c))) && (score += 2));
  if (norm(a.location) && norm(a.location) === norm(b.location)) score += 2;
  else if (norm(a.country) && norm(a.country) !== "worldwide" && norm(a.country) === norm(b.country)) score += 1;
  if (a.coordinates && b.coordinates) {
    const km = distanceKm(a.coordinates, b.coordinates);
    if (km < 50) score += 2;
    else if (km < 300) score += 1;
  }
  return score;
}

interface SimilarCreatorsProps {
  creator: Creator;
  isDarkMode: boolean;
  onOpen: (id: string) => void;
}

/**
 * "Similar creators" row at the end of a creator profile — keeps visitors
 * moving through the directory. Computed client-side from the live creators
 * list (same Firestore subscription the home page uses).
 */
export function SimilarCreators({ creator, isDarkMode, onOpen }: SimilarCreatorsProps) {
  const { creators } = useCreators();

  const suggestions = useMemo(() => {
    return creators
      .filter((c) => c.id !== creator.id && c.isPublished !== false && c.coverImage)
      .map((c) => ({ c, score: similarity(creator, c) }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || tieBreak(creator.id, x.c.id) - tieBreak(creator.id, y.c.id))
      .slice(0, MAX_SUGGESTIONS)
      .map((x) => x.c);
  }, [creators, creator]);

  if (suggestions.length === 0) return null;

  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <section className={`w-full p-6 md:p-8 border-t-2 ${isDarkMode ? "border-white/15" : "border-black/15"}`}>
      <h3 className="font-display uppercase tracking-wider text-2xl md:text-3xl mb-4 md:mb-6">Similar creators</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {suggestions.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              trackEvent("click_similar_creator", { from_creator: creator.name, to_creator: c.name });
              onOpen(c.id);
            }}
            className={`group flex flex-col text-left brutalist-border overflow-hidden transition-colors ${
              isDarkMode ? "bg-zinc-900 hover:bg-zinc-800" : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <div className={`aspect-[4/3] w-full overflow-hidden ${isDarkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
              <img
                src={c.coverImage}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex items-center gap-2 p-2 md:p-3 min-w-0">
              <img
                src={c.profileImage || CREATOR_DEFAULT_AVATAR}
                alt=""
                className={`w-6 h-6 md:w-7 md:h-7 shrink-0 rounded-full object-cover border ${isDarkMode ? "border-white/20" : "border-black/20"}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <div className="font-display uppercase tracking-wide text-sm md:text-base leading-tight truncate">{c.name}</div>
                {c.location && (
                  <div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest truncate ${muted}`}>{c.location}</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
