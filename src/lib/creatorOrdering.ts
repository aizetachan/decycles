/**
 * Ordering for the home gallery's creator grid.
 *
 * Default behaviour: a per-load random shuffle, so the same creators don't
 * always sit at the top of the gallery. The shuffle is *deterministic for a
 * given seed* — the caller generates one fresh seed per page load, so the order
 * stays stable across re-renders and live (onSnapshot) data updates within a
 * session, and only a new page load reshuffles. This avoids cards jumping around
 * every time any creator doc changes.
 *
 * Designed to be configured later without touching call sites:
 *   - `pinnedIds`: creators forced to the front, in that exact order (e.g.
 *     featured/sponsored shops that should appear in the first positions).
 *   - `mode`: ordering strategy for the non-pinned creators. Today "random"
 *     (default) or "default" (keep input order); future strategies (curated,
 *     newest, most-active, …) slot in here without changing the home page.
 */

export type CreatorOrderMode = "random" | "default";

export interface CreatorOrderConfig {
  /** How non-pinned creators are ordered. Defaults to "random". */
  mode?: CreatorOrderMode;
  /** Creators forced to the front, in this exact order (e.g. featured). */
  pinnedIds?: string[];
  /** Stable seed for the random shuffle — generate one per page load. */
  seed?: number;
}

/**
 * xmur3 string hash → unsigned 32-bit int. We rank each creator by
 * hash(seed + id): deterministic for a given (seed, id) pair, so the resulting
 * order is independent of the input array order and identical across re-renders
 * for the same seed. A new seed yields a fresh, well-distributed shuffle.
 */
function hashKey(seed: number, id: string): number {
  const s = `${seed}:${id}`;
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Returns a new array of creators ordered per `config`. Pinned creators come
 * first (in `pinnedIds` order, skipping any not present), followed by the rest
 * ordered by `mode`. Never mutates the input.
 */
export function orderCreators<T extends { id: string }>(
  creators: T[],
  config: CreatorOrderConfig = {},
): T[] {
  const { mode = "random", pinnedIds = [], seed = 0 } = config;

  const pinnedSet = new Set(pinnedIds);
  const pinned = pinnedIds
    .map((id) => creators.find((c) => c.id === id))
    .filter((c): c is T => Boolean(c));
  const rest = creators.filter((c) => !pinnedSet.has(c.id));

  const ordered =
    mode === "random"
      ? [...rest].sort((a, b) => hashKey(seed, a.id) - hashKey(seed, b.id))
      : rest;

  return [...pinned, ...ordered];
}
