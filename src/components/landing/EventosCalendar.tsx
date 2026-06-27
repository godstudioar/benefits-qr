import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { SHADOW } from "@/lib/shadowStyles";
import { formatDateAR } from "@/lib/dates";
import { cn } from "@/lib/utils";

type EventoItem = {
  nombre: string;
  slug: string;
  fechaInicio: Date;
  fechaFin: Date;
  ubicacion: string | null;
  _count: { beneficios: number };
};

export default function EventosCalendar({ eventos }: { eventos: EventoItem[] }) {
  if (eventos.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Próximos eventos
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {eventos.map((evento) => {
          const now = new Date();
          const isActive = evento.fechaInicio <= now && evento.fechaFin >= now;

          return (
            <Link key={evento.slug} href={`/eventos/${evento.slug}`} className="group block">
              <Card
                className={cn(
                  "border-surface/80 bg-surface/95 p-3 transition-shadow",
                  SHADOW.cardBase,
                  "group-hover:shadow-md",
                  "sm:bg-surface/85 sm:backdrop-blur-md",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="line-clamp-1 text-sm font-semibold text-text-primary">
                      {evento.nombre}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDateAR(evento.fechaInicio)} → {formatDateAR(evento.fechaFin)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={isActive ? "success" : "muted"}
                        className="px-2 py-0.5 text-[10px]"
                      >
                        {isActive ? "En curso" : "Próximo"}
                      </Badge>
                      {evento.ubicacion && (
                        <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                          <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                          {evento.ubicacion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
