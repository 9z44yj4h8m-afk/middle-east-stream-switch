import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useSiteConfig } from "@/lib/site-config";
import { getSectionCard, orderedSectionIds } from "@/lib/section-content";
import { SectionCardStyle } from "@/components/section-card-style";

export const Route = createFileRoute("/sections")({
  head: () => ({
    meta: [
      { title: "الأقسام — المغني لايف" },
      { name: "description", content: "اختر ما تريد مشاهدته: البث المباشر، مكتبة الأفلام، المسلسلات، والمكتبة الخاصة." },
      { property: "og:title", content: "الأقسام — المغني لايف" },
      { property: "og:description", content: "البث المباشر والأفلام والمسلسلات والمكتبة الخاصة في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SectionsPage,
});

function SectionsPage() {
  const { data } = useSiteConfig();
  const content = data?.sectionContent;
  return (
    <main className="mx-auto max-w-3xl px-3 pb-28 pt-6 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="font-display text-4xl font-black text-foreground sm:text-5xl">{content?.pageTitle || "الأقسام"}</h1>
        <p className="mt-2 text-muted-foreground">{content?.pageDescription ?? "اختر ما تريد مشاهدته"}</p>
        <span className="mx-auto mt-3 block h-0.5 w-14 rounded bg-sky" />
      </header>
      <div className="space-y-4">
        {orderedSectionIds("sections", ["sections-live", "sections-movie", "sections-series", "sections-bedouin", "sections-member"], content).map((id) => {
          const c = getSectionCard(id, content);
          if (c.hidden) return null;
          return <a
            key={c.title}
            href={c.link}
            data-section-card={id}
            className="section-page-card group grid grid-cols-[1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-sky/60 bg-surface-deep p-3 shadow-[0_0_24px_-8px_var(--color-sky)] transition hover:border-sky"
          >
            <SectionCardStyle id={id} card={c} />
            <div className="min-w-0 space-y-2 p-2">
              <h2 data-card-text="title" className="font-display text-2xl font-black text-foreground sm:text-3xl">{c.title}</h2>
              <p data-card-text="description" className="text-sm text-muted-foreground">{c.description}</p>
              <span data-card-text="button" className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
                {c.button}
                <ChevronLeft className="h-4 w-4" />
              </span>
            </div>
            <img src={c.image} alt="" loading="lazy" width={478} height={267} className="h-28 w-40 rounded-xl object-cover sm:h-36 sm:w-60" />
          </a>;
        })}
      </div>
    </main>
  );
}
