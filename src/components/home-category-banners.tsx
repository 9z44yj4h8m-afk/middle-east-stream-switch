import { useSiteConfig } from "@/lib/site-config";
import { orderedSectionIds, homeCategoryCards, getSectionCard } from "@/lib/section-content";
import { broadcastArt } from "@/lib/broadcast-art";
import { ChevronLeft } from "lucide-react";
import { SectionCardStyle } from "@/components/section-card-style";

export function HomeCategoryBanners() {
  const { data } = useSiteConfig();
  return (
    <section
      id="home-category-banners"
      aria-label="أقسام المشاهدة"
      className="gold-home-categories mx-auto max-w-4xl scroll-mt-24 px-3 pt-5 sm:px-6"
    >
      <h2 className="gold-section-heading">تصفح الأقسام</h2>
      <div className="gold-category-grid">
      {orderedSectionIds("categories", homeCategoryCards.map((b) => b.id), data?.sectionContent).map((id) => {
        const card = getSectionCard(`category-${id}`, data?.sectionContent);
        if (card.hidden) return null;
        const art = !data?.sectionContent.cards?.[`category-${id}`]?.image ? broadcastArt[id] : undefined;
        return <a key={id} data-section-card={`category-${id}`} href={card.link} aria-label={card.title} className={`gold-category-card design-gleam ${art ? "gold-category-art" : ""}`}><SectionCardStyle id={`category-${id}`} card={card} /><img src={art ?? card.image} alt={card.title} loading="lazy" />{art && <span className="gold-category-copy"><span data-card-text="title">{card.title}</span>{card.description && <small data-card-text="description">{card.description}</small>}<ChevronLeft aria-hidden="true" /></span>}</a>;
      })}
      </div>
    </section>
  );
}
