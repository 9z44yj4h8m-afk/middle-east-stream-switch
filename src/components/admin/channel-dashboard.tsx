import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Radio, Settings } from "lucide-react";
import { useMember } from "@/components/member-provider";
import { supabase } from "@/integrations/supabase/client";
import { useSiteConfig, channelCategories } from "@/lib/site-config";
import { channels } from "@/lib/channels";
import { dedupeChannels } from "@/lib/channel-order";
import { Button } from "@/components/ui/button";
import { AdminPasswordLogin } from "./password-login";
import { EasyChannelPanel } from "./easy-channel-panel";
import { SectionEditor } from "./section-editor";
import { AdminDashboardShell, AdminOverview, type AdminArea } from "./dashboard-shell";

export function ChannelDashboard() {
  const { user, ready } = useMember();
  const [area, setArea] = useState<AdminArea>("home");
  const client = useQueryClient();
  const role = useQuery({
    queryKey: ["channel-dashboard-owner", user?.id], enabled: Boolean(user), retry: false,
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) throw error;
      return data === true;
    },
  });
  useEffect(() => { if (!user) setArea("home"); }, [user]);
  async function signOut() {
    await supabase.auth.signOut();
    client.removeQueries({ queryKey: ["channel-dashboard-owner"] });
    client.removeQueries({ queryKey: ["owner-channel-import"] });
  }
  if (!ready || (user && role.isPending)) return <AdminDashboardShell area="home"><p role="status" className="py-12 text-center">جارٍ التحقق…</p></AdminDashboardShell>;
  if (!user || !role.data) return <AdminDashboardShell area="home"><AdminPasswordLogin />{role.isError && <p role="alert" className="text-center text-destructive">تعذّر التحقق من الدخول. أعد تحميل الصفحة.</p>}</AdminDashboardShell>;
  return <AdminDashboardShell area={area} onNavigate={setArea} onSignOut={() => void signOut()}>
    {area === "home" ? <DashboardOverview onNavigate={setArea} /> :
      area === "channels" || area === "movies" ? <EasyChannelPanel key={area} embedded moviesOnly={area === "movies"} /> :
      area === "categories" ? <SectionEditor /> :
      area === "design" ? <section className="space-y-6"><div className="admin-page-heading"><h1>التصميم والمظهر</h1><Palette /></div><SectionEditor /><Button asChild variant="outline"><Link to="/admin" search={{ tab: "design" }}><Palette />ألوان وخطوط الموقع</Link></Button></section> :
      <section className="space-y-6"><div className="admin-page-heading"><h1>اشتراك سمارت</h1><Radio /></div><Button asChild><Link to="/admin" search={{ tab: "settings" }}><Settings />إعدادات الاشتراك والرقم السري</Link></Button><Button asChild variant="outline"><Link to="/vip">قنوات سمارت</Link></Button></section>}
  </AdminDashboardShell>;
}

function DashboardOverview({ onNavigate }: { onNavigate: (area: AdminArea) => void }) {
  const { data, isPending, isError } = useSiteConfig();
  const imports = useQuery({ queryKey: ["owner-channel-import"], queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "channel-import-summary").maybeSingle();
    if (error) throw error;
    return data?.value as { ids?: string[] } | null;
  } });
  if (isPending) return <p role="status">جارٍ تحميل القنوات…</p>;
  if (isError) return <p role="alert">تعذّر تحميل القنوات؛ أعد تحميل الصفحة.</p>;
  const hidden = new Set(data?.overrides.filter(o => o.hidden).map(o => o.channel_id));
  const entries = dedupeChannels([...channels, ...(data?.customChannels ?? [])]).map(c => ({ deleted: false, hidden: hidden.has(c.id) }));
  const savedIds = new Set(data?.customChannels.map(c => c.id));
  const imported = imports.data?.ids?.filter(id => savedIds.has(id)).length ?? 0;
  return <><AdminOverview entries={entries} sections={channelCategories.length} imported={imported} onNavigate={onNavigate} /><div className="flex flex-wrap gap-3 py-6"><Button asChild variant="outline"><Link to="/admin">لوحة الموقع الكاملة</Link></Button><Button asChild variant="outline"><Link to="/22">لوحة الأصوات</Link></Button></div></>;
}