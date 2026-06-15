import Link from "next/link";
import { ArrowRight, CalendarDays, Ticket, MapPinned, MapPin } from "lucide-react";
import Badge from "@/components/ui/Badge";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Card from "@/components/ui/Card";
import LogoFrame from "@/components/ui/LogoFrame";
import { formatDateAR } from "@/lib/dates";
import type { PublicBenefitCardData } from "@/server/services/publicBenefitsService";

export default function PublicBenefitCardCompact({
  benefit,
  distanceLabel,
}: {
  benefit: PublicBenefitCardData;
  distanceLabel?: string | null;
}) {
  const localName = benefit.local.nombre ?? "Local adherido";

  return (
    <Link
      href={`/beneficio/${benefit.id}`}
      aria-label={`Ver beneficio ${benefit.descripcion}`}
      className="group block"
    >
      <Card className="overflow-hidden border-surface/80 bg-surface/95 shadow-sm shadow-primary-soft/25 transition-[transform,box-shadow,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-md sm:bg-surface/85 sm:backdrop-blur-md">
        <div className="flex items-center gap-3 p-3">
          <LogoFrame
            src={benefit.local.logoUrl}
            alt={`Logo de ${localName}`}
            name={localName}
            className="h-11 w-11 rounded-xl"
          />

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 line-clamp-1 text-xs font-medium text-primary">{localName}</p>
              <Badge
                variant={benefit.availability.badgeVariant}
                className="shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              >
                {benefit.availability.badgeLabel}
              </Badge>
            </div>
            <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-text-primary">
              {benefit.descripcion}
            </h3>
            {benefit.local.direccion && (
              <p className="flex items-center gap-1 text-[11px] text-text-muted/80">
                <MapPinned className="h-3 w-3" aria-hidden="true" />
                <span className="line-clamp-1 max-w-[200px]">{benefit.local.direccion}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
              {distanceLabel && (
                <p className="flex items-center gap-1 font-medium text-primary">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {distanceLabel}
                </p>
              )}
              <p className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                Vence {formatDateAR(benefit.fechaExpiracion)}
              </p>
              {benefit.maxUsos !== null ? (
                <p className="flex items-center gap-1">
                  <Ticket className="h-3 w-3" aria-hidden="true" />
                  {benefit.canjeados}/{benefit.maxUsos} usos
                </p>
              ) : null}
            </div>
            <BenefitWeekdays diasValidos={benefit.diasValidos} className="text-text-muted/80" />
          </div>

          <ArrowRight
            className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  );
}
