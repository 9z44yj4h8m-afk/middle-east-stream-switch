import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFeaturedChannel } from "@/lib/featured-channel.functions";
import { ChannelSchedule } from "@/components/channel-schedule";
import satelliteWorld from "@/assets/satellite-world.jpg";

export const Route = createFileRoute("/featured/$channel")({
  loader: async ({ params }) => { const data = await getFeaturedChannel({ data: { id: params.channel } }); if (!data) throw notFound(); return data; },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? "قناة غير متوفرة"} — المغني لايف` }, { name: "description", content: loaderData?.description ?? "تفاصيل القناة المميزة." }, { property: "og:title", content: `${loaderData?.name ?? "قناة"} — المغني لايف` }, { property: "og:description", content: loaderData?.description ?? "قناة مميزة في مكتبة المغني." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  errorComponent: () => <div className="p-8 text-center">تعذّر تحميل تفاصيل القناة.<Link to="/" className="block mt-4 text-primary">الرئيسية</Link></div>,
  notFoundComponent: () => <div className="p-8 text-center">القناة غير موجودة.<Link to="/" className="block mt-4 text-primary">الرئيسية</Link></div>,
  component: FeaturedDetail,
});
function FeaturedDetail() {
  const channel = Route.useLoaderData();
  return <div className="min-h-screen bg-background text-foreground" dir="rtl"><header className="border-b border-border px-6 py-4"><Link to="/" className="flex items-center gap-2"><ArrowRight className="h-5 w-5" />ALMOGHANI LIVE</Link></header><section className="relative overflow-hidden border-b border-border"><img src={satelliteWorld} width={1536} height={1024} alt="دش ورسيفر وتلفزيونات وأقمار صناعية" className="absolute inset-0 h-full w-full object-cover opacity-30" /><div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24"><p className="text-sm font-bold text-accent">{channel.category}</p>{channel.logo && <img src={channel.logo} alt={`شعار ${channel.name}`} width={160} height={90} className="mt-6 h-20 w-36 object-contain" />}<h1 className="mt-5 font-display text-4xl font-black sm:text-5xl">{channel.name}</h1><p className="mt-5 max-w-xl text-base leading-8 text-foreground/85">{channel.description}</p><Button asChild size="lg" className="mt-7"><Link to="/vip" search={{ kind: channel.kind, group: channel.group || undefined, q: channel.kind === "live" ? channel.query : undefined }}><Play className="h-4 w-4" />فتح في المكتبة الخاصة</Link></Button><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-4 w-4" />دخول عضو ورمز المكتبة مطلوبان</p></div></section><main className="mx-auto max-w-5xl px-6 py-10"><h2 className="flex items-center gap-2 text-xl font-black"><CalendarDays className="h-5 w-5 text-accent" />{channel.kind === "live" ? "جدول البث" : "المحتوى المتاح"}</h2><div className="mt-4 border-y border-border py-6 text-sm leading-7 text-muted-foreground">{channel.kind === "live" ? <ChannelSchedule channelId={channel.id} /> : "مكتبة مشاهدة عند الطلب وليست قناة ذات جدول بث؛ تظهر العناوين المتاحة داخل مجموعتها."}{!channel.available && <p className="mt-3">لم نجد مجموعة مطابقة حاليًا؛ يمكنك البحث داخل المكتبة.</p>}</div></main></div>;
}