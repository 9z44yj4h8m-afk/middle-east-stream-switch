import { createServerFn } from "@tanstack/react-start";
import { movies as fallback, type Movie } from "./movies";

// Official channels that upload full movies. New uploads appear automatically.
type Source = { handle: string; name: string; lang: Movie["lang"] };
const SOURCES: Source[] = [
  { handle: "RotanaStudios", name: "Rotana Studios", lang: "عربي" },
  { handle: "sobkyproductions", name: "السبكي للإنتاج الفني", lang: "عربي" },
  { handle: "MelodyAflam", name: "ميلودي أفلام", lang: "عربي" },
  { handle: "GoldenScreenEG", name: "الشاشة الذهبية", lang: "عربي" },
  { handle: "ReelMoviesMENA", name: "Reel Movies MENA", lang: "عربي" },
  { handle: "shamcinema", name: "شام سينما", lang: "عربي" },
  { handle: "ARTTVNetwork", name: "شبكة ART", lang: "عربي" },
  { handle: "LionsgateMovies", name: "Lionsgate Movies", lang: "عالمي" },
  { handle: "ShoutStudios", name: "Shout! Studios", lang: "عالمي" },
  { handle: "FilmRiseMovies", name: "FilmRise Movies", lang: "عالمي" },
  { handle: "RotanaCinema", name: "روتانا سينما", lang: "عربي" },
  { handle: "MovieCentral", name: "Movie Central", lang: "عالمي" },
  { handle: "Popcornflix", name: "Popcornflix", lang: "عالمي" },
];

let cache: { at: number; list: Movie[] } | null = null;
const TTL = 60 * 60 * 1000;

type VR = {
  videoId: string;
  title?: { runs?: { text: string }[] };
  lengthText?: { simpleText?: string };
  publishedTimeText?: { simpleText?: string };
};

function collect(o: unknown, out: VR[]) {
  if (Array.isArray(o)) o.forEach((v) => collect(v, out));
  else if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if (r['videoRenderer']) out.push(r['videoRenderer'] as VR);
    for (const v of Object.values(r)) collect(v, out);
  }
}

function seconds(t: string) {
  return t.split(":").reduce((a, p) => a * 60 + Number(p), 0);
}

async function fromChannel({ handle, name, lang }: Source): Promise<Movie[]> {
  const ar = lang === "عربي";
  const res = await fetch(
    `https://www.youtube.com/@${handle}/search?query=${encodeURIComponent(ar ? "فيلم" : "full movie")}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept-Language": ar ? "ar" : "en",
        Cookie: "SOCS=CAI; CONSENT=YES+",
      },
    },
  );
  if (!res.ok) return [];
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const found: VR[] = [];
  collect(JSON.parse(m[1]!), found);
  return found
    .filter((v) => {
      const len = v.lengthText?.simpleText ?? "";
      const title = v.title?.runs?.[0]?.text ?? "";
      if (seconds(len) < 60 * 60) return false;
      return ar ? title.includes("فيلم") : !/trailer|clip|scene/i.test(title);
    })
    .map((v) => {
      const raw = v.title?.runs?.[0]?.text ?? "";
      if (!ar) {
        const title = raw.replace(/\s*[|(\[-]?\s*(free\s+)?full\s+(movie|film)s?.*$/i, "").replace(/["“”]/g, "").trim().slice(0, 60) || raw;
        return { id: v.videoId, youtubeId: v.videoId, title, duration: v.lengthText?.simpleText ?? "", description: `فيلم عالمي كامل من ${name}.`, source: name, lang };
      }
      const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
      const title = (parts.length > 1 ? parts[1]! : raw).replace(/["“”]/g, "").slice(0, 60);
      const desc = parts.slice(2).join(" ").replace(/-?\s*Full HD/i, "").trim() || raw;
      return {
        id: v.videoId,
        youtubeId: v.videoId,
        title,
        duration: v.lengthText?.simpleText ?? "",
        description: desc,
        source: name,
        lang,
      };
    });
}

export const getFeaturedMovies = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < TTL) return cache.list;
  try {
    const lists = await Promise.all(SOURCES.map((s) => fromChannel(s).catch(() => [])));
    const merged: Movie[] = [];
    // Interleave sources, then append the hand-picked list (incl. international titles).
    const max = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) merged.push(l[i]!);
    const list = [...merged, ...fallback].filter((m, i, a) => a.findIndex((x) => x.youtubeId === m.youtubeId) === i);
    if (list.length > fallback.length) cache = { at: Date.now(), list };
    return list;
  } catch {
    return fallback;
  }
});
