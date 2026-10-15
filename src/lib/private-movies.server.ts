import type { Movie } from "./movies";

// PIN-protected movies. Kept server-only so they never ship to visitors without the PIN.
export const PRIVATE_PIN = "0550";

export const privateMovies: Movie[] = [
  // Add private movies here, e.g.:
  // { id: "p-xxx", youtubeId: "VIDEO_ID", title: "...", duration: "فيلم كامل", description: "...", source: "...", lang: "عربي" },
];
