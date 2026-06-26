import { notFound } from "next/navigation";
import { ArrowLeft, MapPinned, Ticket } from "lucide-react";
import PublicBenefitCard from "@/components/public-benefits/PublicBenefitCard";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";
import LogoFrame from "@/components/ui/LogoFrame";
import Reveal from "@/components/ui/Reveal";
import { SHADOW } from "@/lib/shadowStyles";
import { getLocalPublicPageData } from "@/server/services/localPublicPageService";

export const revalidate = 60;

export default async function LocalPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getLocalPublicPageData(id);

  if (!data) {
    notFound();
  }

  const { local, benefits, claimableLaterBenefits } = data;
  const localName = local.nombre ?? "Local adherido";
  const redeemableNowCount = benefits.length;
  const claimableLaterCount = claimableLaterBenefits.length;
  const totalClaimableCount = redeemableNowCount + claimableLaterCount;

  return (
    <main className="relative mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 sm:pt-24 lg:max-w-4xl lg:pt-24 2xl:max-w-5xl 2xl:pt-24">
      <LinkButton
        href="/beneficios"
        variant="subtle"
        size="sm"
        className="absolute top-5 left-5 z-40 sm:top-6 sm:left-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Todos los beneficios
      </LinkButton>

      <div className="space-y-5 sm:space-y-6 lg:space-y-5 2xl:space-y-6">
        <Reveal delay={0.04} y={12} amount={0.2}>
          <Card className={`border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5 lg:p-4 2xl:p-5`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                <LogoFrame
                  src={local.logoDisplayUrl}
                  alt={`Logo de ${localName}`}
                  name={localName}
                  className="h-14 w-14 rounded-2xl sm:h-16 sm:w-16"
                  fallbackClassName="text-xl sm:text-2xl"
                />

                <div className="min-w-0 space-y-1.5">
                  <div className="space-y-1">
                    <h1 className="text-lg font-bold text-text-primary sm:text-xl">
                      {localName}
                    </h1>
                    {local.rubro?.nombre ? (
                      <Badge variant="muted" className="px-2 py-0 text-[11px]">
                        {local.rubro.nombre}
                      </Badge>
                    ) : null}
                  </div>

                  {local.direccion ? (
                    <Badge variant="secondary" className="max-w-full gap-1.5 px-3 py-1 text-[11px]">
                      <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="line-clamp-1 max-w-[320px]">{local.direccion}</span>
                    </Badge>
                  ) : null}

                  {local.telefono ? (
                    <p className="text-xs text-text-muted sm:text-sm">{local.telefono}</p>
                  ) : null}
                </div>
              </div>

                <div className="flex justify-end lg:flex-none">
                  <Badge variant="light" className="gap-1.5 px-3 py-1 text-[11px] sm:text-xs lg:self-start">
                    <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                    {redeemableNowCount === 1 ? "1 disponible" : `${redeemableNowCount} disponibles`}
                  </Badge>
                </div>
              </div>
            </Card>
        </Reveal>

        <Reveal delay={0.08} y={12} amount={0.2}>
          {totalClaimableCount === 0 ? (
            <Card className={`border-surface/80 bg-surface/95 p-8 text-center ${SHADOW.cardBase} sm:bg-surface/85 sm:p-10 lg:p-9 2xl:p-10`}>
              <p className="text-base font-medium text-text-primary">
                No hay cupones disponibles para este local en este momento.
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Pedile al comercio otra promoción disponible.
              </p>
            </Card>
          ) : (
            <div className="space-y-5 sm:space-y-6 lg:space-y-5 2xl:space-y-6">
              {benefits.length > 0 ? (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-text-primary">Disponibles ahora</h2>
                    <p className="text-sm text-text-muted">
                      Reclamá el cupón y mostrale tu QR al local cuando vayas a canjearlo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {benefits.map((benefit) => (
                      <PublicBenefitCard
                        key={benefit.id}
                        benefit={benefit}
                        compactDesktop
                        showAvailabilityMessage={false}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <Card className={`border-surface/80 bg-surface/95 p-5 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-6 lg:p-5`}>
                  <p className="text-base font-medium text-text-primary">
                    No hay cupones para usar ahora mismo.
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    Igual podés revisar abajo los próximos cupones disponibles y volver cuando se habilite el canje.
                  </p>
                </Card>
              )}

              {claimableLaterBenefits.length > 0 ? (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-text-primary">Para reclamar y usar después</h2>
                    <p className="text-sm text-text-muted">
                      Estos cupones ya se pueden reclamar, pero su ventana de canje todavía no está activa.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {claimableLaterBenefits.map((benefit) => (
                      <PublicBenefitCard key={benefit.id} benefit={benefit} compactDesktop />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </Reveal>
      </div>
    </main>
  );
}
