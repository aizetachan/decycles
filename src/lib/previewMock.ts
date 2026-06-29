/**
 * Whether to show sample/mock feed content. True when:
 *  - the URL has ?mock=1 (local design preview), or
 *  - we're on a Firebase Hosting preview channel — its hostname contains "--"
 *    (e.g. `site--preview-hash.web.app`). The live site / custom domain has no
 *    "--", so PRODUCTION never shows mock content, even though the code ships.
 *
 * This lets the PR preview render a populated feed for the team while main/prod
 * stays clean. To drop the mock code entirely, remove it before the final merge.
 */
export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("mock") === "1") return true;
  return window.location.hostname.includes("--");
}
