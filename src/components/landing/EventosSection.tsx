import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import EventoHeroCard from "@/components/landing/EventoHeroCard";
import EventosCalendar from "@/components/landing/EventosCalendar";
import { listEventosActivosFuturos } from "@/server/services/eventosService";

export default async function EventosSection() {
  const eventos = await listEventosActivosFuturos();

  if (eventos.length === 0) return null;

  const [featured, ...rest] = eventos;

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
          <div className="space-y-6">
            <EventoHeroCard evento={featured} />
            {rest.length > 0 && <EventosCalendar eventos={rest} />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
