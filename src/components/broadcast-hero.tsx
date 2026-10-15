import { CalendarDays, Heart, Maximize, Play, Share2, Volume2 } from "lucide-react";
import { broadcastArt } from "@/lib/broadcast-art";
import { Button } from "@/components/ui/button";
import { LivePlayer } from "@/components/live-player";
import type { Channel } from "@/lib/channels";

export function BroadcastHero({ channel, active, onWatch, sectionTitle, section }: {
  channel: Channel; active: boolean; onWatch: () => void; sectionTitle?: string | undefined; section?: string | undefined;
}) {
  const art = broadcastArt[section ?? "news"] ?? broadcastArt["general"];
  return <section id="player" className="broadcast-hero scroll-mt-24" dir="rtl">
    <div className="gold-broadcast-cover">
      <img src={art} alt={sectionTitle ?? "استوديو ALMOGHANI LIVE"} width={1536} height={640} fetchPriority="high" />
      <div className="gold-cover-copy">
        {!section && <span className="live-badge"><span className="animate-live-pulse" />مباشر</span>}
        <h1>{sectionTitle ?? "استوديو الأخبار المباشر"}</h1>
        <p>{section === "sports" ? "تابع القنوات الرياضية والبطولات مباشرة" : section === "islamic" ? "تلاوات وبرامج دينية وخطب" : section === "general" ? "برامج متنوعة لجميع أفراد العائلة" : "القنوات والبرامج من جميع أنحاء العالم على مدار الساعة"}</p>
        <Button variant="broadcast" onClick={() => { onWatch(); requestAnimationFrame(() => document.getElementById("broadcast-live-screen")?.scrollIntoView({ behavior: "smooth", block: "center" })); }}><Play className="fill-current" />شاهد الآن</Button>
      </div>
    </div>
    {active && <div id="broadcast-live-screen" className="broadcast-screen"><LivePlayer key={channel.id} channel={channel} /></div>}
    <div className="broadcast-program">
      <span className="on-air">{active ? channel.name : "الآن على الهواء"}</span>
      <div className="broadcast-program-copy"><div><h2>{active ? channel.name : "تقنية تصنع المستقبل"}</h2><p>{active ? channel.description : "قنوات وبرامج متنوعة في مكان واحد"}</p></div><p className="broadcast-program-aside">كل ما تحب مشاهدته من قنوات وبرامج، يجتمع لك في مكان واحد</p></div>
      <div className="broadcast-program-actions"><CalendarDays /><span /><Heart /><span /><Share2 /><Button variant="broadcast" onClick={onWatch}>{active ? "تابع البث" : "شاهد الآن"}<Play className="fill-current" /></Button></div>
    </div>
  </section>;
}
