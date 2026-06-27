import { CalendarX2 } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import EventoHeroCard from "@/components/landing/EventoHeroCard";
import EventosCalendar from "@/components/landing/EventosCalendar";
import { listEventosActivosFuturos } from "@/server/services/eventosService";

export default async function EventosSection() {
  const eventos = await listEventosActivosFuturos();

  const isEmpty = eventos.length === 0;
  const [featured, ...rest] = eventos as [typeof eventos[0], ...typeof eventos];

  return (
    <section
      id="eventos"
      tabIndex={-1}
      className="scroll-mt-24 px-6 py-16 lg:px-8 lg:py-14 2xl:py-16"
    >
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <Reveal y={18} amount={0.25}>
          <SectionHeader
            eyebrow="Eventos"
            title="Próximos eventos"
            description="Descubrí eventos con cupones exclusivos de locales participantes."
            align="left"
            className="mb-8 max-w-2xl"
          />
        </Reveal>

        <Reveal y={16} amount={0.2}>
          {isEmpty ? (
            <div className="flex items-center gap-4 rounded-2xl border border-border-default/60 bg-surface-muted/50 px-6 py-8 text-text-muted">
              <CalendarX2 className="h-8 w-8 shrink-0 opacity-40" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-secondary">Sin eventos próximos</p>
                <p className="mt-0.5 text-sm">Por el momento no hay eventos activos. ¡Volvé pronto!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <EventoHeroCard evento={featured} />
              {rest.length > 0 && <EventosCalendar eventos={rest} />}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
