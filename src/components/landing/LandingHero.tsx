import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/ui/Reveal";
import PublicBenefitCard from "@/components/public-benefits/PublicBenefitCard";
import LandingLocalesMap from "@/components/public-benefits/LandingLocalesMap";
import LandingMerchantMarquee from "@/components/landing/LandingMerchantMarquee";
import { getFeaturedPublicBenefits } from "@/server/services/publicBenefitsService";
import { getTodosLocalesRaw } from "@/server/repositories/localesMapRepository";

const FEATURED_LIMIT = 4;

export default async function LandingHero() {
  const [{ beneficios }, locales] = await Promise.all([
    getFeaturedPublicBenefits(FEATURED_LIMIT),
    getTodosLocalesRaw(),
  ]);

  return (
    <section
      id="inicio"
      tabIndex={-1}
      className="relative scroll-mt-24 overflow-x-hidden px-6 pt-24 pb-10 sm:pt-32 sm:pb-14 lg:px-8 lg:pt-28 lg:pb-16"
    >
      <div className="pointer-events-none absolute -top-56 left-0 hidden h-200 w-200 rounded-full bg-primary/20 blur-3xl lg:block" />
      <div className="pointer-events-none absolute right-0 bottom-0 hidden h-175 w-175 rounded-full bg-accent-soft/70 blur-3xl lg:block" />

      <div className="relative z-10 mx-auto w-full max-w-6xl 2xl:max-w-7xl">
        <div className="max-w-3xl text-left">
          <Reveal delay={0.1} y={18} amount={0.2}>
            <h1 className="text-[2.6rem] font-bold uppercase leading-[0.98] tracking-[-0.04em] text-black sm:text-[3.4rem] lg:text-[4rem] lg:leading-[0.92]">
              <span>Cupones que conectan</span>{" "}
              <span className="text-primary">negocios</span>{" "}
              <span>
                con sus <span className="text-primary">clientes</span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.18} y={18} amount={0.2}>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              Descubrí cupones activos cerca tuyo y explorá los locales adheridos en
              el mapa. Sin apps, canje inmediato con QR.
            </p>
          </Reveal>

          <Reveal delay={0.26} y={16} amount={0.2} className="mt-5">
            <LinkButton
              href="/beneficios"
              size="lg"
              variant="primary"
              className="w-full sm:w-auto"
            >
              Ver cupones
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          </Reveal>
        </div>

        <Reveal delay={0.3} y={20} amount={0.15} className="mt-8 lg:mt-10">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
            <div className="order-2 flex flex-col gap-3 lg:order-1">
              {beneficios.length > 0 ? (
                beneficios.map((benefit) => (
                  <PublicBenefitCard key={benefit.id} benefit={benefit} variant="compact" />
                ))
              ) : (
                <div className="rounded-2xl border border-border-default bg-surface/90 p-6 text-center text-sm text-text-muted">
                  Todavía no hay cupones publicados. ¡Volvé pronto!
                </div>
              )}

              <LinkButton
                href="/beneficios"
                variant="subtle"
                size="sm"
                className="mt-1 w-full"
              >
                Ver todos los cupones
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </LinkButton>
            </div>

            <div className="order-1 lg:order-2">
              <LandingLocalesMap locales={locales} />
            </div>
          </div>
        </Reveal>

        <Suspense fallback={<div className="min-h-[14vh] sm:min-h-[22vh] lg:min-h-[16vh]" />}>
          <LandingMerchantMarquee className="mt-10 lg:mt-12" />
        </Suspense>
      </div>
    </section>
  );
}
