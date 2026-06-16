import { Download, PencilLine } from "lucide-react";
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

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8 lg:max-w-4xl lg:pt-7 2xl:max-w-5xl 2xl:pt-8">
      <BeneficioDetailAutoRefresh />
      <div className="mb-4 flex justify-start sm:mb-5 lg:mb-4 2xl:mb-5">
        <LinkButton href="/dashboard" variant="subtle" size="sm">
          ← Volver
        </LinkButton>
      </div>

      <SectionHeader
        eyebrow="Detalle del cupón"
        title="Estado y actividad"
        description="Consultá métricas clave y el historial de clientes que reclamaron este cupón."
        align="left"
        className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6"
      />

      <Card className={`relative mb-6 border-surface/80 bg-surface/95 p-4 ${SHADOW.accentBase} sm:bg-surface/85 sm:p-6 lg:p-5 2xl:p-6`}>
        <div className="flex flex-col gap-5 lg:gap-4 2xl:gap-5">
          <div className="flex flex-col gap-4 pr-14 sm:pr-0 lg:gap-3 2xl:gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold leading-tight text-text-primary sm:text-xl lg:text-lg 2xl:text-xl">
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
                <p className="text-sm font-medium text-text-muted lg:text-[13px] 2xl:text-sm">
                  Vence: {formatDateAR(beneficio.fechaExpiracion)}
                  {beneficio.maxUsos && ` · Máx. ${beneficio.maxUsos} usos`}
                </p>
                <BenefitWeekdays diasValidos={beneficio.diasValidos} size="md" />
              </div>

              {!isDeleted ? (
                <div className="hidden shrink-0 sm:flex sm:items-start sm:justify-end sm:gap-2">
                  <DeleteBeneficioButton id={beneficio.id} />
                  <LinkButton
                    href={`/dashboard/beneficios/${beneficio.id}/editar`}
                    variant="outline"
                    size="sm"
                  >
                    Editar
                  </LinkButton>
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted lg:text-[10px] 2xl:text-[11px]">
              Actividad del cupón
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-2.5 2xl:gap-3">
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
        <h2 className="text-xl font-bold text-text-primary lg:text-lg 2xl:text-xl">
          Clientes ({stats.total})
        </h2>
        {stats.total > 0 && (
          <a
            href={`/api/beneficios/${id}/clientes-csv`}
            download
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border-default bg-surface-muted px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:text-[13px] 2xl:text-sm"
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
        <div className="space-y-2.5 lg:space-y-2 2xl:space-y-2.5">
          {reclamos.map((r) => {
            const status = getReclamoStatusPresentation(r.effectiveStatus);

            return (
              <Card
                key={r.id}
                className={`border-surface/80 bg-surface/95 p-3 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-3.5 lg:p-3 2xl:p-3.5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary sm:text-base lg:text-sm 2xl:text-base">
                      {r.cliente.nombre ?? r.cliente.email ?? "Cliente"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
                      {r.cliente.email ? (
                        <span className="break-all">{r.cliente.email}</span>
                      ) : (
                        <span>Sin contacto cargado</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted sm:text-xs lg:text-[11px] 2xl:text-xs">
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
            <div className="flex items-center justify-between pt-2">
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
          )}
        </div>
      )}
    </main>
  );
}
