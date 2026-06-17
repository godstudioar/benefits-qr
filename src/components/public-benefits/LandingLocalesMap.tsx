"use client";
import { Suspense, lazy } from "react";
import MapsProvider from "@/components/maps/MapsProvider";
import { useOptionalPublicBenefitsLocation } from "@/components/public-benefits/PublicBenefitsLocationContext";
import type { LocalConBeneficiosRaw } from "@/server/repositories/localesMapRepository";

const LocalesMap = lazy(() => import("@/components/cliente/beneficios/LocalesMap"));

const HEIGHT = "h-[400px] sm:h-[460px] lg:h-[520px] xl:h-[560px]";

export default function LandingLocalesMap({
  locales,
  benefitsHrefSearchParams,
  emptyStateMessage,
}: {
  locales: LocalConBeneficiosRaw[];
  benefitsHrefSearchParams?: string;
  emptyStateMessage?: string;
}) {
  const location = useOptionalPublicBenefitsLocation();
  const userCoords = location?.coords ?? null;

  return (
    <MapsProvider>
      <Suspense
        fallback={<div className={`${HEIGHT} animate-pulse rounded-2xl bg-surface-muted`} />}
      >
        <LocalesMap
          locales={locales}
          userCoords={userCoords}
          heightClassName={HEIGHT}
          benefitCountLabel="coincidentes"
          benefitsHrefSearchParams={benefitsHrefSearchParams}
          emptyStateMessage={emptyStateMessage}
        />
      </Suspense>
    </MapsProvider>
  );
}
