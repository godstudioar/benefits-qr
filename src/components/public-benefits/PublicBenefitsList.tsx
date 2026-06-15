"use client";

import { useMemo } from "react";
import Card from "@/components/ui/Card";
import { formatDistance, haversineKm } from "@/lib/geo/distance";
import { usePublicBenefitsLocation } from "@/components/public-benefits/PublicBenefitsLocationContext";
import type { PublicBenefitCardData } from "@/server/services/publicBenefitsService";
import PublicBenefitCard from "@/components/public-benefits/PublicBenefitCard";

export default function PublicBenefitsList({
  benefits,
  emptyMessage,
}: {
  benefits: PublicBenefitCardData[];
  emptyMessage?: string;
}) {
  const location = usePublicBenefitsLocation();

  const orderedBenefits = useMemo(() => {
    const userCoords = location.coords;

    if (!userCoords) {
      return benefits;
    }

    return [...benefits]
      .map((benefit) => {
        const { lat, lng } = benefit.local;
        const km = lat !== null && lng !== null ? haversineKm(userCoords, { lat, lng }) : Number.POSITIVE_INFINITY;

        return { benefit, km };
      })
      .sort((a, b) => a.km - b.km)
      .map(({ benefit }) => benefit);
  }, [benefits, location.coords]);

  if (orderedBenefits.length === 0) {
    return (
      <Card className="border-surface/80 bg-surface/95 p-10 text-center shadow-sm shadow-primary-soft/25 sm:bg-surface/85 sm:p-12 sm:backdrop-blur-md">
        <p className="text-sm text-text-muted">{emptyMessage ?? "No hay beneficios publicados todavía."}</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {orderedBenefits.map((benefit) => {
        const userCoords = location.coords;
        let distanceLabel: string | null = null;

        if (userCoords && benefit.local.lat !== null && benefit.local.lng !== null) {
          distanceLabel = formatDistance(haversineKm(userCoords, { lat: benefit.local.lat, lng: benefit.local.lng }));
        }

        return (
          <PublicBenefitCard
            key={benefit.id}
            benefit={benefit}
            distanceLabel={distanceLabel}
            compactDesktop
            showAvailabilityMessage={false}
          />
        );
      })}
    </div>
  );
}
