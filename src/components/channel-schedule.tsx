import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; title: string; starts_at: string; ends_at: string | null };
const fmt = (d: string) => new Date(d).toLocaleString("ar-SA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ChannelSchedule({ channelId }: { channelId: string }) {
  const schedules = useQuery({ queryKey: ["channel-schedules", channelId], refetchInterval: 15000, queryFn: async () => {
    const since = new Date(Date.now() - 3 * 3600_000).toISOString();
    const { data, error } = await supabase.from("channel_schedules").select("id,title,starts_at,ends_at").eq("channel_id", channelId).gte("starts_at", since).order("starts_at").limit(50);
    if (error) throw error;
    return (data ?? []) as Item[];
  } });
  if (schedules.isPending) return <p>جارٍ تحميل الجدول…</p>;
  if (schedules.isError) return <p>تعذّر تحميل جدول البث.</p>;
  const items = schedules.data;
  if (!items.length) return <p>لا توجد مواعيد بث مضافة لهذه القناة حاليًا.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-4 py-3">
          <span className="font-bold text-foreground">{i.title}</span>
          <span className="shrink-0 text-xs">{fmt(i.starts_at)}{i.ends_at ? ` — ${new Date(i.ends_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}
