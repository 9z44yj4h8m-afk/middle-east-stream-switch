import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChatBotsManager } from "@/components/admin/chat-bots-manager";
import { ChatAppearanceEditor } from "@/components/admin/chat-appearance-editor";
import { VoiceChatManager } from "@/components/admin/voice-chat-manager";
import { ChatModerationManager } from "@/components/admin/chat-moderation-manager";
import { ChatRoomsManager } from "@/components/admin/chat-rooms-manager";
import { useSiteConfig, siteConfigKey, defaultChat } from "@/lib/site-config";

export function ChatToggle() {
  const { data } = useSiteConfig();
  const qc = useQueryClient();
  const enabled = (data?.chat ?? defaultChat).enabled;
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-4">
    <span className="flex-1 font-bold">الدردشة {enabled ? "مفعّلة" : "متوقفة"}</span>
    <Button variant={enabled ? "outline" : "default"} onClick={async () => {
      await supabase.from("site_settings").upsert({ key: "chat", value: { enabled: !enabled } as never, updated_at: new Date().toISOString() });
      void qc.invalidateQueries({ queryKey: siteConfigKey });
    }}>{enabled ? "إيقاف" : "تشغيل"}</Button>
  </div>;
}

export function ChatMessagesAdmin() {
  const msgs = useQuery({ queryKey: ["admin-chat"], queryFn: async () => (await supabase.from("chat_messages").select("id,display_name,body,created_at").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  return <ul className="divide-y divide-border">{(msgs.data ?? []).map((m) => <li key={m.id} className="flex items-start gap-2 py-3">
    <span className="min-w-0 flex-1"><b>{m.display_name || "زائر"}</b> <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</span><span className="block break-words">{m.body}</span></span>
    <Button size="icon" variant="ghost" aria-label="حذف" onClick={async () => { await supabase.from("chat_messages").delete().eq("id", m.id); void msgs.refetch(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
  </li>)}</ul>;
}

export const CHAT_ADMIN_SECTIONS = [
  { id: "toggle", label: "تشغيل الدردشة", content: ChatToggle },
  { id: "appearance", label: "شكل الشات", content: ChatAppearanceEditor },
  { id: "bots", label: "المستخدمين والبوتات", content: ChatBotsManager },
  { id: "voice", label: "الأصوات والشات الصوتي", content: VoiceChatManager },
  { id: "rooms", label: "الغرف", content: ChatRoomsManager },
  { id: "moderation", label: "الحظر والمراقبة", content: ChatModerationManager },
  { id: "messages", label: "الرسائل", content: ChatMessagesAdmin },
];
