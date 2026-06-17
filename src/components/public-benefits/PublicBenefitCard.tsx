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
  variant = "default",
  compactDesktop = false,
  showAvailabilityMessage = true,
}: {
  benefit: PublicBenefitCardData;
  distanceLabel?: string | null;
  variant?: "default" | "compact";
  compactDesktop?: boolean;
  showAvailabilityMessage?: boolean;
}) {
  const localName = benefit.local.nombre ?? "Local adherido";
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/beneficio/${benefit.id}`}
      aria-label={`Ver beneficio ${benefit.descripcion}`}
      className={cn("group block", !isCompact && "h-full")}
    >
      <Card
        className={cn(
          "overflow-hidden border-surface/80 bg-surface/95",
          SHADOW.cardBase,
          INTERACTION.groupHoverLift,
          SHADOW.cardGroupHover,
          "sm:bg-surface/85 sm:backdrop-blur-md",
          !isCompact && "h-full"
        )}
      >
        {isCompact ? (
          <div className="flex items-start gap-3 p-3 sm:items-center">
            <LogoFrame
              src={benefit.local.logoUrl}
              alt={`Logo de ${localName}`}
              name={localName}
              className="h-11 w-11 rounded-xl"
            />

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                <p className="min-w-0 line-clamp-1 text-xs font-medium text-primary">{localName}</p>
                <Badge
                  variant={benefit.availability.badgeVariant}
                  className="self-start px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:shrink-0"
                >
                  {benefit.availability.badgeLabel}
                </Badge>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold tracking-tight text-text-primary sm:line-clamp-1">
                {benefit.descripcion}
              </h3>
              {benefit.local.direccion && (
                <p className="flex items-center gap-1 text-[11px] text-text-muted/80">
                  <MapPinned className="h-3 w-3" aria-hidden="true" />
                  <span className="min-w-0 line-clamp-1">{benefit.local.direccion}</span>
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
              className="hidden h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent sm:block"
              aria-hidden="true"
            />
          </div>
        ) : (
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
        )}
      </Card>
    </Link>
  );
}
