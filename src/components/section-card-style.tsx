import { siteFonts } from "@/lib/site-config";
import { type SectionCard } from "@/lib/section-content";

const bounded = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : undefined;
export function SectionCardStyle({ id, card }: { id: string; card: SectionCard }) {
  if (!/^[a-z-]+$/.test(id)) return null;
  const selector = `[data-section-card="${id}"]`;
  const rules: string[] = [];
  if (siteFonts.some((font) => font === card.font)) rules.push(`${selector},${selector} [data-card-text]{font-family:"${card.font}",sans-serif!important}`);
  for (const [key, part, min, max] of [["titleSize", "title", 12, 40], ["descriptionSize", "description", 10, 24], ["buttonSize", "button", 10, 24]] as const) {
    const size = bounded(card[key], min, max);
    if (size) rules.push(`${selector} [data-card-text="${part}"]{font-size:${size}px!important;overflow-wrap:anywhere;line-height:1.5}`);
  }
  const weight = bounded(card.fontWeight, 400, 900);
  if (weight) rules.push(`${selector} [data-card-text]{font-weight:${weight}!important}`);
  const width = bounded(card.imageWidth, 25, 55);
  if (width) rules.push(`${selector}.broadcast-destination{grid-template-columns:${width}% minmax(0,1fr)!important}${selector}.section-page-card{grid-template-columns:minmax(0,1fr) ${width}%!important}${selector} > img{width:100%!important}`);
  const height = bounded(card.imageHeight, 100, 320);
  if (height) rules.push(`${selector} > img{height:${height}px!important;min-height:${height}px!important}${selector}.broadcast-destination{min-height:${height}px!important}`);
  if (card.imageFit === "cover" || card.imageFit === "contain") rules.push(`${selector} > img{object-fit:${card.imageFit}!important}`);
  return <style>{rules.join("\n")}</style>;
}