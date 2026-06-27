import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleAlert, Ticket, MapPinned, ShieldCheck } from "lucide-react";
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
import {
  getBeneficioTimeWindowLabels,
  normalizeBeneficioTimeWindows,
  sortDiasValidos,
} from "@/lib/beneficioSchedule";
import { evaluateBeneficioState } from "@/lib/couponStatus";
import { DIRECT_QR_FLOW } from "@/lib/flows";
import { getBeneficioAvailabilityPresentation } from "@/lib/statusPresentation";
import { SHADOW } from "@/lib/shadowStyles";
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
    select: {
      id: true,
      descripcion: true,
      fechaExpiracion: true,
      maxUsos: true,
      diasValidos: true,
      ventanasHorarias: true,
      mediosPago: true,
      esAcumulable: true,
      condicionesExtra: true,
      local: { select: { nombre: true, logoUrl: true, direccion: true } },
      reclamos: { where: { estado: EstadoReclamo.CANJEADO }, select: { id: true } },
      evento: { select: { slug: true, fechaInicio: true } },
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
  const normalizedWindows = normalizeBeneficioTimeWindows(beneficio.ventanasHorarias, diasValidos);
  const beneficioState = evaluateBeneficioState({
    fechaExpiracion: beneficio.fechaExpiracion,
    deletedAt: null,
    maxUsos: beneficio.maxUsos,
    canjeados: beneficio.reclamos.length,
    diasValidos,
    ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
    eventoFechaInicio: beneficio.evento?.fechaInicio ?? null,
  });
  const diasValidosOrdenados = sortDiasValidos(diasValidos);
  const localName = beneficio.local.nombre ?? "Local adherido";
  const mapsUrl = beneficio.local.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(beneficio.local.direccion)}`
    : null;
  const availability = getBeneficioAvailabilityPresentation({
    status: beneficioState.status,
    isWrongDay: beneficioState.isWrongDay,
    isOutsideTimeWindow: beneficioState.isOutsideTimeWindow,
    isEventoNotStarted: beneficioState.isEventoNotStarted,
    diasValidos,
    ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
  });
  const timeWindowLabels = getBeneficioTimeWindowLabels(normalizedWindows.ok ? normalizedWindows.value : null);

  const isDirectFlow = flow === DIRECT_QR_FLOW;
  const directRedeemed = isDirectFlow && redeemed === "1";
  const directOrderNumber = typeof order === "string" && order.trim() ? order.trim() : null;
  const directErrorCode = typeof error === "string" && error.trim() ? error.trim() : null;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-4 py-14 sm:overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 hidden h-[600px] w-[600px] rounded-full bg-primary/25 blur-3xl sm:block" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 hidden h-[500px] w-[500px] rounded-full bg-primary-soft/80 blur-3xl sm:block" />

      <LinkButton
        href={beneficio.evento ? `/eventos/${beneficio.evento.slug}` : "/beneficios"}
        variant="subtle"
        size="sm"
        className="absolute top-5 left-5 z-40 sm:top-6 sm:left-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {beneficio.evento ? "Evento" : "Beneficios"}
      </LinkButton>

      {clienteSession ? (
        <LinkButton
          href="/mis-beneficios"
          variant="subtle"
          size="sm"
          className="absolute top-5 right-5 z-40 sm:top-6 sm:right-6"
        >
          Mis cupones
        </LinkButton>
      ) : null}

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
          <Card className={`overflow-hidden border-surface/80 bg-surface/90 ${SHADOW.focalBase} sm:bg-surface/80 sm:backdrop-blur-md`}>
            <div className="space-y-5 p-6 sm:p-8 lg:space-y-4 lg:p-6 2xl:space-y-5 2xl:p-8">
              <div className="relative pt-8 sm:pt-6 lg:pt-8 2xl:pt-6">
                <Badge
                  variant={availability.badgeVariant}
                  className="absolute top-0 right-0 lg:top-1 lg:right-1 2xl:top-0 2xl:right-0 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.14em]"
                >
                  {availability.badgeLabel}
                </Badge>

                <div className="flex flex-col items-center gap-4 text-center lg:gap-3.5 2xl:gap-4">
                  <LogoFrame
                    src={beneficio.local.logoUrl}
                    alt={`Logo de ${localName}`}
                    name={localName}
                    className="h-20 w-20 rounded-2xl lg:h-16 lg:w-16 2xl:h-20 2xl:w-20"
                    fallbackClassName="text-lg lg:text-base 2xl:text-lg"
                  />

                  <div className="space-y-1.5 lg:space-y-1 2xl:space-y-1.5">
                   
                    <h1 className="text-2xl font-bold text-text-primary lg:text-xl 2xl:text-2xl">{beneficio.descripcion}</h1>
                    <p className="text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
                      {isDirectFlow
                        ? "Canje inmediato para mostrar en caja sin pasos extra."
                        : "Guardalo ahora y usalo cuando corresponda."}
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
                {timeWindowLabels.length > 0 ? (
                  <div className="space-y-1 text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
                    {timeWindowLabels.map((label) => (
                      <p key={label}>{label}</p>
                    ))}
                  </div>
                ) : null}
              </div>

              {(beneficio.mediosPago.length > 0 || !beneficio.esAcumulable || beneficio.condicionesExtra) && (
                <div className="rounded-2xl border border-border-default/70 bg-surface-muted/70 p-4 lg:p-3.5 2xl:p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted lg:text-[11px] 2xl:text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Condiciones</span>
                  </div>
                  <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
                    {beneficio.mediosPago.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className="text-sm font-bold text-text-primary lg:text-[13px] 2xl:text-sm">
                          Medios de pago:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {beneficio.mediosPago.map((medio) => {
                            const label =
                              medio === "EFECTIVO" ? "Efectivo" :
                              medio === "TRANSFERENCIA" ? "Transferencia" :
                              medio === "DEBITO" ? "Débito" :
                              medio === "CREDITO" ? "Crédito" : medio;
                            return (
                              <Badge key={medio} variant="neutral" className="px-2.5 py-0.5 text-xs">
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!beneficio.esAcumulable && (
                      <p className="text-sm text-text-secondary lg:text-[13px] 2xl:text-sm">
                        No acumulable con otros descuentos
                      </p>
                    )}
                    {beneficio.condicionesExtra && (
                      <p className="text-sm text-text-secondary lg:text-[13px] 2xl:text-sm">
                        {beneficio.condicionesExtra}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
