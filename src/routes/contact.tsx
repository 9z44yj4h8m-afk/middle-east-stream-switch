import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, AtSign, Camera, Ghost, Home, ExternalLink, Radio } from "lucide-react";
import contactArtwork from "@/assets/member-screen/contact-art.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { useSiteConfig, defaultContacts } from "@/lib/site-config";

function buildContacts(c: typeof defaultContacts) {
  const digits = c.whatsapp.replace(/\D/g, "").replace(/^0/, "966");
  const handle = (v: string) => v.trim().replace(/^@/, "");
  return [
    { name: "واتساب", value: c.whatsapp, href: c.whatsapp ? `https://wa.me/${digits}` : "", icon: MessageCircle },
    { name: "البريد", value: c.email, href: c.email ? `mailto:${c.email}` : "", icon: Mail },
    { name: "سناب شات", value: c.snapchat, href: c.snapchat ? `https://www.snapchat.com/add/${handle(c.snapchat)}` : "", icon: Ghost },
    { name: "إكس (تويتر)", value: c.x, href: c.x ? `https://x.com/${handle(c.x)}` : "", icon: AtSign },
    { name: "انستقرام", value: c.instagram, href: c.instagram ? `https://instagram.com/${handle(c.instagram)}` : "", icon: Camera },
  ];
}

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "للتواصل — المغني لايف" },
    { name: "description", content: "تواصل مع المغني عبر واتساب والبريد وحسابات التواصل الاجتماعي." },
    { property: "og:title", content: "للتواصل — المغني لايف" },
    { property: "og:description", content: "واتساب والبريد وحسابات المغني الرسمية." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ContactPage,
});

const tiles: Record<string, string> = {
  "واتساب": "bg-whatsapp text-foreground",
  "البريد": "bg-mail text-foreground",
  "سناب شات": "bg-snap text-background",
  "إكس (تويتر)": "bg-xbrand text-foreground border border-sky/50",
  "انستقرام": "bg-primary text-primary-foreground",
};
const labels: Record<string, string> = { "واتساب": "الواتساب", "البريد": "البريد الإلكتروني", "سناب شات": "Snapchat", "إكس (تويتر)": "تويتر" };

function Logo({ small }: { small?: boolean }) {
  return (
    <span dir="ltr" className={`inline-flex items-center gap-1 font-black tracking-tight ${small ? "text-lg" : "text-2xl"}`}>
      ALMOGHANI<span className="text-primary">LIVE</span><Radio className="h-4 w-4 text-primary" />
    </span>
  );
}

function ContactPage() {
  const { data } = useSiteConfig();
  const list = buildContacts(data?.contacts ?? defaultContacts).filter((c) => c.href);
  const names: Record<string, string> = { "واتساب": "WhatsApp", "البريد": "Email", "سناب شات": "Snapchat", "إكس (تويتر)": "تويتر" };
  return <div dir="rtl" className="member-studio-page">
    <main className="contact-studio-screen">
      <img src={contactArtwork.url} alt="ALMOGHANI LIVE" className="member-studio-art" />
      <div className="contact-studio-body">
        <h1 className="mb-8 text-center text-4xl font-black">تواصل معنا</h1>
        <div className="grid gap-4">{list.map((c) => { const Icon = c.icon; return <a key={c.name} href={c.href} target="_blank" rel="noopener noreferrer" className="contact-studio-tile">
          <span className={`contact-studio-icon ${tiles[c.name] ?? "bg-primary text-primary-foreground"}`}>{c.name === "إكس (تويتر)" ? <span className="text-5xl font-bold" dir="ltr">𝕏</span> : <Icon className="h-10 w-10" />}</span>
          <span dir="ltr" className="min-w-0 flex-1 text-left"><span className="block text-lg font-bold">{names[c.name] ?? c.name}</span><span className="contact-studio-value">{c.value}</span></span>
        </a>; })}</div>
        <Button asChild size="lg" className="member-red-action mt-6 w-full"><Link to="/"><Home className="h-6 w-6" />العودة للرئيسية</Link></Button>
      </div>
    </main>
  </div>;
}
