import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import image from "@/assets/bedouin-drama-home.png.asset.json";

export function BedouinDramaBanner() {
  return <Button asChild variant="ghost" className="group relative block h-auto w-full overflow-hidden rounded-lg border border-sky/50 bg-surface-deep p-0 text-right hover:border-sky">
    <Link to="/bedouin-drama" aria-label="استعرض البدوية دراما">
      <img src={image.url} alt="ALMOGHANI LIVE — البدوية دراما — شاهد الآن" width={1920} height={713} loading="lazy" decoding="async" className="aspect-[1920/713] w-full object-contain" />
    </Link>
  </Button>;
}