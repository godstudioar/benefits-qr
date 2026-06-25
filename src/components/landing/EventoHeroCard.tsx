import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Store, Ticket } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { INTERACTION, SHADOW } from "@/lib/shadowStyles";
import { formatDateAR } from "@/lib/dates";
import { cn } from "@/lib/utils";

type EventoHero = {
  nombre: string;
  slug: string;
  descripcion: string | null;
  imageUrl: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  ubicacion: string | null;
  localesCount: number;
  _count: { beneficios: number };
};

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function EventoHeroCard({ evento }: { evento: EventoHero }) {
  const now = new Date();
  const isActive = evento.fechaInicio <= now && evento.fechaFin >= now;
  const daysUntil = getDaysUntil(evento.fechaInicio);

  return (
    <Link href={`/eventos/${evento.slug}`} className="group block">
      <Card
        className={cn(
          "overflow-hidden border-primary/20 bg-linear-to-br from-primary-soft/80 via-surface/90 to-accent-soft/60",
          SHADOW.cardBase,
          INTERACTION.groupHoverLift,
          SHADOW.cardGroupHover,
          "sm:backdrop-blur-md",
        )}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          {evento.imageUrl ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl sm:h-20 sm:w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evento.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-20 sm:w-20">
              <CalendarDays className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isActive ? "success" : "primary"} className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                {isActive ? "En curso" : daysUntil <= 7 ? `En ${daysUntil} día${daysUntil !== 1 ? "s" : ""}` : "Próximamente"}
              </Badge>
              <span className="text-xs text-text-muted">
                {formatDateAR(evento.fechaInicio)} → {formatDateAR(evento.fechaFin)}
              </span>
            </div>

            <h3 className="text-lg font-bold tracking-tight text-text-primary sm:text-xl">
              {evento.nombre}
            </h3>

            {evento.descripcion && (
              <p className="line-clamp-2 text-sm text-text-muted">
                {evento.descripcion}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {evento.ubicacion && (
                <Badge variant="muted" className="gap-1 px-2.5 py-0.5 text-[11px]">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {evento.ubicacion}
                </Badge>
              )}
              <Badge variant="muted" className="gap-1 px-2.5 py-0.5 text-[11px]">
                <Store className="h-3 w-3" aria-hidden="true" />
                {evento.localesCount} {evento.localesCount === 1 ? "local" : "locales"}
              </Badge>
              <Badge variant="muted" className="gap-1 px-2.5 py-0.5 text-[11px]">
                <Ticket className="h-3 w-3" aria-hidden="true" />
                {evento._count.beneficios} {evento._count.beneficios === 1 ? "cupón" : "cupones"}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
            Ver cupones
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
