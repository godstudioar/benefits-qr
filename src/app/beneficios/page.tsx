import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { ArrowLeft } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import SectionHeader from "@/components/ui/SectionHeader";
import PublicBenefitsFilters from "@/components/public-benefits/PublicBenefitsFilters";
import BeneficiosSection from "@/components/public-benefits/BeneficiosSection";
import { BenefitsGridSkeleton } from "@/components/public-benefits/BenefitsGrid";
import { PublicBenefitsLocationProvider } from "@/components/public-benefits/PublicBenefitsLocationContext";
import { prisma } from "@/lib/prisma";

const getRubros = unstable_cache(
  () => prisma.rubro.findMany({ orderBy: { nombre: "asc" } }),
  ["rubros"],
  { revalidate: 3600 }
);

export const revalidate = 0;

export default async function BeneficiosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    rubro?: string;
    soloHoy?: string;
    soloDisponibles?: string;
    local?: string;
    vista?: string;
  }>;
}) {
  const { page: pageParam, q, rubro, soloHoy, soloDisponibles, local, vista: vistaParam } =
    await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const filters = {
    q: q?.trim() || undefined,
    rubroId: rubro || undefined,
    soloHoy: soloHoy === "1",
    soloDisponibles: soloDisponibles === "1",
    localId: local || undefined,
  };
  const vista = vistaParam === "mapa" ? "mapa" : "cupones";

  const filterParams = new URLSearchParams();
  if (filters.q) filterParams.set("q", filters.q);
  if (filters.rubroId) filterParams.set("rubro", filters.rubroId);
  if (filters.soloHoy) filterParams.set("soloHoy", "1");
  if (filters.soloDisponibles) filterParams.set("soloDisponibles", "1");
  if (filters.localId) filterParams.set("local", filters.localId);
  if (vista !== "cupones") filterParams.set("vista", vista);

  const navigationParams = new URLSearchParams(filterParams);
  if (pageParam) navigationParams.set("page", String(page));

  const rubros = await getRubros();

  return (
    <main className="relative px-4 pt-24 pb-14 sm:px-6 lg:px-8 lg:pb-16">
      <LinkButton
        href="/"
        variant="subtle"
        size="sm"
        className="absolute top-5 left-5 sm:top-6 sm:left-6 z-40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Inicio
      </LinkButton>

      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <SectionHeader
          eyebrow="Catálogo público"
          title="Beneficios"
          description="Encontrá descuentos cerca tuyo, reclamalos hoy y canjealos en el local presentando el QR."
          align="left"
          className="mb-6 max-w-2xl"
        />

        <PublicBenefitsLocationProvider>
          <Suspense fallback={null}>
            <PublicBenefitsFilters rubros={rubros} />
          </Suspense>

          <Suspense fallback={<BenefitsGridSkeleton />}>
            <BeneficiosSection
              page={page}
              filters={filters}
              filterParams={filterParams}
              navigationParamsString={navigationParams.toString()}
              vista={vista}
            />
          </Suspense>
        </PublicBenefitsLocationProvider>
      </div>
    </main>
  );
}
