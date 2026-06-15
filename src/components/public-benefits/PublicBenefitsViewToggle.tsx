"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, MapIcon } from "lucide-react";

export type PublicBenefitsView = "cupones" | "mapa";

export default function PublicBenefitsViewToggle({ vista }: { vista: PublicBenefitsView }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const baseParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  function handleViewChange(nextView: PublicBenefitsView) {
    const nextParams = new URLSearchParams(baseParams);

    if (nextView === "cupones") {
      nextParams.delete("vista");
    } else {
      nextParams.set("vista", nextView);
    }

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex justify-start">
      <div
        className="inline-flex rounded-full border border-border-default bg-surface p-1 shadow-sm"
        role="tablist"
        aria-label="Vista de beneficios"
      >
        <button
          type="button"
          role="tab"
          aria-selected={vista === "cupones"}
          onClick={() => handleViewChange("cupones")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            vista === "cupones"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          Cupones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === "mapa"}
          onClick={() => handleViewChange("mapa")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            vista === "mapa"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Mapa
        </button>
      </div>
    </div>
  );
}
