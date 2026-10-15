import art0 from "@/assets/bedouin-drama/JiFBbINrPVU.jpg.asset.json";
import art1 from "@/assets/bedouin-drama/Vi9b1vICSKc.jpg.asset.json";
import art2 from "@/assets/bedouin-drama/Our8cMYbabU.jpg.asset.json";
import art3 from "@/assets/bedouin-drama/hovJQahDKYc.jpg.asset.json";
import art4 from "@/assets/bedouin-drama/4T49jwNODaY.jpg.asset.json";
import art5 from "@/assets/bedouin-drama/t73vq7kH7r8.jpg.asset.json";
import art6 from "@/assets/bedouin-drama/n0LkfGSzYs4.jpg.asset.json";
import art7 from "@/assets/bedouin-drama/ttt3F5XcE78.jpg.asset.json";
import art8 from "@/assets/bedouin-drama/_fZZvOwy-XA.jpg.asset.json";
import art9 from "@/assets/bedouin-drama/PuVtWhhdfdw.jpg.asset.json";
import art10 from "@/assets/bedouin-drama/27HWjqDmAKs.jpg.asset.json";
import art11 from "@/assets/bedouin-drama/4NxyeTBliQU.jpg.asset.json";
import episode6 from "@/assets/bedouin-drama/DWJRg_9YJSE.jpg.asset.json";
import episode7 from "@/assets/bedouin-drama/3eacu9uK-4w.jpg.asset.json";
import { awdaAbuTayeh } from "@/lib/awda-abu-tayeh";
import { alNatheer } from "@/lib/al-natheer";
import { dhiabHababAlReeh } from "@/lib/dhiab-habab-al-reeh";
import { akhoSadaa } from "@/lib/akho-sadaa";
import { ghadrAlZaman } from "@/lib/ghadr-al-zaman";
import { alQaseer } from "@/lib/al-qaseer";
import { alRaheel } from "@/lib/al-raheel";
import { jalwatRakan } from "@/lib/jalwat-rakan";
import qaseerCover from "@/assets/bedouin-covers/al-qaseer.png.asset.json";
import akhoCover from "@/assets/bedouin-covers/akho-sadaa.png.asset.json";
import ghadrCover from "@/assets/bedouin-covers/ghadr-al-zaman.png.asset.json";
import awdaCover from "@/assets/bedouin-covers/awda-abu-tayeh.png.asset.json";
import natheerCover from "@/assets/bedouin-covers/al-natheer.png.asset.json";
import dhiabCover from "@/assets/bedouin-covers/dhiab-habab-al-reeh.png.asset.json";
import dawasCover from "@/assets/bedouin-covers/dawas-al-layl.png.asset.json";
import jalwatCover from "@/assets/bedouin-covers/jalwat-rakan.png.asset.json";
import raheelCover from "@/assets/bedouin-covers/al-raheel.png.asset.json";

export type BedouinEpisode = { youtubeId: string; title: string; number: number; image: string };
export type BedouinSeries = { id: string; title: string; expectedEpisodeCount: number; playlistId?: string; coverImage?: string; episodes: BedouinEpisode[] };

const seriesCovers: Record<string, string> = {
  "al-qaseer": qaseerCover.url,
  "akho-sadaa": akhoCover.url,
  "ghadr-al-zaman": ghadrCover.url,
  "awda-abu-tayeh": awdaCover.url,
  "al-natheer": natheerCover.url,
  "dhiab-habab-al-reeh": dhiabCover.url,
  "dawas-al-layl": dawasCover.url,
  "jalwat-rakan": jalwatCover.url,
  "al-raheel": raheelCover.url,
};

export const bedouinSeries: BedouinSeries[] = [{
  id: "dawas-al-layl",
  title: "دواس الليل",
  expectedEpisodeCount: 14,
  playlistId: "PLdLJSN32o2ZFvnChN9Gij09pDTaM_K2JN",
  episodes: [
  { youtubeId: "JiFBbINrPVU", title: "المسلسل البدوي دواس الليل ـ الحلقة 14 الرابعة عشر كاملة HD", number: 14, image: art0.url },
  { youtubeId: "Vi9b1vICSKc", title: "المسلسل البدوي دواس الليل ـ الحلقة 13 الثالثة عشر كاملة HD", number: 13, image: art1.url },
  { youtubeId: "Our8cMYbabU", title: "المسلسل البدوي دواس الليل ـ الحلقة 12 الثانية عشر كاملة HD", number: 12, image: art2.url },
  { youtubeId: "hovJQahDKYc", title: "المسلسل البدوي دواس الليل ـ الحلقة 11 الحاديه عشر كاملة HD", number: 11, image: art3.url },
  { youtubeId: "4T49jwNODaY", title: "المسلسل البدوي دواس الليل ـ الحلقة  10العاشرة كاملة HD", number: 10, image: art4.url },
  { youtubeId: "t73vq7kH7r8", title: "المسلسل البدوي دواس الليل ـ الحلقة 9 التاسعة كاملة HD", number: 9, image: art5.url },
  { youtubeId: "n0LkfGSzYs4", title: "المسلسل البدوي دواس الليل ـ الحلقة 8 السابع كاملة HD", number: 8, image: art6.url },
  { youtubeId: "3eacu9uK-4w", title: "المسلسل البدوي دواس الليل الحلقة السابعة", number: 7, image: episode7.url },
  { youtubeId: "DWJRg_9YJSE", title: "المسلسل البدوي دواس الليل الحلقة السادسة", number: 6, image: episode6.url },
  { youtubeId: "ttt3F5XcE78", title: "المسلسل البدوي دواس الليل ـ الحلقة 5 الخامسة كاملة HD", number: 5, image: art7.url },
  { youtubeId: "_fZZvOwy-XA", title: "المسلسل البدوي دواس الليل ـ الحلقة 4 الرابعة كاملة HD", number: 4, image: art8.url },
  { youtubeId: "PuVtWhhdfdw", title: "المسلسل البدوي دواس الليل ـ الحلقة 3 الثالثة كاملة HD", number: 3, image: art9.url },
  { youtubeId: "27HWjqDmAKs", title: "المسلسل البدوي دواس الليل ـ الحلقة 2 الثانية كاملة HD", number: 2, image: art10.url },
  { youtubeId: "4NxyeTBliQU", title: "المسلسل البدوي دواس الليل ـ الحلقة 1 الأولى كاملة HD", number: 1, image: art11.url }
  ],
}, awdaAbuTayeh, alNatheer, dhiabHababAlReeh, akhoSadaa, ghadrAlZaman, alQaseer, alRaheel, jalwatRakan].map((series) => {
  const coverImage = seriesCovers[series.id];
  return coverImage ? { ...series, coverImage } : series;
});
