import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, LayoutGrid, LockKeyhole, LogOut, Mail, Palette, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { AiControlFields } from "@/components/ai-control-fields";
import { useMember } from "@/components/member-provider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aiPageConfigKey, contrastOnHex, defaultAiPageConfig, resolvedAiLogoSrc, useAiPageConfig } from "@/lib/ai-page-config";
import { saveAiOwnerConfig, uploadAiOwnerLogo } from "@/lib/ai-page.functions";
import { listAiInbox, setAiMemberStatus } from "@/lib/ai-workspace.functions";
import { listMembers, listRoles, setMemberRole } from "@/lib/admin.functions";
import { loginOwner } from "@/lib/admin-login.functions";

const ADMIN_TABS = [ { id: "content", title: "الأقسام والمحتوى", icon: LayoutGrid }, { id: "design", title: "التصميم والخطوط", icon: Palette }, { id: "users", title: "المستخدمون", icon: Users }, { id: "inbox", title: "صندوق الوارد", icon: Mail }, { id: "contact", title: "بيانات التواصل", icon: Mail }, { id: "security", title: "أمان الإدارة", icon: ShieldCheck } ] as const;
type AdminTab = typeof ADMIN_TABS[number]["id"];

export function AiAdminPage() {
  const { user, ready } = useMember(); const qc = useQueryClient(); const navigate = useNavigate();
  const login = useServerFn(loginOwner); const save = useServerFn(saveAiOwnerConfig); const upload = useServerFn(uploadAiOwnerLogo);
  const fetchMembers = useServerFn(listMembers); const fetchRoles = useServerFn(listRoles); const fetchInbox = useServerFn(listAiInbox);
  const changeStatus = useServerFn(setAiMemberStatus); const changeRole = useServerFn(setMemberRole);
  const [username, setUsername] = useState("ahmed"); const [password, setPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [currentPassword, setCurrentPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("content"); const [busy, setBusy] = useState(false); const [status, setStatus] = useState(""); const [search, setSearch] = useState("");
  const { data: config } = useAiPageConfig(); const [draft, setDraft] = useState(defaultAiPageConfig); const [pendingLogo, setPendingLogo] = useState<File | null>(null); const [logoPreview, setLogoPreview] = useState("");
  useEffect(() => { if (config) setDraft(config); }, [config]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  const roleQuery = useQuery({ queryKey: ["ai-admin-role", user?.id], enabled: ready && !!user, queryFn: async () => { if (!user) return false; const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }); if (error) throw error; return !!data; } });
  const admin = roleQuery.data === true;
  const members = useQuery({ queryKey: ["ai-admin-members", user?.id], enabled: admin, queryFn: () => fetchMembers() });
  const roles = useQuery({ queryKey: ["ai-admin-roles", user?.id], enabled: admin, queryFn: () => fetchRoles() });
  const inbox = useQuery({ queryKey: ["ai-admin-inbox", user?.id], enabled: admin, queryFn: () => fetchInbox() });
  const theme = { "--background": draft.bgColor, "--surface": draft.surfaceColor, "--foreground": draft.textColor, "--muted-foreground": draft.mutedTextColor, "--primary": draft.accentColor, "--primary-foreground": contrastOnHex(draft.accentColor), "--ai-heading": draft.headingColor, "--ai-font": `"${draft.fontFamily}", sans-serif`, "--ai-font-size": `${draft.fontSize}px` } as CSSProperties;

  async function run(action: () => Promise<unknown>, success: string) { setBusy(true); setStatus(""); try { await action(); setStatus(success); } catch (error) { setStatus(error instanceof Error ? error.message : "تعذّر إتمام العملية."); } finally { setBusy(false); } }
  async function saveSettings() {
    let next = draft;
    if (pendingLogo) {
      const bytes = new Uint8Array(await pendingLogo.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const result = await upload({ data: { contentType: pendingLogo.type, base64: btoa(binary) } }); next = { ...draft, logoPath: result.logoPath, logoUrl: "" };
    }
    const result = await save({ data: { config: next } }); qc.setQueryData(aiPageConfigKey, result.config); setDraft(result.config); setPendingLogo(null); setLogoPreview("");
  }
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/admin_ai", replace: true }); }
  const unread = (inbox.data ?? []).filter((m) => !m.is_read).length;

  if (!ready || roleQuery.isLoading) return <div dir="rtl" className="almoghani-ai-shell ai-admin-loading">جارٍ التحقق من الحساب…</div>;
  if (!admin) return <div dir="rtl" className="almoghani-ai-shell ai-admin-login">
    <form onSubmit={(e) => { e.preventDefault(); void run(async () => { const result = await login({ data: { username, password } }); if (!result.ok) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة."); const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token }); if (error) throw error; setPassword(""); }, ""); }}>
      <img src={resolvedAiLogoSrc(config ?? defaultAiPageConfig)} alt="المغني الذكي" />
      <LockKeyhole className="text-primary" /><h1>دخول إدارة المغني الذكي</h1>
      <label>اسم المستخدم<input className="ai-workspace-input" dir="ltr" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
      <label>كلمة المرور<input className="ai-workspace-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {roleQuery.isError && <p role="alert">تعذّر التحقق من صلاحيات الحساب.</p>}
      {status && <p role="alert">{status}</p>}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ الدخول…" : "دخول الإدارة"}</Button>
      <Button asChild variant="ghost"><Link to="/ai"><ArrowRight />العودة للمساعد</Link></Button>
    </form>
  </div>;

  return <div dir="rtl" style={theme} className="almoghani-ai-shell ai-admin-shell">
    <header className="almoghani-ai-header"><div className="almoghani-ai-brand"><img src={resolvedAiLogoSrc(draft)} alt="" className="almoghani-ai-emblem" /><div><strong>إدارة المغني الذكي</strong><small>لوحة الإدارة</small></div></div><div className="almoghani-ai-actions"><Button asChild variant="outline" size="sm"><Link to="/ai"><ArrowRight />المساعد</Link></Button><Button variant="ghost" size="icon" title="تسجيل الخروج" aria-label="تسجيل الخروج" onClick={() => void signOut()}><LogOut /></Button></div></header>
    <div className="ai-admin-layout"><aside className="ai-admin-sidebar"><div className="ai-admin-owner"><ShieldCheck /><span>إدارة الموقع<small>{user?.email}</small></span></div><nav aria-label="أقسام لوحة الإدارة">{ADMIN_TABS.map((item) => <Button key={item.id} variant={tab === item.id ? "default" : "ghost"} onClick={() => { setTab(item.id); setStatus(""); }}><item.icon /><span>{item.title}</span>{item.id === "inbox" && unread > 0 && <b>{unread}</b>}</Button>)}</nav></aside>
    <main className="ai-admin-main">
      <div className="ai-admin-heading"><div><small>المغني الذكي</small><h1>{ADMIN_TABS.find((item) => item.id === tab)?.title}</h1></div>{["content", "design", "contact"].includes(tab) && <Button disabled={busy} onClick={() => void run(saveSettings, "تم حفظ الإعدادات وتطبيقها على صفحة المساعد.")}><Save />{busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}</Button>}</div>
      <div className="ai-admin-stats"><div><LayoutGrid /><strong>{draft.sections.length}</strong><span>الأقسام</span></div><div><Users /><strong>{members.data?.length ?? "—"}</strong><span>الحسابات</span></div><div><Mail /><strong>{unread}</strong><span>رسائل غير مقروءة</span></div></div>
      {status && <p role="status" className="ai-admin-status">{status}</p>}
      {["content", "design", "contact"].includes(tab) && <div className={`ai-admin-fields ai-admin-fields-${tab}`}><AiControlFields draft={draft} logoPreview={logoPreview} onChange={setDraft} onPickLogoFile={(file) => { if (file.size > 2 * 1024 * 1024) { setStatus("اختر شعارًا أصغر من 2 ميجابايت."); return; } setPendingLogo(file); setLogoPreview(URL.createObjectURL(file)); }} onResetLogo={() => { setPendingLogo(null); setLogoPreview(""); setDraft({ ...draft, logoPath: "", logoUrl: "" }); }} /></div>}
      {tab === "users" && <section className="ai-admin-section"><input className="ai-workspace-input" placeholder="البحث بالاسم أو البريد…" aria-label="البحث في المستخدمين" value={search} onChange={(e) => setSearch(e.target.value)} />
        {members.isLoading && <p>جارٍ تحميل المستخدمين…</p>}{members.isError && <p role="alert">تعذّر تحميل الحسابات.<Button variant="link" onClick={() => void members.refetch()}>أعد المحاولة</Button></p>}
        {(members.data ?? []).filter((m) => `${m.display_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())).map((member) => { const isAdmin = roles.data?.some((r) => r.user_id === member.user_id && r.role === "admin"); return <article className="ai-admin-member" key={member.user_id}><div><strong>{member.display_name || "عضو"}</strong><small dir="ltr">{member.email}</small><span>{member.suspended ? "معطّل" : "فعّال"} · {isAdmin ? "مسؤول" : "عضو"}</span></div><div className="flex flex-wrap gap-2"><Button disabled={busy || member.user_id === user?.id} variant="outline" onClick={() => { if (window.confirm(member.suspended ? "تفعيل هذا الحساب؟" : "تعطيل هذا الحساب؟")) void run(async () => { await changeStatus({ data: { userId: member.user_id, suspended: !member.suspended } }); await members.refetch(); }, "تم تحديث حالة الحساب."); }}>{member.suspended ? "تفعيل" : "تعطيل"}</Button><Button disabled={busy || member.user_id === user?.id || roles.isError || roles.isLoading} variant="outline" onClick={() => { if (window.confirm(isAdmin ? "سحب صلاحية المسؤول؟" : "منح صلاحية المسؤول لهذا العضو؟")) void run(async () => { await changeRole({ data: { userId: member.user_id, role: isAdmin ? "user" : "admin" } }); await roles.refetch(); }, "تم تحديث الصلاحية."); }}>{isAdmin ? "تحويل لعضو" : "منح إدارة"}</Button></div></article>; })}
        {members.data?.length === 0 && <p>لا توجد حسابات بعد.</p>}
      </section>}
      {tab === "inbox" && <section className="ai-admin-section">{inbox.isLoading && <p>جارٍ تحميل الرسائل…</p>}{inbox.isError && <p role="alert">تعذّر تحميل الرسائل.<Button variant="link" onClick={() => void inbox.refetch()}>أعد المحاولة</Button></p>}{inbox.data?.length === 0 && <p>صندوق الوارد فارغ.</p>}{(inbox.data ?? []).map((message) => <article key={message.id} className="ai-admin-message"><header><div><strong>{message.name}</strong><a href={`mailto:${message.email}`}>{message.email}</a><small>{new Date(message.created_at).toLocaleString("ar-SA")}</small></div><span>{message.is_read ? "مقروءة" : "جديدة"}</span></header><p>{message.message}</p><footer><Button asChild variant="outline"><a href={`mailto:${message.email}`}>رد بالبريد</a></Button>{!message.is_read && <Button disabled={busy} variant="outline" onClick={() => void run(async () => { const { error } = await supabase.from("ai_contact_messages").update({ is_read: true }).eq("id", message.id); if (error) throw error; await inbox.refetch(); }, "تم تحديد الرسالة كمقروءة.")}><Check />تمت القراءة</Button>}<Button disabled={busy} variant="ghost" size="icon" title="حذف الرسالة" aria-label={`حذف رسالة ${message.name}`} onClick={() => { if (window.confirm("حذف هذه الرسالة نهائيًا؟")) void run(async () => { const { error } = await supabase.from("ai_contact_messages").delete().eq("id", message.id); if (error) throw error; await inbox.refetch(); }, "تم حذف الرسالة."); }}><Trash2 /></Button></footer></article>)}</section>}
      {tab === "security" && <section className="ai-admin-section"><h2>تغيير كلمة مرور الإدارة</h2><form className="ai-workspace-form" onSubmit={(e) => { e.preventDefault(); if (!user) return; void run(async () => { const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword }); if (error) throw new Error("تعذّر تغيير كلمة المرور؛ تحقق من الكلمة الحالية واختر كلمة جديدة أقوى."); setNewPassword(""); setCurrentPassword(""); }, "تم تغيير كلمة مرور حساب الإدارة."); }}><label>كلمة المرور الحالية<input required type="password" autoComplete="current-password" className="ai-workspace-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label>كلمة مرور جديدة<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" className="ai-workspace-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><Button type="submit" disabled={busy || newPassword.length < 8 || !currentPassword}><LockKeyhole />حفظ كلمة المرور</Button></form></section>}
    </main></div>
  </div>;
}