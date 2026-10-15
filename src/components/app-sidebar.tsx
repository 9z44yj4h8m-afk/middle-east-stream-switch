import { safeLibraryLink, useSiteConfig } from "@/lib/site-config";
import { Link, useRouterState } from "@tanstack/react-router";
import { Clapperboard, Film, Home, Mail, MessageCircle, Radio, Settings, Star, Tv } from "lucide-react";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/live", label: "البث المباشر", icon: Radio },
  { to: "/featured", label: "القنوات المميزة", icon: Star },
  { to: "/vip", label: "المكتبة الخاصة", icon: Tv },
  { to: "/movies", label: "الأفلام", icon: Film },
  { to: "/chat", label: "ALMOGHANI AI", icon: MessageCircle },
  { to: "/subscription", label: "الاشتراك", icon: Clapperboard },
  { to: "/contact", label: "للتواصل", icon: Mail },
  { to: "/admin", label: "الإعدادات", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const libraryLink = safeLibraryLink(useSiteConfig().data?.texts.libraryLink);
  return (
    <aside className="dash-sidebar fixed inset-y-0 right-0 z-40 hidden w-60 flex-col border-l border-border px-4 py-6 lg:flex">
      <Link to="/" className="mb-8 flex flex-col items-center gap-2">
        <span className="grid h-16 w-16 place-items-center rounded-2xl broadcast-button">
          <Tv className="h-8 w-8 text-primary-foreground" />
        </span>
        <span className="font-display text-2xl font-black tracking-wide text-sky">ALMOGHANI</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to === "/vip" ? (libraryLink as "/vip") : to}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                active ? "dash-active text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-foreground" : "text-sky"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-6 text-center text-xs text-muted-foreground">ALMOGHANI · بث بلا حدود</p>
    </aside>
  );
}
