import { describe, expect, it } from "vitest";
import { channelPanelStats } from "@/lib/channel-panel-stats";

describe("owner channel counts", () => {
  it("counts saved channels independently of unsaved imported rows", () => {
    expect(channelPanelStats(316, ["new-1", "new-2"], ["new-1"], 3)).toEqual({ saved: 318, imported: 1, pending: 3 });
  });
  it("excludes deleted imported channels and duplicate IDs from counts", () => {
    expect(channelPanelStats(316, ["new-1", "new-1"], ["new-1", "deleted", "new-1"], 0)).toEqual({ saved: 317, imported: 1, pending: 0 });
  });
});