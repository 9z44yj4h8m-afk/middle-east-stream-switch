declare module "iptv-playlist-parser" {
  const parser: { parse(text: string): { items: { name: string; url: string; tvg: { logo: string }; group: { title: string } }[] } };
  export default parser;
}