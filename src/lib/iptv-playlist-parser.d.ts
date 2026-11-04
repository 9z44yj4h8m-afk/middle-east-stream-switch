declare module "iptv-playlist-parser" {
  export function parse(text: string): { items: { name: string; url: string; tvg: { logo: string }; group: { title: string } }[] };
}