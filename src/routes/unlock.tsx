import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockSiteGate } from "@/lib/site-gate.functions";

export const Route = createFileRoute("/unlock")({
  validateSearch: (s: Record<string, unknown>) => { const t = s["to"]; return { to: typeof t === "string" && t.startsWith("/") && !t.startsWith("//") ? t : "/" }; },
  head: () => ({
    meta: [
      { title: "الموقع مغلق مؤقتًا | المغني لايف" },
      { name: "description", content: "الموقع قيد التجهيز، الدخول برقم سري." },
      { property: "og:title", content: "الموقع مغلق مؤقتًا | المغني لايف" },
      { property: "og:description", content: "الموقع قيد التجهيز، الدخول برقم سري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unlock,
});

function Unlock() {
  const router = useRouter();
  const { to } = Route.useSearch();
  const unlock = useServerFn(unlockSiteGate);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const password = new FormData(e.currentTarget).get("password") as string;
    try {
      const { ok } = await unlock({ data: { password } });
      if (ok) window.location.href = to;
      else setError(true);
    } finally {
      setBusy(false);
    }
    void router;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-primary/50 bg-card p-6 text-center shadow-lg">
        <h1 className="text-2xl font-black text-primary">ALMOGHANI LIVE</h1>
        <p className="mt-2 text-sm text-muted-foreground">الموقع قيد التجهيز — أدخل الرقم السري</p>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-5 w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-base text-foreground"
          placeholder="الرقم السري"
        />
        {error && <p className="mt-3 text-sm text-destructive">الرقم السري غير صحيح</p>}
        <button disabled={busy} type="submit" className="mt-5 w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "جارٍ التحقق..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
