import type { Channel } from "./channels";

/** Ordered channel groups: Saudi first (MBC, then Rotana), then Gulf, then Arabic, then foreign. */
export type ChannelGroup = "saudi" | "gulf" | "arabic" | "foreign";

export const channelGroupLabels: Record<ChannelGroup, string> = {
  saudi: "سعودية",
  gulf: "خليجية",
  arabic: "عربية",
  foreign: "أجنبية",
};

const GROUP_RANK: Record<ChannelGroup, number> = { saudi: 0, gulf: 1, arabic: 2, foreign: 3 };

const MBC_IDS = new Set([
  "mbc-1", "mbc-4", "mbc-5", "mbc-drama", "mbc-plus-drama", "mbc-mood", "mbc-masr", "mbc-masr-2",
  "mbc-masr-drama", "mbc-iraq", "mbc-1-egypt", "mbc-drama-usa", "ar-mbc-bollywood",
]);
const ROTANA_IDS = new Set([
  "ar-rotana-cinema", "ar-rotana-cinema-masr", "ar-rotana-drama", "ar-rotana-classic",
  "ar-rotana-comedy", "yt-hart-29y2iq",
]);
const SAUDI_IDS = new Set([
  "saudi-quran", "saudi-sunnah", "saudi-tv", "saudi-alaan", "saudi-news", "saudi-sports", "sbc-tv",
  "thaqafiya", "makkah-tv", "alhadath", "alarabiya", "al-arabiya-english", "yt-alarabiya-business",
  "alarabiya-programs", "ashariq-bloomberg", "asharq-news", "asharq-discovery", "asharq-documentary",
  "yt-flzmedkfqos", "cnbc-arabiya", "yt-cnbc-arabia", "iqraa", "iqraa-quran", "iqraa-world",
  "riyadh-radio", "khuzama-radio", "yt-v45noyljnzq", "mood-tarab", "mood-mohammed-abdo",
  "mood-abdulmajeed", "mood-rashed", "mood-majid", "mood-rabeh",
]);
const GULF_IDS = new Set([
  "aljazeera", "aljazeera-2", "aljazeera-mubasher", "aljazeera-mubasher-2", "yt-aljazeera-mubasher-24",
  "qatar-tv", "qatar-tv-2", "qatar-quran", "al-rayyan", "al-rayyan-old", "qbc-qatar", "ktv-1", "ktv-2",
  "ktv-qurain", "ktv-arabe", "ktv-ethraa", "ktv-news", "ktv-sport", "ktv-sport-plus", "sp-ktv-sport",
  "sp-ktv-sport-plus", "oman-sport", "oman-mubashir", "oman-cultural", "amman-tv", "bahrain-sport",
  "bahrain-sports-2", "bahrain-tv", "bahrain-international", "bahrain-quran", "ajman-tv", "sharjah-tv",
  "sharjah-2", "nour-tv", "sky-news-arabia", "bein-xtra", "sp-bein-sports-xtra",
]);
/** Arabic-language channels whose Latin names would otherwise read as foreign. */
const ARABIC_IDS = new Set(["rt-arabic", "pmc"]);
/** Non-Arab channels whose Arabic labels would otherwise read as Arab. */
const FOREIGN_IDS = new Set([
  "nasa-iss", "brooks-falls", "master-chefs", "story-channel", "ch4teen", "big-time-plus", "koogi",
]);

const hasArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

/** Places every channel — including ones the owner imports later — into one of the four groups. */
export function channelGroup(channel: Pick<Channel, "id" | "name">): ChannelGroup {
  const { id, name } = channel;
  if (MBC_IDS.has(id) || ROTANA_IDS.has(id) || SAUDI_IDS.has(id)) return "saudi";
  if (GULF_IDS.has(id)) return "gulf";
  if (FOREIGN_IDS.has(id)) return "foreign";
  if (ARABIC_IDS.has(id)) return "arabic";
  if (/\bmbc\b/i.test(name) || name.includes("ام بي سي") || name.includes("إم بي سي")) return "saudi";
  if (/rotana/i.test(name) || /rotana/i.test(id) || name.includes("روتانا")) return "saudi";
  if (name.includes("السعودية") || name.includes("سعودي")) return "saudi";
  if (/الكويت|قطر|البحرين|عجمان|الشارقة|أبوظبي|دبي|الإمارات|سلطنة عمان|السعودية?/.test(name)) return "gulf";
  return hasArabic(name) ? "arabic" : "foreign";
}

function channelRank(channel: Pick<Channel, "id" | "name">) {
  const group = channelGroup(channel);
  // Inside the Saudi block MBC comes first, then Rotana, then the remaining Saudi channels.
  const within = group === "saudi" ? (MBC_IDS.has(channel.id) ? 0 : ROTANA_IDS.has(channel.id) ? 1 : 2) : 0;
  return { group: GROUP_RANK[group], within };
}

/** Stable sort of the catalog into the four groups; channels keep their current order inside a group. */
export function orderChannels<T extends Pick<Channel, "id" | "name">>(list: T[]): T[] {
  return list
    .map((channel, index) => ({ channel, index, rank: channelRank(channel) }))
    .sort((a, b) => a.rank.group - b.rank.group || a.rank.within - b.rank.within || a.index - b.index)
    .map((entry) => entry.channel);
}
