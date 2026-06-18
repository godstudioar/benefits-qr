import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import PublicBenefitCard from "@/components/public-benefits/PublicBenefitCard";
import LandingLocalesMap from "@/components/public-benefits/LandingLocalesMap";
import { getFeaturedPublicBenefits } from "@/server/services/publicBenefitsService";
import { getTodosLocalesRaw } from "@/server/repositories/localesMapRepository";

const FEATURED_LIMIT = 5;

export default async function PublicBenefitsSection() {
  const [{ beneficios }, locales] = await Promise.all([
    getFeaturedPublicBenefits(FEATURED_LIMIT),
    getTodosLocalesRaw(),
  ]);

  if (beneficios.length === 0 && locales.length === 0) {
    return null;
  }

  return (
    <section
      id="beneficios"
      tabIndex={-1}
      className="scroll-mt-24 bg-linear-to-br from-primary-soft via-surface-soft to-accent-soft px-6 py-16 lg:px-8 lg:py-14 2xl:py-16"
    >
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <Reveal y={18} amount={0.25}>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow="Catálogo público"
              title="Beneficios y locales adheridos"
              description="Explorá cupones activos y descubrí los locales adheridos en el mapa cerca tuyo."
              align="left"
              className="mb-0 max-w-2xl"
            />

            <LinkButton href="/beneficios" variant="subtle" size="sm" className="w-full sm:w-auto">
              Ver todos
            </LinkButton>
          </div>
        </Reveal>

        <Reveal y={16} amount={0.2}>
          <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
            <div className="flex flex-col gap-3">
              {beneficios.length > 0 ? (
                beneficios.map((benefit) => (
                  <PublicBenefitCard key={benefit.id} benefit={benefit} variant="compact" />
                ))
              ) : (
                <div className="rounded-2xl border border-border-default bg-surface/80 p-6 text-center text-sm text-text-muted">
                  No hay beneficios publicados todavía.
                </div>
              )}
            </div>

            <LandingLocalesMap locales={locales} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
