import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Store, Ticket, MapPinned } from "lucide-react";
import Badge from "@/components/ui/Badge";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Card from "@/components/ui/Card";
import LogoFrame from "@/components/ui/LogoFrame";
import { formatDateAR } from "@/lib/dates";
import { INTERACTION, SHADOW } from "@/lib/shadowStyles";
import { cn } from "@/lib/utils";
import type { PublicBenefitCardData } from "@/server/services/publicBenefitsService";


export default function PublicBenefitCard({
  benefit,
  distanceLabel,
  compactDesktop = false,
  showAvailabilityMessage = true,
}: {
  benefit: PublicBenefitCardData;
  distanceLabel?: string | null;
  compactDesktop?: boolean;
  showAvailabilityMessage?: boolean;
}) {
  const localName = benefit.local.nombre ?? "Local adherido";

  return (
    <Link
      href={`/beneficio/${benefit.id}`}
      aria-label={`Ver beneficio ${benefit.descripcion}`}
      className="group block h-full"
    >
      <Card className={`h-full overflow-hidden border-surface/80 bg-surface/95 ${SHADOW.cardBase} ${INTERACTION.groupHoverLift} ${SHADOW.cardGroupHover} sm:bg-surface/85 sm:backdrop-blur-md`}>
        <div className="flex h-full items-start gap-4 p-4 sm:p-5">
          <LogoFrame
            src={benefit.local.logoUrl}
            alt={`Logo de ${localName}`}
            name={localName}
            className="h-12 w-12 rounded-2xl"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "min-w-0 flex items-center gap-1.5 font-medium text-primary",
                    compactDesktop ? "text-[11px] sm:text-xs" : "text-xs"
                  )}
                >
                  <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 line-clamp-1">{localName}</span>
                </p>

                <Badge
                  variant={benefit.availability.badgeVariant}
                  className={cn(
                    "shrink-0 self-start font-semibold uppercase",
                    compactDesktop
                      ? "px-2.5 py-0.5 text-[10px] tracking-[0.12em]"
                      : "px-3 py-1 text-[11px] tracking-[0.14em]"
                  )}
                >
                  {benefit.availability.badgeLabel}
                </Badge>
              </div>

              <h3
                className={cn(
                  "line-clamp-2 pr-2 font-semibold tracking-tight text-text-primary sm:pr-0",
                  compactDesktop ? "text-base sm:text-base" : "text-lg sm:text-xl"
                )}
              >
                {benefit.descripcion}
              </h3>
            </div>

            {benefit.local.direccion && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted" className="gap-1.5 px-3 py-1">
                  <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="line-clamp-1 max-w-[240px]">{benefit.local.direccion}</span>
                </Badge>
              </div>
            )}

            <div className="flex flex-nowrap gap-2">
              <Badge variant="muted" className="gap-1.5 px-3 py-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Vence {formatDateAR(benefit.fechaExpiracion)}
              </Badge>
              {benefit.maxUsos !== null ? (
                <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                  <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                  {benefit.canjeados}/{benefit.maxUsos} usos
                </Badge>
              ) : null}
              {distanceLabel ? (
                <Badge variant="primary" className="gap-1.5 px-3 py-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {distanceLabel}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <BenefitWeekdays diasValidos={benefit.diasValidos} />
            </div>

            {showAvailabilityMessage && benefit.availability.message ? (
              <div
                className={`rounded-2xl border px-3 py-2 text-xs ${
                  benefit.availability.badgeVariant === "danger"
                    ? "border-danger-border bg-danger-soft/60 text-danger"
                    : "border-warning-border bg-warning-soft/60 text-warning"
                }`}
              >
                {benefit.availability.message}
              </div>
            ) : null}
          </div>

          <ArrowRight
            className="my-auto h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  );
}
