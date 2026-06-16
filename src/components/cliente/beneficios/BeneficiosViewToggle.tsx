"use client";
import { Suspense, lazy, useMemo, useState } from "react";
import { LayoutGrid, MapIcon } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import MapsProvider from "@/components/maps/MapsProvider";
import UbicacionToggle from "@/components/cliente/beneficios/UbicacionToggle";
import BeneficiosClientList, {
  type LocalCoordsByName,
} from "@/components/cliente/beneficios/BeneficiosClientList";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { PublicBenefitCardData } from "@/server/services/publicBenefitsService";
import type { LocalConBeneficiosRaw } from "@/server/repositories/localesMapRepository";

const LocalesMap = lazy(() => import("@/components/cliente/beneficios/LocalesMap"));

type View = "lista" | "mapa";

export default function BeneficiosViewToggle({
  benefits,
  locales,
  page,
  totalPages,
  total,
  filterParamsString,
  hasLocalFilter,
}: {
  benefits: PublicBenefitCardData[];
  locales: LocalConBeneficiosRaw[];
  page: number;
  totalPages: number;
  total: number;
  filterParamsString: string;
  hasLocalFilter?: boolean;
}) {
  const [view, setView] = useState<View>("lista");
  const location = useUserLocation();
  const effectiveView = hasLocalFilter ? "lista" : view;

  const localCoordsByName: LocalCoordsByName = useMemo(() => {
    const map: LocalCoordsByName = {};
    for (const l of locales) {
      if (l.nombre) map[l.nombre] = { lat: l.lat, lng: l.lng };
    }
    return map;
  }, [locales]);

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  function buildPageUrl(p: number) {
    const next = new URLSearchParams(filterParamsString);
    next.set("page", String(p));
    return `/beneficios?${next.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <UbicacionToggle location={location} />

        <div
          className="inline-flex rounded-full border border-border-default bg-surface p-1 shadow-sm"
          role="tablist"
          aria-label="Vista de beneficios"
        >
          <button
            type="button"
            role="tab"
            aria-selected={effectiveView === "lista"}
            onClick={() => setView("lista")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              effectiveView === "lista"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={effectiveView === "mapa"}
            onClick={() => setView("mapa")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              effectiveView === "mapa"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Mapa
          </button>
        </div>
      </div>

      {effectiveView === "lista" ? (
        <>
          <BeneficiosClientList
            benefits={benefits}
            localCoordsByName={localCoordsByName}
            userCoords={location.coords}
            emptyMessage="No hay beneficios que coincidan con los filtros."
          />

          {totalPages > 1 ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <LinkButton
                href={hasPrevious ? buildPageUrl(page - 1) : buildPageUrl(1)}
                variant="secondary"
                size="sm"
                className={
                  hasPrevious
                    ? "w-full sm:w-auto"
                    : "pointer-events-none w-full opacity-50 sm:w-auto"
                }
                aria-disabled={!hasPrevious}
              >
                ← Anterior
              </LinkButton>

              <p className="text-center text-sm text-text-muted">
                Página {Math.min(page, Math.max(totalPages, 1))} de {totalPages} · {total}
              </p>

              <LinkButton
                href={hasNext ? buildPageUrl(page + 1) : buildPageUrl(page)}
                variant="secondary"
                size="sm"
                className={
                  hasNext
                    ? "w-full sm:w-auto"
                    : "pointer-events-none w-full opacity-50 sm:w-auto"
                }
                aria-disabled={!hasNext}
              >
                Siguiente →
              </LinkButton>
            </div>
          ) : null}
        </>
      ) : (
        <MapsProvider>
          <Suspense
            fallback={
              <div className="h-[70vh] animate-pulse rounded-2xl bg-surface-muted" />
            }
          >
            <LocalesMap locales={locales} userCoords={location.coords} />
          </Suspense>
        </MapsProvider>
      )}
    </div>
  );
}
