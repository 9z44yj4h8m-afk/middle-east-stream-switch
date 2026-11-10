/** Chat character pictures live in a private file bucket. Visitors reach them only
 *  through the allow-listed relay route, so a stored path can never point at another
 *  file or bucket, and the files themselves are not downloadable directly. */
const AVATAR_PATH = /^avatars\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i;

/** Returns the stored path unchanged when it is a safe avatar file, otherwise "". */
export function safeAvatarPath(path?: string | undefined): string {
  return path && AVATAR_PATH.test(path) ? path : "";
}

/** Public address a visitor's browser can load, or "" when the path is not a safe avatar. */
export function botAvatarUrl(path?: string | undefined): string {
  const safe = safeAvatarPath(path);
  return safe ? `/api/public/bot-avatar?path=${encodeURIComponent(safe)}` : "";
}
