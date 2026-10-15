import liveImage from "@/assets/section-live.jpg";
import moviesImage from "@/assets/section-movies.jpg";
import seriesImage from "@/assets/section-series.jpg";
import memberImage from "@/assets/section-private.jpg";
import bedouinImage from "@/assets/bedouin-drama-banner.jpg";
import arabicMovies from "@/assets/home-categories/arabic-movies.png.asset.json";
import foreignMovies from "@/assets/home-categories/foreign-movies.png.asset.json";
import news from "@/assets/home-categories/news.png.asset.json";
import islamic from "@/assets/home-categories/islamic.png.asset.json";
import kids from "@/assets/home-categories/kids.png.asset.json";
import sports from "@/assets/home-categories/sports.png.asset.json";
import general from "@/assets/home-categories/general.png.asset.json";

export const homeCategoryCards = [
  { id: "arabic-movies", title: "الأفلام العربية", image: arabicMovies.url, link: "/movies?lang=عربي" },
  { id: "foreign-movies", title: "الأفلام الأجنبية", image: foreignMovies.url, link: "/movies?lang=عالمي" },
  { id: "news", title: "القنوات الإخبارية", image: news.url, link: "/channels/news" },
  { id: "islamic", title: "القنوات الإسلامية", image: islamic.url, link: "/channels/islamic" },
  { id: "kids", title: "قنوات الأطفال والوثائقية", image: kids.url, link: "/channels/kids" },
  { id: "sports", title: "القنوات الرياضية", image: sports.url, link: "/channels/sports" },
  { id: "general", title: "القنوات العامة", image: general.url, link: "/channels/general" },
];

export const sectionDestinations = [
  ...homeCategoryCards.map((c) => ({ value: c.link, label: c.title })),
  { value: "/chat", label: "الشات الكتابي" },
  { value: "/voice-chat", label: "الشات الصوتي" },
  { value: "/bedouin-drama", label: "البدوية دراما" },
  { value: "/live", label: "البث المباشر" },
  { value: "/movies", label: "أفلام مميزة كاملة" },
  { value: "/vip?kind=live", label: "بث سمارتر" },
  { value: "/vip?kind=movie", label: "أفلام سمارتر" },
  { value: "/vip?kind=series", label: "مسلسلات سمارتر" },
  { value: "/auth", label: "دخول الأعضاء" },
  { value: "/featured", label: "القنوات المميزة" },
  { value: "/sections", label: "الأقسام" },
  { value: "/contact", label: "التواصل" },
  { value: "/live-chat", label: "الدردشة" },
] as const;
export type SectionCard = { title: string; description: string; button: string; image: string; link: string; hidden?: boolean; font?: string; titleSize?: number; descriptionSize?: number; buttonSize?: number; imageWidth?: number; imageHeight?: number; imageFit?: "cover" | "contain"; fontWeight?: number };
export type SectionContent = { cards: Record<string, Partial<SectionCard>>; titles: Record<string, string>; pageTitle: string; pageDescription: string; orders?: Record<string, string[]> };
export const defaultSectionContent: SectionContent = { cards: {}, titles: {}, pageTitle: "الأقسام", pageDescription: "اختر ما تريد مشاهدته" };
export const editableCards: { id: string; location: string; defaults: SectionCard }[] = [
  { id: "sections-bedouin", location: "صفحة الأقسام · البدوية دراما", defaults: { title: "البدوية دراما", description: "المسلسلات البدوية وجميع حلقاتها", button: "استعرض المسلسلات", image: bedouinImage, link: "/bedouin-drama" } },
  { id: "home-live", location: "الرئيسية · البث", defaults: { title: "البث المباشر", description: "جميع القنوات مرتبة داخل تصنيفات واضحة", button: "اضغط للدخول", image: liveImage, link: "/vip?kind=live" } },
  { id: "home-movie", location: "الرئيسية · الأفلام", defaults: { title: "مكتبة الأفلام", description: "", button: "اضغط للدخول", image: moviesImage, link: "/vip?kind=movie" } },
  { id: "home-series", location: "الرئيسية · المسلسلات", defaults: { title: "المسلسلات", description: "", button: "اضغط للدخول", image: seriesImage, link: "/vip?kind=series" } },
  { id: "sections-live", location: "صفحة الأقسام · البث", defaults: { title: "البث المباشر", description: "قنواتك المفضلة في مكان واحد", button: "استعرض القنوات", image: liveImage, link: "/live" } },
  { id: "sections-movie", location: "صفحة الأقسام · الأفلام", defaults: { title: "مكتبة الأفلام", description: "اكتشف عالم الأفلام", button: "استعرض الأفلام", image: moviesImage, link: "/movies" } },
  { id: "sections-series", location: "صفحة الأقسام · المسلسلات", defaults: { title: "المسلسلات", description: "تابع مسلسلاتك وحلقاتك المفضلة", button: "استعرض المسلسلات", image: seriesImage, link: "/vip?kind=series" } },
  { id: "sections-member", location: "صفحة الأقسام · الأعضاء", defaults: { title: "دخول الأعضاء", description: "سجّل دخولك بحسابك", button: "تسجيل الدخول", image: memberImage, link: "/auth" } },
  ...homeCategoryCards.map((c) => ({ id: `category-${c.id}`, location: `الرئيسية · ${c.title}`, defaults: { title: c.title, description: "", button: "دخول", image: c.image, link: c.link } })),
];
export function getSectionCard(id: string, content?: SectionContent): SectionCard {
  const base = editableCards.find((c) => c.id === id)?.defaults ?? { title: "", description: "", button: "", image: liveImage, link: "/live" };
  const card = { ...base, ...content?.cards?.[id] };
  if (!card.image) card.image = base.image;
  if (!sectionDestinations.some((d) => d.value === card.link)) card.link = base.link;
  if (!/^(https:\/\/|\/)/.test(card.image) || card.image.startsWith("//")) card.image = base.image;
  return card;
}

export function orderedSectionIds(group: string, defaults: string[], content?: SectionContent): string[] {
  const saved = content?.orders?.[group];
  const ordered = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && defaults.includes(id)) : [];
  return [...new Set([...ordered, ...defaults])];
}