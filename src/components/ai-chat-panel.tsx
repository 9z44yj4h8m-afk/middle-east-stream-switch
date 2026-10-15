import { Link } from "@tanstack/react-router";
import { ExternalLink, Bell, BellOff, CheckCheck } from "lucide-react";
import { useRef, useState } from "react";

import { LiveChat } from "@/components/live-chat";
import { Button } from "@/components/ui/button";

// ALMOGHANI AI room: messages are stored in the shared chat and answered by the site's bots.
export function AiChatPanel({ embedded = false, voice = false }: { embedded?: boolean; voice?: boolean }) {
  const [notifications, setNotifications] = useState(false);
  const [replyNotice, setReplyNotice] = useState("");
  const [notificationNote, setNotificationNote] = useState("");
  const enabled = useRef(false);

  async function toggleNotifications() {
    if (notifications) { enabled.current = false; setNotifications(false); return; }
    if (!("Notification" in window)) { setNotificationNote("إشعارات المتصفح غير متاحة هنا؛ سيظهر تنبيه داخل الشاشة عند الرد."); return; }
    const ok = (await Notification.requestPermission()) === "granted";
    enabled.current = ok; setNotifications(ok);
    setNotificationNote(ok ? "تم تفعيل إشعارات الرد أثناء فتح الموقع." : "لم تُفعّل إشعارات المتصفح؛ يبقى تنبيه الرد داخل الشاشة.");
  }

  function onIncoming(m: { display_name: string; body: string }) {
    if (!m.display_name) return;
    setReplyNotice(`رسالة جديدة من ${m.display_name}`);
    if (enabled.current && "Notification" in window && Notification.permission === "granted" && document.visibilityState === "hidden") {
      try { new Notification(m.display_name, { body: m.body.slice(0, 120), tag: "almoghani-chat" }); } catch { /* in-page notice remains */ }
    }
  }

  return (
    <div dir="rtl" className={embedded ? "member-ai-screen classic-chat-embedded flex flex-col text-foreground" : "classic-chat-shell flex flex-col bg-background text-foreground"}>
      <header className="classic-chat-topbar border-b border-border/70 bg-background/90">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="sr-only">الدردشة — ALMOGHANI</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={toggleNotifications} aria-label={notifications ? "إيقاف إشعارات الرد" : "تفعيل إشعارات الرد"} aria-pressed={notifications}>{notifications ? <Bell /> : <BellOff />}</Button>
            <Button asChild variant="outline" size="sm"><Link to="/" target="_blank" rel="noopener noreferrer" aria-label="الرئيسية في صفحة جديدة"><ExternalLink className="h-4 w-4" />الرئيسية</Link></Button>
          </div>
        </div>
      </header>
      {notificationNote && <p role="status" className="border-b border-sky/40 px-4 py-2 text-xs text-muted-foreground">{notificationNote}</p>}
      {replyNotice && <div role="status" className="flex items-center gap-2 border-b border-sky/40 bg-secondary px-4 py-2 text-sm text-sky"><CheckCheck className="h-4 w-4" />{replyNotice}<Button size="icon-sm" variant="ghost" className="mr-auto" aria-label="إخفاء التنبيه" onClick={() => setReplyNotice("")}>×</Button></div>}
      <LiveChat bare voice={voice} onIncoming={onIncoming} />
    </div>
  );
}
