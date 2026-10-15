import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Owner switches for the chat, stored in site_settings key "chat_control". */
export type ChatControl = { hideMessages: boolean; micsOpen: boolean; voiceOpen: boolean; announcement: string };
export const defaultChatControl: ChatControl = { hideMessages: false, micsOpen: true, voiceOpen: true, announcement: "" };

export function normalizeChatControl(raw: unknown): ChatControl {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ChatControl>;
  return {
    hideMessages: typeof r.hideMessages === "boolean" ? r.hideMessages : false,
    micsOpen: typeof r.micsOpen === "boolean" ? r.micsOpen : true,
    voiceOpen: typeof r.voiceOpen === "boolean" ? r.voiceOpen : true,
    announcement: typeof r.announcement === "string" ? r.announcement.slice(0, 200) : "",
  };
}

export function useChatControl() {
  return useQuery({
    queryKey: ["chat-control"],
    queryFn: async () => normalizeChatControl((await supabase.from("site_settings").select("value").eq("key", "chat_control").maybeSingle()).data?.value),
    refetchInterval: 15000,
  });
}

export type ChatBan = { name: string; kind: string; until: string | null; reason: string };
export function useChatBans() {
  return useQuery({
    queryKey: ["chat-bans"],
    queryFn: async () => ((await supabase.from("chat_bans").select("name,kind,until,reason").order("created_at", { ascending: false })).data ?? []) as ChatBan[],
    refetchInterval: 20000,
  });
}
export const isActiveBan = (b: ChatBan) => !b.until || new Date(b.until).getTime() > Date.now();
