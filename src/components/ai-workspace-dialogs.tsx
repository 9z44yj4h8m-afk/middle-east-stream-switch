import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Download, File, MessageSquare, Trash2, Upload } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMember } from "@/components/member-provider";
import { supabase } from "@/integrations/supabase/client";
import { type AiPageConfig } from "@/lib/ai-page-config";
import { downloadAiText, parseAiLibrary, type AiConversation } from "@/lib/ai-workspace";
import { submitAiContact } from "@/lib/ai-workspace.functions";

type Props = { view: "library" | "contact" | null; onClose: () => void; config: AiPageConfig; theme: CSSProperties; localConversations: AiConversation[]; onSelect: (chat: AiConversation) => void; onDelete: (id: string) => void };

export function AiWorkspaceDialogs({ view, onClose, config, theme, localConversations, onSelect, onDelete }: Props) {
  const { user } = useMember();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"chats" | "files" | "outputs">("chats");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitContact = useServerFn(submitAiContact);
  const chatsQuery = useQuery({ queryKey: ["ai-library", user?.id], enabled: view === "library" && !!user, queryFn: async () => {
    const { data, error } = await supabase.from("ai_conversations").select("id,title,messages,updated_at").order("updated_at", { ascending: false });
    if (error) throw new Error("تعذّر تحميل مكتبتك.");
    return parseAiLibrary(data);
  } });
  const filesQuery = useQuery({ queryKey: ["ai-library-files", user?.id], enabled: view === "library" && !!user, queryFn: async () => {
    const { data, error } = await supabase.from("ai_library_files").select("id,name,path,size,created_at").order("created_at", { ascending: false });
    if (error) throw new Error("تعذّر تحميل الملفات.");
    return data ?? [];
  } });
  const merged = new Map<string, AiConversation>();
  for (const chat of [...(chatsQuery.data ?? []), ...localConversations]) merged.set(chat.id, chat);
  const chats = [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).filter((chat) => chat.title.includes(search) || chat.messages.some((m) => m.content.includes(search)));

  async function deleteChat(id: string) {
    if (!window.confirm("هل تريد حذف المحادثة؟")) return;
    setStatus("");
    if (user) { const { error } = await supabase.from("ai_conversations").delete().eq("id", id); if (error) { setStatus("تعذّر حذف المحادثة."); return; } }
    onDelete(id); await qc.invalidateQueries({ queryKey: ["ai-library", user?.id] });
  }
  async function uploadFile(file: globalThis.File) {
    if (!user) return;
    setBusy(true); setStatus("");
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9_.-]/gi, "_")}`;
    try {
      const { error } = await supabase.storage.from("ai-library").upload(path, file);
      if (error) throw new Error("تعذّر الرفع؛ اختر PDF أو نصًا أو صورة بحجم لا يتجاوز 10 ميجابايت.");
      const { error: saveError } = await supabase.from("ai_library_files").insert({ user_id: user.id, name: file.name, path, size: file.size });
      if (saveError) { await supabase.storage.from("ai-library").remove([path]); throw new Error("تعذّر حفظ الملف."); }
      await qc.invalidateQueries({ queryKey: ["ai-library-files", user.id] }); setStatus("تم حفظ الملف.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "تعذّر رفع الملف."); }
    finally { setBusy(false); }
  }
  async function downloadFile(path: string, name: string) {
    const { data, error } = await supabase.storage.from("ai-library").download(path);
    if (error || !data) { setStatus("تعذّر تنزيل الملف."); return; }
    const url = URL.createObjectURL(data); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function deleteFile(id: string, path: string) {
    if (!window.confirm("هل تريد حذف الملف؟")) return;
    const { error } = await supabase.storage.from("ai-library").remove([path]);
    if (error) { setStatus("تعذّر حذف الملف."); return; }
    const { error: rowError } = await supabase.from("ai_library_files").delete().eq("id", id);
    if (rowError) setStatus("تعذّر حذف بيانات الملف.");
    await qc.invalidateQueries({ queryKey: ["ai-library-files", user?.id] });
  }

  return <Dialog open={view !== null} onOpenChange={(open) => { if (!open) { onClose(); setStatus(""); } }}>
    <DialogContent dir="rtl" style={theme} className="ai-workspace-dialog">
      <DialogTitle>{view === "contact" ? "راسلني" : "المكتبة"}</DialogTitle>
      <DialogDescription>{view === "contact" ? "تواصل مع أحمد المغني" : user ? "محادثاتك وملفاتك ومخرجاتك" : "محادثات هذا الجهاز"}</DialogDescription>
      {view === "library" ? <>
        <div className="ai-workspace-tabs" role="tablist" aria-label="المكتبة">{([ ["chats", "المحادثات"], ["files", "الملفات"], ["outputs", "المخرجات"] ] as const).map(([key, label]) => <Button key={key} role="tab" aria-selected={tab === key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>{label}</Button>)}</div>
        <input className="ai-workspace-input" aria-label="البحث في المكتبة" placeholder="ابحث في مكتبتك…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {!user && <Button asChild variant="outline"><Link to="/auth">دخول / إنشاء حساب لحفظ المكتبة والملفات</Link></Button>}
        <div className="ai-workspace-list">
          {chatsQuery.isLoading && <p>جارٍ تحميل المكتبة…</p>}
          {(chatsQuery.isError || filesQuery.isError) && <p role="alert">تعذّر تحميل المكتبة. <Button variant="link" onClick={() => { void chatsQuery.refetch(); void filesQuery.refetch(); }}>أعد المحاولة</Button></p>}
          {tab === "chats" && (chats.length ? chats.map((chat) => <article className="ai-workspace-row" key={chat.id}>
            <Button variant="ghost" className="ai-workspace-open" onClick={() => { onSelect(chat); onClose(); }}><MessageSquare /><span>{chat.title}<small>{new Date(chat.updated_at).toLocaleDateString("ar-SA")} · {chat.messages.length} رسالة</small></span></Button>
            <Button variant="ghost" size="icon" title="تنزيل المحادثة" aria-label={`تنزيل ${chat.title}`} onClick={() => downloadAiText(`${chat.title}.txt`, chat.messages.map((m) => `${m.role === "user" ? "أنت" : "المساعد"}: ${m.content}`).join("\n\n"))}><Download /></Button>
            <Button variant="ghost" size="icon" title="حذف المحادثة" aria-label={`حذف ${chat.title}`} onClick={() => void deleteChat(chat.id)}><Trash2 /></Button>
          </article>) : <p className="ai-workspace-empty">لا توجد محادثات محفوظة بعد.</p>)}
          {tab === "outputs" && (chats.flatMap((chat) => chat.messages.filter((m) => m.role === "assistant" && m.content).map((m) => <article key={`${chat.id}-${m.id}`} className="ai-workspace-output"><h3>{chat.title}</h3><p>{m.content}</p><Button variant="outline" onClick={() => downloadAiText(`${chat.title}.txt`, m.content)}><Download />تنزيل المخرج</Button></article>)))}
          {tab === "outputs" && !chats.some((c) => c.messages.some((m) => m.role === "assistant" && m.content)) && <p className="ai-workspace-empty">لا توجد مخرجات بعد.</p>}
          {tab === "files" && <>
            {user && <><Button disabled={busy} variant="outline" onClick={() => fileRef.current?.click()}><Upload />{busy ? "جارٍ الرفع…" : "رفع ملف"}</Button><input hidden ref={fileRef} type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp" aria-label="رفع ملف للمكتبة" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadFile(file); e.target.value = ""; }} /></>}
            {(filesQuery.data ?? []).filter((f) => f.name.includes(search)).map((file) => <article key={file.id} className="ai-workspace-row"><File /><span className="flex-1 min-w-0 break-words">{file.name}<small>{Math.ceil(file.size / 1024)} كيلوبايت</small></span><Button variant="ghost" size="icon" aria-label={`تنزيل ${file.name}`} title="تنزيل الملف" onClick={() => void downloadFile(file.path, file.name)}><Download /></Button><Button variant="ghost" size="icon" aria-label={`حذف ${file.name}`} title="حذف الملف" onClick={() => void deleteFile(file.id, file.path)}><Trash2 /></Button></article>)}
            {user && filesQuery.data?.length === 0 && <p className="ai-workspace-empty">لم ترفع ملفات بعد.</p>}
          </>}
        </div>
      </> : <>
        <div className="ai-workspace-tabs">
          <Button asChild variant="outline"><a href={`mailto:${config.contactEmail}`}>البريد</a></Button>
          {config.contactWhatsapp && <Button asChild variant="outline"><a href={`https://wa.me/${config.contactWhatsapp}`} target="_blank" rel="noreferrer">واتساب</a></Button>}
          {config.contactX && <Button asChild variant="outline"><a href={`https://x.com/${config.contactX}`} target="_blank" rel="noreferrer">إكس</a></Button>}
          {config.contactSnapchat && <Button asChild variant="outline"><a href={`https://www.snapchat.com/add/${config.contactSnapchat}`} target="_blank" rel="noreferrer">سناب شات</a></Button>}
        </div>
        <form className="ai-workspace-form" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); setBusy(true); setStatus(""); void submitContact({ data: { name: String(data.get("name")), email: String(data.get("email")), message: String(data.get("message")), website: String(data.get("website") ?? "") } }).then(() => { form.reset(); setStatus("وصلت رسالتك بنجاح."); }).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "تعذّر الإرسال.")).finally(() => setBusy(false)); }}>
          <label>الاسم<input className="ai-workspace-input" name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label>البريد الإلكتروني<input className="ai-workspace-input" name="email" type="email" required maxLength={120} autoComplete="email" dir="ltr" defaultValue={user?.email ?? ""} /></label>
          <label>رسالتك<textarea className="ai-workspace-input" name="message" required minLength={3} maxLength={4000} rows={4} /></label>
          <input hidden name="website" tabIndex={-1} autoComplete="off" />
          <Button type="submit" disabled={busy}>{busy ? "جارٍ الإرسال…" : "إرسال الرسالة"}</Button>
        </form>
      </>}
      {status && <p role="status">{status}</p>}
    </DialogContent>
  </Dialog>;
}