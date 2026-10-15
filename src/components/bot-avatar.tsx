import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function BotAvatar({ path, name, fallback }: { path?: string | undefined; name: string; fallback: string }) {
  const [open, setOpen] = useState(false);
  const safePath = path && /^avatars\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(path) ? path : "";
  const { data } = useQuery({
    queryKey: ["bot-avatar", safePath], enabled: !!safePath,
    queryFn: async () => { const { data, error } = await supabase.storage.from("bot-avatars").createSignedUrl(safePath, 3600); if (error) throw error; return data.signedUrl; },
    staleTime: 45 * 60_000, refetchInterval: 45 * 60_000, retry: 1,
  });
  if (!data) return <span className="classic-chat-avatar overflow-hidden" title={name}>{/^[\p{L}\p{M}\p{P}\p{S}\s]$/u.test(fallback) ? <UserRound aria-label={`صورة ${name} غير متاحة`} /> : fallback}</span>;
  return <Dialog open={open} onOpenChange={setOpen}><Button type="button" variant="ghost" className="classic-chat-avatar overflow-hidden p-0" aria-label={`تكبير صورة ${name}`} onClick={(e) => { e.stopPropagation(); setOpen(true); }}><img src={data} alt={`صورة ${name}`} width={120} height={120} className="h-full w-full object-contain" /></Button><DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-md"><DialogTitle>{name}</DialogTitle><img src={data} alt={`صورة ${name}`} className="max-h-[60dvh] w-full object-contain" /></DialogContent></Dialog>;
}