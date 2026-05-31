/**
 * Default avatars served from /public-equivalent (publicDir is `assets/`).
 *
 * Files live at:
 *   assets/avatars/users/avatar01.png ... avatar06.png   (random user defaults)
 *   assets/avatars/avatar-creator.png                    (fixed shop default)
 *
 * Adding a new user avatar = drop a `avatar07.png` (etc.) into the folder
 * and bump USER_AVATAR_COUNT below.
 */

const USER_AVATAR_COUNT = 6;

const userAvatarPath = (n: number): string =>
  `/avatars/users/avatar${String(n).padStart(2, "0")}.png`;

/**
 * Returns the URL of a random user-default avatar. Used when signing up
 * via email/password (no Google photo) or when the user clears their avatar.
 */
export function randomUserAvatar(): string {
  const n = Math.floor(Math.random() * USER_AVATAR_COUNT) + 1;
  return userAvatarPath(n);
}

/**
 * Default shop profile image applied when a creator account is first created
 * and they haven't uploaded their own logo yet.
 */
export const CREATOR_DEFAULT_AVATAR = "/avatars/avatar-creator.png";

/**
 * Default shop cover. Lives at assets/cover-creator/cover-creator.png and is
 * served at the root URL because publicDir is `assets/`. Applied automatically
 * to any shop without an uploaded cover, so home cards and profile pages always
 * have something to render.
 */
export const CREATOR_DEFAULT_COVER = "/cover-creator/cover-creator.png";

/**
 * True if the URL points to one of the bundled default avatars. Useful when
 * deciding whether the user has a "real" image yet, e.g. for publish gating.
 */
export function isDefaultAvatar(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("/avatars/");
}

/**
 * True if the URL points to the bundled default shop cover. Used to decide
 * whether to offer a "Delete" action in the cover preview modal — there is
 * nothing meaningful to delete when the cover is already the default.
 */
export function isDefaultCover(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("/cover-creator/");
}
