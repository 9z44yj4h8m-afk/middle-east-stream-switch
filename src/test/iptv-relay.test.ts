import { describe, expect, it } from "vitest";
import { openRelayToken, relayUrl, safeRelayTarget } from "../lib/iptv/relay-token.server";

describe("private IPTV relay", () => {
  const secret = "test-only-secret";
  const bearer = "test-member-bearer-token";
  const url = "http://provider.example/live/private-user/private-password/1.m3u8";
  it("conceals subscription and member credentials in playback URLs", () => {
    const link = relayUrl(url, bearer, secret);
    expect(link).not.toContain("private-password");
    expect(link).not.toContain(bearer);
    const token = new URL(link, "https://site.example").searchParams.get("t");
    if (!token) throw new Error("Missing relay token");
    expect(openRelayToken(token, secret)).toEqual({ url, bearer });
  });
  it("rejects forged and wrong-key capabilities", () => {
    const token = new URL(relayUrl(url, bearer, secret), "https://site.example").searchParams.get("t");
    if (!token) throw new Error("Missing relay token");
    expect(() => openRelayToken(`A${token.slice(1)}`, secret)).toThrow();
    expect(() => openRelayToken(token, "another-secret")).toThrow();
    expect(() => openRelayToken("", secret)).toThrow();
  });
  it("blocks local and non-HTTP stream and redirect targets", () => {
    for (const target of ["http://127.0.0.1/a", "http://10.0.0.1/a", "http://[::1]/a", "http://localhost/a", "http://host.internal/a", "file:///a", "http://user:pass@provider.example/a"])
      expect(safeRelayTarget(new URL(target))).toBe(false);
    expect(safeRelayTarget(new URL(url))).toBe(true);
  });
});