import { useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { botAvatarUrl } from "@/lib/bot-avatars";

export function BotAvatar({ path, name, fallback }: { path?: string | undefined; name: string; fallback: string }) {
  const [open, setOpen] = useState(false);
  const src = botAvatarUrl(path);
  if (!src) return <span className="classic-chat-avatar overflow-hidden" title={name}>{/^[\p{L}\p{M}\p{P}\p{S}\s]$/u.test(fallback) ? <UserRound aria-label={`صورة ${name} غير متاحة`} /> : fallback}</span>;
  return <Dialog open={open} onOpenChange={setOpen}><Button type="button" variant="ghost" className="classic-chat-avatar overflow-hidden p-0" aria-label={`تكبير صورة ${name}`} onClick={(e) => { e.stopPropagation(); setOpen(true); }}><img src={src} alt={`صورة ${name}`} width={120} height={120} className="h-full w-full object-contain" /></Button><DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-md"><DialogTitle>{name}</DialogTitle><img src={src} alt={`صورة ${name}`} className="max-h-[60dvh] w-full object-contain" /></DialogContent></Dialog>;
}
