import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Play, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMember } from "@/components/member-provider";
import { browseSmartersChannels } from "@/lib/iptv/library.functions";
import { SmartersBanners } from "@/components/smarters-banners";

export function SmartersCatalog({ onMemberWatch }: { onMemberWatch: (group: string) => void }) {
  const { user, ready } = useMember();
  const browse = useServerFn(browseSmartersChannels);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState("");
  const catalog = useQuery({ queryKey: ["smarters-public", q, group, page], queryFn: () => browse({ data: { q, group, page } }), staleTime: 60000 });
  return <main dir="rtl" className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8">
    <Link to="/" className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><ArrowRight className="h-4 w-4" />الرئيسية</Link>
    <h1 className="text-2xl font-black">قنوات Almoghani Smarter pro</h1>
     <div className="mt-6"><SmartersBanners onBrowse={(query) => { setQ(query); setGroup(""); setPage(0); document.getElementById("smarters-channel-list")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }} /></div>
     <div id="smarters-channel-list" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-3">
       <h2 className="text-lg font-bold">{q ? `نتائج البحث: ${q}` : "جميع القنوات"}</h2>
       {(q || group) && <Button variant="outline" size="sm" onClick={() => { setQ(""); setGroup(""); setPage(0); }}>جميع القنوات</Button>}
     </div>
    <div className="my-6 grid gap-3 sm:grid-cols-2">
      <input aria-label="ابحث عن قناة سمارتر" placeholder="ابحث عن قناة…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="h-12 min-w-0 rounded-lg border border-border bg-card px-3 text-foreground" />
      <select aria-label="تصنيف قنوات سمارتر" value={group} onChange={(e) => { setGroup(e.target.value); setPage(0); }} className="h-12 min-w-0 rounded-lg border border-border bg-card px-3 text-foreground"><option value="">جميع التصنيفات</option>{catalog.data?.groups.map((name) => <option key={name}>{name}</option>)}</select>
    </div>
    {catalog.isPending && <p role="status">جارٍ تحميل القنوات…</p>}
    {catalog.isError && <div role="alert"><p>تعذّر تحميل القنوات.</p><Button variant="outline" onClick={() => void catalog.refetch()}>إعادة المحاولة</Button></div>}
     <ul aria-label="قنوات سمارتر" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{catalog.data?.items.map((item, index) => <li key={`${item.name}-${index}`}>
      <Button disabled={!ready} variant="ghost" className="h-24 w-full justify-start gap-3 border border-border bg-card px-4 text-right" onClick={() => { if (user) onMemberWatch(item.group); else setSelected(item.name); }}>
        <Tv className="h-7 w-7 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate font-bold">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.group}</span></span><Play className="h-4 w-4 shrink-0 text-primary" />
      </Button>
    </li>)}</ul>
    {catalog.data && catalog.data.total === 0 && <p className="py-10 text-center text-muted-foreground">لا توجد قنوات مطابقة.</p>}
    {catalog.data && catalog.data.total > 60 && <div className="mt-6 flex items-center justify-center gap-4"><Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>السابق</Button><span>{page + 1}</span><Button variant="outline" disabled={(page + 1) * 60 >= catalog.data.total} onClick={() => setPage((p) => p + 1)}>التالي</Button></div>}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(""); }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>التسجيل لمشاهدة القناة</DialogTitle><DialogDescription>{selected}</DialogDescription></DialogHeader><Button asChild><Link to="/auth" onClick={() => sessionStorage.setItem("member-destination", "/vip?kind=live")}>تسجيل الدخول أو إنشاء حساب</Link></Button></DialogContent></Dialog>
  </main>;
}