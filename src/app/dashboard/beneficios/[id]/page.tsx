import { Download, PencilLine, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { UserType } from "@/lib/enums";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DeleteBeneficioButton from "@/components/local/dashboard/beneficios/DeleteBeneficioButton";
import BeneficioDetailAutoRefresh from "@/components/local/dashboard/beneficios/BeneficioDetailAutoRefresh";
import LinkButton from "@/components/ui/LinkButton";
import SectionHeader from "@/components/ui/SectionHeader";
import MetricCard from "@/components/ui/MetricCard";
import { formatDateAR, formatDateTimeAR } from "@/lib/dates";
import { buildOrderNumberFromReclamoId } from "@/lib/orderNumber";
import {
  getBeneficioStatusPresentation,
  getReclamoStatusPresentation,
} from "@/lib/statusPresentation";
import { getBeneficioDetailPageData } from "@/server/services/beneficioDetailService";
import { SHADOW } from "@/lib/shadowStyles";
import { getBeneficioTimeWindowLabels } from "@/lib/beneficioSchedule";
const PAGE_SIZE = 10;

export default async function BeneficioStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const session = await getSessionFromCookies();
  if (!session || session.userType !== UserType.LOCAL) redirect("/login");

  const { beneficio, stats, reclamos, totalPages } = await getBeneficioDetailPageData(
    id,
    session.userId,
    page,
    PAGE_SIZE
  );

  if (!beneficio) redirect("/dashboard");

  const benefitStatus = getBeneficioStatusPresentation(beneficio.effectiveStatus);

  const isDeleted = beneficio.deletedAt !== null;
  const timeWindowLabels = getBeneficioTimeWindowLabels(beneficio.ventanasHorarias);

  return (
    <main>
      <BeneficioDetailAutoRefresh />
      <div className="mb-3 flex justify-start sm:mb-4">
        <LinkButton href="/dashboard" variant="subtle" size="sm">
          ← Volver
        </LinkButton>
      </div>

      <SectionHeader
        eyebrow="Detalle del cupón"
        title="Estado y actividad"
        description="Consultá métricas clave y el historial de clientes que reclamaron este cupón."
        align="left"
        titleAs="p"
      />

      <Card className={`relative mb-6 border-surface/80 bg-surface/95 p-4 ${SHADOW.accentBase} sm:bg-surface/85 sm:p-6`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 pr-14 sm:pr-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold leading-tight text-text-primary sm:text-xl">
                    {beneficio.descripcion}
                  </h1>
                  {isDeleted ? (
                    <Badge variant="danger">Eliminado</Badge>
                  ) : (
                    <Badge variant={benefitStatus.badgeVariant}>{benefitStatus.label}</Badge>
                  )}
                  <Badge variant={beneficio.esPublico ? "primary" : "secondary"}>
                    {beneficio.esPublico ? "Público" : "Privado"}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-text-muted">
                  Vence: {formatDateAR(beneficio.fechaExpiracion)}
                  {beneficio.maxUsos && ` · Máx. ${beneficio.maxUsos} usos`}
                </p>
                <div className="space-y-1.5">
                  <BenefitWeekdays diasValidos={beneficio.diasValidos} size="md" />
                  {timeWindowLabels.length > 0 ? (
                    <div className="space-y-1 text-xs text-text-muted">
                      {timeWindowLabels.map((label) => (
                        <p key={label}>{label}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
                {(beneficio.mediosPago.length > 0 || !beneficio.esAcumulable || beneficio.condicionesExtra) && (
                  <div className="rounded-xl border border-border-default/70 bg-surface-muted/60 px-3 py-2.5">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      <span>Condiciones</span>
                    </div>
                    <div className="space-y-1.5">
                      {beneficio.mediosPago.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-bold text-text-primary">
                            Medios de pago:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {beneficio.mediosPago.map((medio) => {
                              const label =
                                medio === "EFECTIVO" ? "Efectivo" :
                                medio === "TRANSFERENCIA" ? "Transferencia" :
                                medio === "DEBITO" ? "Débito" :
                                medio === "CREDITO" ? "Crédito" : medio;
                              return (
                                <Badge key={medio} variant="neutral" className="px-2 py-0 text-[11px]">
                                  {label}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {!beneficio.esAcumulable && (
                        <p className="text-xs text-text-secondary">
                          No acumulable con otros descuentos
                        </p>
                      )}
                      {beneficio.condicionesExtra && (
                        <p className="text-xs text-text-secondary">
                          {beneficio.condicionesExtra}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isDeleted ? (
                <div className="hidden shrink-0 sm:flex sm:items-start sm:justify-end sm:gap-2">
                  <LinkButton
                    href={`/dashboard/beneficios/${beneficio.id}/editar`}
                    variant="outline"
                    size="sm"
                  >
                    Editar
                  </LinkButton>
                  <DeleteBeneficioButton id={beneficio.id} />
                </div>
              ) : null}
            </div>
          </div>

          {!isDeleted ? (
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 sm:hidden">
              <DeleteBeneficioButton id={beneficio.id} iconOnly />
              <LinkButton
                href={`/dashboard/beneficios/${beneficio.id}/editar`}
                variant="outline"
                size="icon-sm"
                aria-label="Editar cupón"
                title="Editar cupón"
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Editar cupón</span>
              </LinkButton>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Actividad del cupón
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <MetricCard label="Reclamos" value={stats.total} variant="secondary" elevated />
              <MetricCard label="Canjeados" value={stats.canjeados} variant="light" elevated />
              <MetricCard
                label="Usos disponibles"
                value={stats.usosDisponibles ?? "∞"}
                variant="warning"
                elevated
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-text-primary">
          Clientes ({stats.total})
        </h2>
        {stats.total > 0 && (
          <a
            href={`/api/beneficios/${id}/clientes-csv`}
            download
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border-default bg-surface-muted px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Descargar datos
          </a>
        )}
      </div>

      {stats.total === 0 ? (
        <Card className={`p-8 text-center ${SHADOW.cardBase}`}>
          <p className="text-text-muted">Nadie reclamó este cupón aún</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {reclamos.map((r) => {
            const status = getReclamoStatusPresentation(r.effectiveStatus);

            return (
              <Card
                key={r.id}
                className={`border-surface/80 bg-surface/95 p-3 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-3.5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary sm:text-base">
                      {r.cliente.nombre ?? r.cliente.email ?? "Cliente"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                      {r.cliente.email ? (
                        <span className="break-all">{r.cliente.email}</span>
                      ) : (
                        <span>Sin contacto cargado</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                      {r.fechaCanje ? (
                        <span className="font-semibold text-text-primary">
                          Orden: {buildOrderNumberFromReclamoId(r.id)}
                        </span>
                      ) : null}
                      <span>Reclamó: {formatDateTimeAR(r.fechaReclamo)}</span>
                      {r.fechaCanje ? (
                        <span>Canjeó: {formatDateTimeAR(r.fechaCanje)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Badge variant={status.badgeVariant}>{status.label}</Badge>
                  </div>
                </div>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <nav aria-label="Paginación" className="pt-2">
              <div className="flex items-center justify-between">
                <LinkButton
                  href={`/dashboard/beneficios/${id}?page=${page - 1}`}
                  variant="secondary"
                  size="sm"
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  aria-disabled={page <= 1}
                >
                  ← Anterior
                </LinkButton>
                <span className="text-sm text-text-muted">
                  Página {page} de {totalPages}
                </span>
                <LinkButton
                  href={`/dashboard/beneficios/${id}?page=${page + 1}`}
                  variant="secondary"
                  size="sm"
                  className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  aria-disabled={page >= totalPages}
                >
                  Siguiente →
                </LinkButton>
              </div>
            </nav>
          )}
        </div>
      )}
    </main>
  );
}
