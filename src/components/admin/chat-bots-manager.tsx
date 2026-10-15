import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { BotAvatar } from "@/components/bot-avatar";
import { siteConfigKey } from "@/lib/site-config";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { adminPostChat, defaultChatBots, type ChatBotsConfig } from "@/lib/chat-bots.functions";

const field = "h-10 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none";

export function ChatBotsManager() {
  const [cfg, setCfg] = useState<ChatBotsConfig>(defaultChatBots);
  const [note, setNote] = useState("");
  const [newName, setNewName] = useState(""); const [newStyle, setNewStyle] = useState("");
  const [newReply, setNewReply] = useState("");
  const [postName, setPostName] = useState(""); const [postBody, setPostBody] = useState("");
  const postChat = useServerFn(adminPostChat);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    void supabase.from("site_settings").select("value").eq("key", "chat_bots").maybeSingle().then(({ data }) => {
      const v = (data?.value ?? {}) as Partial<ChatBotsConfig>;
      setCfg({ ...defaultChatBots, ...v, bots: v.bots?.length ? v.bots : defaultChatBots.bots, replies: v.replies ?? [] });
    });
  }, []);

  async function save(next: ChatBotsConfig) {
    const { error } = await supabase.from("site_settings").upsert({ key: "chat_bots", value: next as never, updated_at: new Date().toISOString() });
    if (!error) { setCfg(next); void qc.invalidateQueries({ queryKey: siteConfigKey }); }
    setNote(error ? "تعذّر الحفظ" : "تم الحفظ ✓");
    return !error;
  }
  async function uploadAvatar(index: number, file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) { setNote("اختر صورة JPG أو PNG أو WebP أو GIF بحجم أقل من 2 ميجابايت."); return; }
    setUploading(index); setNote("");
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type];
    const path = `avatars/${crypto.randomUUID()}.${ext}`;
    try {
      const { error } = await supabase.storage.from("bot-avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const old = cfg.bots[index]?.avatar;
      const ok = await save({ ...cfg, bots: cfg.bots.map((bot, i) => i === index ? { ...bot, avatar: path } : bot) });
      if (!ok) { await supabase.storage.from("bot-avatars").remove([path]); return; }
      if (old) await supabase.storage.from("bot-avatars").remove([old]);
      setNote("تم حفظ الصورة الشخصية ✓");
    } catch { setNote("تعذّر رفع الصورة؛ حاول مجددًا."); }
    finally { setUploading(null); }
  }
  const toggle = (k: "enabled" | "replyEnabled" | "banterEnabled" | "useAi", label: string) => (
    <Button type="button" variant={cfg[k] ? "default" : "outline"} onClick={() => save({ ...cfg, [k]: !cfg[k] })}>{label}: {cfg[k] ? "شغّال" : "متوقف"}</Button>
  );

  return <div className="space-y-6">
    {note && <p role="status" className="text-sm text-sky">{note}</p>}
    <section className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
      <h3 className="font-black">تشغيل البوتات</h3>
      <div className="flex flex-wrap gap-2">
        {toggle("enabled", "كل البوتات")}{toggle("replyEnabled", "الرد على الزوار")}{toggle("banterEnabled", "السوالف بينهم")}{toggle("useAi", "الردود الذكية")}
      </div>
      <p className="text-xs text-muted-foreground">إذا أوقفت «الردود الذكية» تستخدم البوتات ردودك الجاهزة فقط.</p>
    </section>

    <section className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
      <h3 className="font-black">الأسماء ({cfg.bots.length})</h3>
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input className={field} placeholder="الاسم" maxLength={30} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input className={field} placeholder="الشخصية (مثال: يحب الكورة ومرح)" maxLength={150} value={newStyle} onChange={(e) => setNewStyle(e.target.value)} />
        <Button type="button" disabled={!newName.trim()} onClick={() => { void save({ ...cfg, bots: [...cfg.bots, { name: newName.trim(), style: newStyle.trim() || "ودود يسولف مع الناس" }] }); setNewName(""); setNewStyle(""); }}><Plus />إضافة</Button>
      </div>
      <ul className="divide-y divide-border">{cfg.bots.map((b, i) => <li key={i} className="grid items-center gap-2 py-2 sm:grid-cols-[auto_1fr_2fr_auto]" aria-label={`إعدادات ${b.name}`}>
        <div className="flex items-center gap-2"><BotAvatar name={b.name} path={b.avatar} fallback={b.name.charAt(0)} /><Button type="button" variant="outline" size="icon" disabled={uploading !== null} title={`رفع صورة ${b.name}`} aria-label={`رفع صورة ${b.name}`} onClick={() => document.getElementById(`bot-avatar-${i}`)?.click()}><Upload /></Button><input id={`bot-avatar-${i}`} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" aria-label={`صورة ${b.name}`} onChange={(e) => { void uploadAvatar(i, e.target.files?.[0]); e.target.value = ""; }} />{uploading === i && <span className="text-xs">جارٍ الرفع…</span>}{b.avatar && <Button type="button" variant="ghost" size="icon-xs" disabled={uploading !== null} title="إزالة الصورة" aria-label={`إزالة صورة ${b.name}`} onClick={async () => { if (await save({ ...cfg, bots: cfg.bots.map((bot, j) => j === i ? { ...bot, avatar: "" } : bot) })) await supabase.storage.from("bot-avatars").remove([b.avatar ?? ""]); }}><X /></Button>}</div>
        <input className={field} aria-label="الاسم" defaultValue={b.name} onBlur={(e) => e.target.value.trim() && e.target.value !== b.name && save({ ...cfg, bots: cfg.bots.map((x, j) => j === i ? { ...x, name: e.target.value.trim() } : x) })} />
        <input className={field} aria-label="الشخصية" defaultValue={b.style} onBlur={(e) => e.target.value !== b.style && save({ ...cfg, bots: cfg.bots.map((x, j) => j === i ? { ...x, style: e.target.value } : x) })} />
        <Button size="icon" variant="ghost" aria-label="حذف الاسم" disabled={cfg.bots.length <= 1} onClick={() => save({ ...cfg, bots: cfg.bots.filter((_, j) => j !== i) })}><Trash2 className="text-destructive" /></Button>
      </li>)}</ul>
    </section>

    <section className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
      <h3 className="font-black">الردود الجاهزة ({cfg.replies.length})</h3>
      <p className="text-xs text-muted-foreground">اكتب {"{name}"} داخل الرد ليُستبدل باسم الزائر.</p>
      <div className="flex gap-2">
        <input className={field} placeholder="مثال: هلا {name} نورت الشات" maxLength={300} value={newReply} onChange={(e) => setNewReply(e.target.value)} />
        <Button type="button" disabled={!newReply.trim()} onClick={() => { void save({ ...cfg, replies: [...cfg.replies, newReply.trim()] }); setNewReply(""); }}><Plus />إضافة</Button>
      </div>
      <ul className="divide-y divide-border">{cfg.replies.map((r, i) => <li key={i} className="flex items-center gap-2 py-2"><span className="flex-1 break-words">{r}</span>
        <Button size="icon" variant="ghost" aria-label="حذف الرد" onClick={() => save({ ...cfg, replies: cfg.replies.filter((_, j) => j !== i) })}><Trash2 className="text-destructive" /></Button></li>)}</ul>
    </section>

    <section className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
      <h3 className="font-black">اكتب في الشات باسم أي أحد</h3>
      <input className={field} list="bot-names" placeholder="الاسم" maxLength={30} value={postName} onChange={(e) => setPostName(e.target.value)} />
      <datalist id="bot-names">{cfg.bots.map((b) => <option key={b.name} value={b.name} />)}</datalist>
      <div className="flex gap-2">
        <input className={field} placeholder="الرسالة" maxLength={300} value={postBody} onChange={(e) => setPostBody(e.target.value)} />
        <Button type="button" disabled={!postName.trim() || !postBody.trim()} onClick={async () => { try { await postChat({ data: { name: postName, body: postBody } }); setPostBody(""); setNote("أُرسلت الرسالة ✓"); } catch { setNote("تعذّر الإرسال"); } }}>إرسال</Button>
      </div>
    </section>
  </div>;
}
