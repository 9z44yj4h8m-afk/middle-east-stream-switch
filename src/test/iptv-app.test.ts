import { describe, expect, it } from "vitest";
import { publicIptvChannels, favoriteCatalog } from "@/lib/iptv-app";
import { channels } from "@/lib/channels";
import { movies } from "@/lib/movies";

describe("public IPTV catalog", () => {
  it("keeps playable public channels available for everyone", () => {
    expect(publicIptvChannels(channels).some((c) => c.id === "mbc-1")).toBe(true);
    expect(publicIptvChannels([{ id:"empty",name:"empty",category:"عامة",thumbnail:"",description:"" }])).toEqual([]);
  });
  it("separates movie and channel favorites without ID collisions", () => {
    const channel = channels[0]; const movie = movies[0];
    if (!channel || !movie) throw new Error("Missing public fixtures");
    const result = favoriteCatalog([channel], [{...movie,id:channel.id}], [], [`live:${channel.id}`]);
    expect(result.channels).toEqual([channel]);
    expect(result.movies).toEqual([]);
  });
});