import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const MemberContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const useMember = () => useContext(MemberContext);
export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (!active) return;
      if (event === "SIGNED_OUT") { queryClient.clear(); setUser(null); setReady(true); }
      else {
        void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setReady(true); } });
      }
      if (event !== "INITIAL_SESSION") {
        void router.invalidate();
        if (session) void queryClient.invalidateQueries();
      }
    });
    void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setReady(true); } });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [queryClient, router]);
  return <MemberContext.Provider value={{ user, ready }}>{children}</MemberContext.Provider>;
}