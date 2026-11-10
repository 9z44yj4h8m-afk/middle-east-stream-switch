import { describe, expect, it } from "vitest";
import { botAvatarUrl, safeAvatarPath } from "@/lib/bot-avatars";

describe("chat character picture paths", () => {
  it("serves an attached picture through the relay address", () => {
    expect(botAvatarUrl("avatars/nouf-1.png")).toBe("/api/public/bot-avatar?path=avatars%2Fnouf-1.png");
  });

  it("refuses paths that could reach another file or bucket", () => {
    expect(safeAvatarPath("../chat-recordings/receipt.pdf")).toBe("");
    expect(safeAvatarPath("avatars/../../x.png")).toBe("");
    expect(safeAvatarPath("avatars/setup.exe")).toBe("");
    expect(safeAvatarPath("https://evil.example/a.png")).toBe("");
    expect(safeAvatarPath("")).toBe("");
    expect(botAvatarUrl(undefined)).toBe("");
  });
});
