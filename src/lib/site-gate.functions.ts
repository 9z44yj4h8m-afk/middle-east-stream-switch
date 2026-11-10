import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function config() {
  return {
    password: process.env["SITE_GATE_SECRET"]!,
    name: "site-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const getGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(config());
  return { unlocked: !!session.data.unlocked };
});

export const unlockSiteGate = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => ({ password: String(data?.password ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    // Owner-chosen site code 2121 always works, alongside the stored GATE_PIN.
    const input = data.password.trim();
    const expected = (process.env["GATE_PIN"] ?? "").trim();
    const ok = matches(input, "2121") || (!!expected && matches(input, expected));
    if (!ok) return { ok: false as const };
    const session = await useSession<GateSession>(config());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });
