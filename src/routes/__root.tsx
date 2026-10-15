import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BroadcastHeader, BroadcastFooter } from "@/components/broadcast-shell";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { MemberProvider } from "@/components/member-provider";
import { designColorFields, useSiteConfig } from "@/lib/site-config";
import { IosInstallBanner } from "@/components/ios-install-banner";
import { getGateStatus } from "@/lib/site-gate.functions";
import { redirect } from "@tanstack/react-router";

let gateUnlocked = false;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const ADMIN_MANIFESTS: Record<string, string> = {
  "/22": "/22.webmanifest",
  "/admin": "/admin.webmanifest",
  "/admin-chat": "/admin-chat.webmanifest",
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const p = location.pathname;
    if (!(p === "/22" || p === "/vip" || p === "/app")) return;
    if (typeof window !== "undefined" && gateUnlocked) return;
    const { unlocked } = await getGateStatus();
    if (!unlocked) throw redirect({ to: "/unlock", search: { to: location.href } });
    if (typeof window !== "undefined") gateUnlocked = true;
  },
  head: ({ matches }) => {
    const leafPath = matches[matches.length - 1]?.pathname ?? "/";
    const manifestHref = ADMIN_MANIFESTS[leafPath] ?? "/manifest.webmanifest";
    return ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "المغني لايف" },
      { name: "description", content: "منصة عربية لمشاهدة البث المباشر داخل الموقع." },
      { name: "author", content: "المغني لايف" },
      { name: "theme-color", content: "#090A18" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "المغني" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "المغني لايف" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://almoghani.net/#organization",
              name: "المغني لايف",
              alternateName: ["ALMOGHANI LIVE", "Almoghani Live", "almoghani.net"],
              url: "https://almoghani.net",
              logo: "https://almoghani.net/icon-512.png",
              email: "ahmed@almoghani.net",
              sameAs: ["https://x.com/Op430", "https://www.snapchat.com/add/Ls460g", "https://wa.me/966557073007"],
            },
            {
              "@type": "WebSite",
              "@id": "https://almoghani.net/#website",
              url: "https://almoghani.net",
              name: "المغني لايف",
              alternateName: ["ALMOGHANI LIVE", "almoghani.net"],
              inLanguage: "ar",
              publisher: { "@id": "https://almoghani.net/#organization" },
            },
          ],
        }),
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: manifestHref },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800;900&family=Outfit:wght@600;700;800;900&family=Cairo:wght@600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Amiri+Quran&family=Tajawal:wght@400;700;900&family=Almarai:wght@400;700;800&family=Noto+Kufi+Arabic:wght@400;700;900&family=Changa:wght@400;700;800&family=Readex+Pro:wght@400;700&family=El+Messiri:wght@400;700&display=swap" },
    ],
    });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const embeddedChat = useRouterState({ select: (state) => state.location.pathname === "/chat" || state.location.pathname === "/live-chat" || state.location.pathname === "/voice-chat" || state.location.pathname === "/22" || state.location.pathname === "/unlock" });

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <MemberProvider><SiteDesignStyle />{embeddedChat ? <Outlet /> : <><div className="broadcast-app"><BroadcastHeader /><div className="broadcast-content"><Outlet /></div><MobileBottomNav /><BroadcastFooter /></div><IosInstallBanner /></>}</MemberProvider>
    </QueryClientProvider>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;
function SiteDesignStyle() {
  const { data } = useSiteConfig();
  const d = data?.design;
  if (!d) return null;
  const rules: string[] = [];
  if (HEX.test(d.primary)) rules.push(`--primary:${d.primary};`);
  if (HEX.test(d.accent)) rules.push(`--accent:${d.accent};--sky:${d.accent};--vip-cyan:${d.accent};--ring:${d.accent};`);
  for (const f of designColorFields) { const v = d.colors?.[f.key]; if (v && HEX.test(v)) for (const n of f.vars) rules.push(`${n}:${v};`); }
  const safe = (f?: string) => (f && /^[A-Za-z ]{2,40}$/.test(f) ? f : "");
  const body = safe(d.fontBody), heading = safe(d.fontHeading);
  const scale = typeof d.fontScale === "number" && d.fontScale >= 85 && d.fontScale <= 130 ? d.fontScale : 0;
  let extra = "";
  if (body) extra += `body,.font-sans{font-family:"${body}",sans-serif !important;}`;
  if (heading) extra += `h1,h2,h3,.font-display{font-family:"${heading}",sans-serif !important;}`;
  if (typeof d.radius === "number" && d.radius >= 0 && d.radius <= 32) extra += `.rounded-lg,.rounded-xl,.rounded-2xl,.rounded-3xl{border-radius:${d.radius}px !important;}`;
  if (scale) extra += `html{font-size:${scale}%;}`;
  if (!rules.length && !extra) return null;
  return <style>{`${rules.length ? `:root{${rules.join("")}}` : ""}${extra}`}</style>;
}
