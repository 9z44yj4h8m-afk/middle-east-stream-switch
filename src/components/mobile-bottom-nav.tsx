import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, MoreHorizontal, MessagesSquare } from "lucide-react";
import { useSiteConfig, defaultTicker } from "@/lib/site-config";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/sections", label: "الأقسام", icon: LayoutGrid },
  { to: "/live-chat", label: "الدردشة", icon: MessagesSquare },
  { to: "/contact", label: "المزيد", icon: MoreHorizontal },
] as const;

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <nav className="broadcast-bottom-nav" aria-label="التنقل السريع">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link key={to} to={to} className={`broadcast-nav-item ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function BreakingTicker() {
  const { data } = useSiteConfig();
  const ticker = data?.ticker ?? defaultTicker;
  if (!ticker.enabled) return null;
  return (
    <div className="reference-ticker flex items-stretch overflow-hidden border-y border-border bg-surface-deep">
      <button
        type="button"
        onClick={() => document.getElementById("home-category-banners")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="z-10 flex shrink-0 items-center bg-primary px-5 py-2 font-display text-lg font-black text-primary-foreground [clip-path:polygon(0_0,100%_0,100%_100%,12%_100%)]"
        aria-label="الانتقال إلى الأقسام"
      >
        القائمة
      </button>
      <div className="relative flex-1 overflow-hidden">
        <span className="ticker-wordmark" dir="ltr">ALMOGHANI <span>LIVE</span></span>
        <p className="news-ticker flex min-h-14 w-max items-center gap-2 whitespace-nowrap text-sm text-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {ticker.text}
        </p>
      </div>
    </div>
  );
}
