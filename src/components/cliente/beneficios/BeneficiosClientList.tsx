"use client";
import { useMemo } from "react";
import Card from "@/components/ui/Card";
import PublicBenefitCard from "@/components/public-benefits/PublicBenefitCard";
import type { PublicBenefitCardData } from "@/server/services/publicBenefitsService";
import { SHADOW } from "@/lib/shadowStyles";
import { formatDistance, haversineKm, type LatLng } from "@/lib/geo/distance";

export type LocalCoordsByName = Record<string, LatLng>;

export default function BeneficiosClientList({
  benefits,
  localCoordsByName,
  userCoords,
  emptyMessage,
}: {
  benefits: PublicBenefitCardData[];
  localCoordsByName: LocalCoordsByName;
  userCoords: LatLng | null;
  emptyMessage?: string;
}) {
  const ordered = useMemo(() => {
    if (!userCoords) return benefits;
    const withDistance = benefits.map((b) => {
      const key = b.local.nombre ?? "";
      const coords = key ? localCoordsByName[key] : undefined;
      const km = coords ? haversineKm(userCoords, coords) : Number.POSITIVE_INFINITY;
      return { b, km };
    });
    withDistance.sort((a, z) => a.km - z.km);
    return withDistance.map((x) => x.b);
  }, [benefits, localCoordsByName, userCoords]);

  if (ordered.length === 0) {
    return (
      <Card className={`border-surface/80 bg-surface/95 p-10 text-center ${SHADOW.cardBase} sm:bg-surface/85 sm:p-12 sm:backdrop-blur-md`}>
        <p className="text-sm text-text-muted">
          {emptyMessage ?? "No hay beneficios publicados todavía."}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ordered.map((benefit) => {
        let distanceLabel: string | null = null;
        if (userCoords) {
          const key = benefit.local.nombre ?? "";
          const coords = key ? localCoordsByName[key] : undefined;
          if (coords) {
            distanceLabel = formatDistance(haversineKm(userCoords, coords));
          }
        }
        return (
          <PublicBenefitCard
            key={benefit.id}
            benefit={benefit}
            distanceLabel={distanceLabel}
          />
        );
      })}
    </div>
  );
}
