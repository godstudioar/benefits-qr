import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleAlert, Store, Ticket, MapPinned } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EstadoReclamo } from "@/generated/prisma/client";
export const revalidate = 60;
import Badge from "@/components/ui/Badge";
import BrandLogo from "@/components/ui/BrandLogo";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Card from "@/components/ui/Card";
import LogoFrame from "@/components/ui/LogoFrame";
import ReclamarForm from "@/components/cliente/beneficio/ReclamarForm";
import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatDateAR } from "@/lib/dates";
import { sortDiasValidos } from "@/lib/beneficioSchedule";
import { evaluateBeneficioState } from "@/lib/couponStatus";
import { DIRECT_QR_FLOW } from "@/lib/flows";
import { getBeneficioAvailabilityPresentation } from "@/lib/statusPresentation";
import { getClienteSessionFromCookies } from "@/lib/auth";

export default async function BeneficioPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; flow?: string; redeemed?: string; order?: string; error?: string }>;
}) {
  const { token, flow, redeemed, order, error } = await searchParams;

  if (token) {
    redirect(`/api/auth/cliente/verify?token=${encodeURIComponent(token)}`);
  }

  const { id } = await params;

  const beneficio = await prisma.beneficio.findFirst({
    where: {
      id,
      deletedAt: null,
      local: {
        isTest: false,
        active: true,
      },
    },
    include: {
      local: { select: { nombre: true, logoUrl: true, direccion: true } },
      reclamos: { where: { estado: EstadoReclamo.CANJEADO }, select: { id: true } },
    },
  });

  if (!beneficio) notFound();

  // Check for existing cliente session and reclamo
  const clienteSession = await getClienteSessionFromCookies();
  let existingReclamoId: string | null = null;
  
  if (clienteSession) {
    const existingReclamo = await prisma.reclamo.findFirst({
      where: {
        beneficioId: id,
        clienteId: clienteSession.userId,
        estado: EstadoReclamo.PENDIENTE,
      },
      select: { id: true },
    });
    if (existingReclamo) {
      existingReclamoId = existingReclamo.id;
    }
  }

  const diasValidos: number[] = beneficio.diasValidos as number[];
  const beneficioState = evaluateBeneficioState({
    fechaExpiracion: beneficio.fechaExpiracion,
    deletedAt: beneficio.deletedAt,
    maxUsos: beneficio.maxUsos,
    canjeados: beneficio.reclamos.length,
    diasValidos,
  });
  const diasValidosOrdenados = sortDiasValidos(diasValidos);
  const localName = beneficio.local.nombre ?? "Local adherido";
  const mapsUrl = beneficio.local.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(beneficio.local.direccion)}`
    : null;
  const availability = getBeneficioAvailabilityPresentation({
    status: beneficioState.status,
    isWrongDay: beneficioState.isWrongDay,
    diasValidos,
  });

  const isDirectFlow = flow === DIRECT_QR_FLOW;
  const directRedeemed = isDirectFlow && redeemed === "1";
  const directOrderNumber = typeof order === "string" && order.trim() ? order.trim() : null;
  const directErrorCode = typeof error === "string" && error.trim() ? error.trim() : null;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-4 py-14 sm:overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 hidden h-[600px] w-[600px] rounded-full bg-primary/25 blur-3xl sm:block" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 hidden h-[500px] w-[500px] rounded-full bg-primary-soft/80 blur-3xl sm:block" />

      <LinkButton
        href="/beneficios"
        variant="subtle"
        size="sm"
        className="absolute top-5 left-5 z-40 sm:top-6 sm:left-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Beneficios
      </LinkButton>

      <div className="my-auto w-full max-w-md lg:max-w-sm 2xl:max-w-md">
        <Reveal y={14} amount={0.3}>
          <div className="mb-7 text-center lg:mb-6 2xl:mb-7">
            <div className="mb-4 flex justify-center lg:mb-3.5 2xl:mb-4">
              <BrandLogo priority />
            </div>

            <SectionHeader
              eyebrow="Beneficio"
              title={isDirectFlow ? "Canjeá tu cupón" : "Reclamá tu cupón"}
              description={
                isDirectFlow
                  ? "Entrá con Google o seguí como invitado para canjearlo ahora mismo."
                  : "Entrá con Google para guardarlo en tu cuenta o seguí como invitado con tu nombre."
              }
              className="mb-0"
            />
          </div>
        </Reveal>

        <Reveal delay={0.06} y={16} amount={0.35}>
          <Card className="overflow-hidden border-surface/80 bg-surface/90 shadow-xl shadow-primary-soft/60 sm:bg-surface/80 sm:backdrop-blur-md">
            <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />

            <div className="space-y-5 p-6 sm:p-8 lg:space-y-4 lg:p-6 2xl:space-y-5 2xl:p-8">
              <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h1 className="text-2xl font-bold text-text-primary lg:text-xl 2xl:text-2xl">{beneficio.descripcion}</h1>
                    <p className="text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
                      {isDirectFlow
                        ? "Canje inmediato para mostrar en caja sin pasos extra."
                        : "Guardalo ahora y usalo cuando corresponda."}
                    </p>
                  </div>

                  <Badge
                    variant={availability.badgeVariant}
                    className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  >
                    {availability.badgeLabel}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border-default/70 bg-surface-muted/70 p-4 lg:p-3.5 2xl:p-4">
                <div className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
                  <LogoFrame
                    src={beneficio.local.logoUrl}
                    alt={`Logo de ${localName}`}
                    name={localName}
                    className="h-11 w-11 rounded-xl lg:h-10 lg:w-10 2xl:h-11 2xl:w-11"
                    fallbackClassName="text-sm lg:text-[13px] 2xl:text-sm"
                  />

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-text-muted lg:text-[11px] 2xl:text-xs">
                      <Store className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Local adherido</span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary lg:text-[13px] 2xl:text-sm">
                      {localName}
                    </p>
                  </div>
                </div>
              </div>

              {beneficio.local.direccion && (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={mapsUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={`Abrir ${beneficio.local.direccion} en Google Maps`}
                  >
                    <Badge variant="muted" className="gap-1.5 px-3 py-1 transition-colors hover:bg-border-default">
                      <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="line-clamp-1 max-w-[240px]">{beneficio.local.direccion}</span>
                    </Badge>
                  </a>
                </div>
              )}

              <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="muted" className="gap-1.5 px-3 py-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Vence {formatDateAR(beneficio.fechaExpiracion)}
                  </Badge>
                  {beneficio.maxUsos !== null ? (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                      <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                      {beneficio.reclamos.length}/{beneficio.maxUsos} usos
                    </Badge>
                  ) : null}
                  <BenefitWeekdays diasValidos={diasValidosOrdenados} />
                </div>
              </div>

              {availability.message && (
                <div
                  aria-live="polite"
                  className={`rounded-2xl border px-4 py-3 text-sm lg:px-3.5 lg:py-2.5 lg:text-[13px] 2xl:px-4 2xl:py-3 2xl:text-sm ${
                    beneficioState.isExpired
                      ? "border-danger-border bg-danger-soft/60 text-danger"
                      : "border-warning-border bg-warning-soft/60 text-warning"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{availability.message}</p>
                  </div>
                </div>
              )}

              {beneficioState.canClaim && (
                <div className="space-y-4">
                  <ReclamarForm
                    beneficioId={beneficio.id}
                    directFlow={isDirectFlow}
                    initialDirectRedeemed={directRedeemed}
                    initialOrderNumber={directOrderNumber}
                    initialDirectErrorCode={directErrorCode}
                    initialReclamoId={existingReclamoId}
                    isLoggedIn={!!clienteSession}
                  />
                </div>
              )}
            </div>
          </Card>
        </Reveal>

        <p className="mt-3 text-center text-xs text-text-muted/80">Powered by Qupon</p>
      </div>
    </main>
  );
}
