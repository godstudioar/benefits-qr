import { Suspense } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, CalendarDays, MapPin, Store, Ticket } from "lucide-react";
import Badge from "@/components/ui/Badge";
import LinkButton from "@/components/ui/LinkButton";
import SectionHeader from "@/components/ui/SectionHeader";
import EventoFilters from "@/components/eventos/EventoFilters";
import EventoBenefitsGrid, {
  EventoBenefitsGridSkeleton,
} from "@/components/eventos/EventoBenefitsGrid";
import { getEventoBySlug } from "@/server/services/eventosService";
import { prisma } from "@/lib/prisma";
import { formatDateAR } from "@/lib/dates";

const getRubros = unstable_cache(
  () => prisma.rubro.findMany({ orderBy: { nombre: "asc" } }),
  ["rubros"],
  { revalidate: 3600 },
);

export const revalidate = 0;

export default async function EventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    rubro?: string;
    soloDisponibles?: string;
  }>;
}) {
  const { slug } = await params;
  const { page: pageParam, q, rubro, soloDisponibles } = await searchParams;

  const evento = await getEventoBySlug(slug);
  if (!evento) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const filters = {
    q: q?.trim() || undefined,
    rubroId: rubro || undefined,
    soloDisponibles: soloDisponibles === "1",
  };

  const filterParams = new URLSearchParams();
  if (filters.q) filterParams.set("q", filters.q);
  if (filters.rubroId) filterParams.set("rubro", filters.rubroId);
  if (filters.soloDisponibles) filterParams.set("soloDisponibles", "1");

  const rubros = await getRubros();

  const now = new Date();
  const isActive = evento.fechaInicio <= now && evento.fechaFin >= now;
  const isUpcoming = evento.fechaInicio > now;

  return (
    <main className="relative px-4 pt-24 pb-14 sm:px-6 lg:px-8 lg:pb-16">
      <LinkButton
        href="/"
        variant="subtle"
        size="sm"
        className="absolute top-5 left-5 z-40 sm:top-6 sm:left-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Inicio
      </LinkButton>

      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <div className="mb-4 flex items-start gap-5">
          {evento.imageUrl && (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evento.imageUrl}
                alt={evento.nombre}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <SectionHeader
            eyebrow="Evento"
            title={evento.nombre}
            description={evento.descripcion ?? undefined}
            align="left"
            className="!mb-0 max-w-2xl"
          />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge variant={isActive ? "success" : isUpcoming ? "primary" : "muted"} className="gap-1.5 px-3 py-1">
            {isActive ? "En curso" : isUpcoming ? "Próximamente" : "Finalizado"}
          </Badge>
          <Badge variant="muted" className="gap-1.5 px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDateAR(evento.fechaInicio)} → {formatDateAR(evento.fechaFin)}
          </Badge>
          {evento.ubicacion && (
            <Badge variant="muted" className="gap-1.5 px-3 py-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {evento.ubicacion}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
            {evento.localesCount} {evento.localesCount === 1 ? "local" : "locales"}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            {evento.beneficiosCount} {evento.beneficiosCount === 1 ? "cupón" : "cupones"}
          </Badge>
        </div>

        <Suspense fallback={null}>
          <EventoFilters rubros={rubros} eventoSlug={slug} />
        </Suspense>

        <Suspense fallback={<EventoBenefitsGridSkeleton />}>
          <EventoBenefitsGrid
            eventoId={evento.id}
            eventoSlug={slug}
            page={page}
            filters={filters}
            filterParams={filterParams}
          />
        </Suspense>
      </div>
    </main>
  );
}
