import { Suspense } from "react";
import DashboardFilters from "@/components/local/dashboard/DashboardFilters";
import LocalQrActions from "@/components/local/dashboard/LocalQrActions";
import DashboardRefreshButton from "@/components/local/dashboard/DashboardRefreshButton";
import ShareButtons from "@/components/local/dashboard/ShareButtons";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import FieldHelp from "@/components/ui/FieldHelp";
import LinkButton from "@/components/ui/LinkButton";
import LogoFrame from "@/components/ui/LogoFrame";
import Reveal from "@/components/ui/Reveal";
import { Eye, PencilLine } from "lucide-react";
import { getSessionFromCookies } from "@/lib/auth";
import { formatDateAR } from "@/lib/dates";
import { UserType } from "@/lib/enums";
import { getLocalLogoDisplayUrl } from "@/lib/localLogoSource";
import { getBeneficioStatusPresentation } from "@/lib/statusPresentation";
import { INTERACTION, SHADOW } from "@/lib/shadowStyles";
import {
  getDashboardPageData,
  type DashboardFilters as DashboardFiltersType,
} from "@/server/services/dashboardService";
import { BeneficioEffectiveStatus } from "@/lib/couponStatus";
import { redirect } from "next/navigation";

const PAGE_SIZE = 10;

function isValidDashboardStatus(
  value: string | undefined
): value is BeneficioEffectiveStatus {
  return (
    value !== undefined &&
    Object.values(BeneficioEffectiveStatus).includes(
      value as BeneficioEffectiveStatus
    )
  );
}

function buildPageHref(pageNum: number, filterParams: URLSearchParams) {
  const params = new URLSearchParams(filterParams);
  if (pageNum > 1) {
    params.set("page", String(pageNum));
  } else {
    params.delete("page");
  }
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    soloHoy?: string;
  }>;
}) {
  const { page: pageParam, q, status, soloHoy } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const session = await getSessionFromCookies();
  if (!session || session.userType !== UserType.LOCAL) {
    redirect("/login");
  }

  const filters: DashboardFiltersType = {
    q: q?.trim() || undefined,
    status: isValidDashboardStatus(status) ? status : undefined,
    soloHoy: soloHoy === "1",
  };

  const filterParams = new URLSearchParams();
  if (filters.q) filterParams.set("q", filters.q);
  if (filters.status) filterParams.set("status", filters.status);
  if (filters.soloHoy) filterParams.set("soloHoy", "1");

  const hasFilters = Boolean(
    filters.q || filters.status || filters.soloHoy
  );

  const {
    local,
    beneficios,
    totalBeneficios,
    totalPages,
  } = await getDashboardPageData(session.userId, page, PAGE_SIZE, filters);

  if (!local) redirect("/login");
  if (local.nombre === null) redirect("/onboarding");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const localName = local.nombre ?? "Local adherido";
  const localLogoDisplayUrl = getLocalLogoDisplayUrl({
    localId: local.id,
    logoUrl: local.logoUrl,
  });
  const localShareUrl = `${appUrl}/local/${local.id}`;

  return (
    <main>
      <Reveal y={10} amount={0.2} className="mb-5 sm:mb-6">
        <div className={`rounded-2xl border border-surface/80 bg-surface/95 p-3 ${SHADOW.focalBase} sm:bg-surface/85 sm:p-4`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="shrink-0">
                <LogoFrame
                  src={localLogoDisplayUrl}
                  alt={`Logo de ${localName}`}
                  name={localName}
                  className="h-16 w-16 sm:h-20 sm:w-20"
                  fallbackClassName="text-2xl sm:text-3xl"
                />
              </div>
                <div className="min-w-0 space-y-0.5">
                  <h1 className="text-lg font-bold leading-tight text-text-primary sm:text-xl">
                     {localName}
                   </h1>
                   <p className="break-all text-sm font-medium text-text-muted">
                    {local.email}
                  </p>
                 {local.direccion && (
                    <p className="text-xs text-text-muted">{local.direccion}</p>
                 )}
                 {local.telefono && (
                    <p className="text-xs text-text-muted">{local.telefono}</p>
                 )}
               </div>
            </div>
            {local.rubroNombre && (
              <div className="shrink-0 pt-0.5">
                <Badge variant="muted" className="px-2 py-0 text-[11px]">
                  {local.rubroNombre}
                </Badge>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-start justify-between gap-3 border-t border-border-default/70 pt-4 sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-text-primary">QR de tu negocio</p>
                <FieldHelp
                  label="QR de tu negocio"
                  content="Imprimí un solo QR para la página de tu local y dejá que el cliente elija cualquier cupón activo."
                />
              </div>
            </div>
            <LocalQrActions url={localShareUrl} localName={localName} />
          </div>
        </div>
      </Reveal>

      {/* Beneficios */}
      <div id="mis-cupones" className="scroll-mt-24">
        <Reveal y={8} amount={0.2} className="mb-4">
          <div className={`flex items-center justify-between gap-3 rounded-2xl border border-surface/80 bg-surface/95 p-4 ${SHADOW.cardBase} sm:bg-surface/85 sm:p-5`}>
            <h2 className="text-xl font-bold text-text-primary">Mis cupones</h2>
            <div className="self-center">
              <DashboardRefreshButton />
            </div>
          </div>
        </Reveal>
      </div>

      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>

      {totalBeneficios === 0 ? (
        <Reveal y={12} amount={0.2}>
           <Card className={`border-surface/70 bg-surface/90 p-10 text-center ${SHADOW.accentBase} sm:bg-surface/75 sm:backdrop-blur-md sm:p-12`}>
            <p className="mb-2 text-base font-medium text-text-primary">
              {hasFilters
                ? "No se encontraron cupones con los filtros aplicados"
                : "No tenés cupones aún"}
            </p>
            <p className="mb-5 text-sm text-text-muted">
              {hasFilters
                ? "Probá con otros filtros o limpiá la búsqueda."
                : "Creá el primero para empezar a recibir reclamos."}
            </p>
            {!hasFilters && (
              <LinkButton
                href="/dashboard/beneficios/nuevo"
                variant="primary"
                size="sm"
              >
                Crear primer cupón
              </LinkButton>
            )}
          </Card>
        </Reveal>
      ) : (
         <div className="space-y-3 sm:space-y-4">
          {beneficios.map((b, index) => {
            const canjeados = b.canjeados;
            const shareUrl = `${appUrl}/beneficio/${b.id}`;
            const vencimiento = formatDateAR(b.fechaExpiracion);
            const status = getBeneficioStatusPresentation(b.effectiveStatus);

            return (
              <Reveal
                key={b.id}
                delay={Math.min(index * 0.04, 0.2)}
                y={10}
                amount={0.15}
              >
                <Card
                    className={`relative border border-surface/80 border-l-4 ${status.dashboardCardToneClassName} ${status.dashboardCardSurfaceClassName} p-3 ${SHADOW.cardBase} ${INTERACTION.hoverLift} ${SHADOW.cardHover} sm:p-5`}
                >
                  <div className="absolute top-3 right-3 flex flex-col gap-2 sm:hidden">
                    <LinkButton
                      href={`/dashboard/beneficios/${b.id}`}
                      variant="muted"
                      size="icon-sm"
                      aria-label="Ver detalle del cupón"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Ver detalle</span>
                    </LinkButton>
                    <LinkButton
                      href={`/dashboard/beneficios/${b.id}/editar`}
                      variant="outline"
                      size="icon-sm"
                      aria-label="Editar cupón"
                      title="Editar cupón"
                    >
                      <PencilLine className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Editar</span>
                    </LinkButton>
                  </div>
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1 pr-14 sm:pr-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
                          <h3 className="truncate text-base font-semibold text-text-primary sm:text-lg">
                           {b.descripcion}
                         </h3>
                        <Badge variant={status.badgeVariant}>{status.label}</Badge>
                      </div>

                        <div className="grid gap-1 text-[13px] leading-tight sm:grid-cols-2 sm:gap-1.5 sm:text-sm">
                        <p className="font-medium text-text-muted">
                          <span className="font-semibold text-text-primary">
                            Vence:
                          </span>{" "}
                          {vencimiento}
                        </p>
                        <p className="font-medium text-text-muted sm:text-right">
                          <span className="font-semibold text-text-primary">
                            Usos:
                          </span>{" "}
                          {b.maxUsos
                            ? `${canjeados}/${b.maxUsos}`
                            : `${canjeados}/∞`}
                        </p>
                          <BenefitWeekdays diasValidos={b.diasValidos} size="md" className="sm:col-span-2" />
                       </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
                        <Badge variant="muted">
                          Reclamos: {b.totalReclamos}
                        </Badge>
                        <Badge variant="light">Canjeados: {canjeados}</Badge>
                      </div>
                    </div>

                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:self-stretch sm:items-end sm:justify-between">
                        <div className="flex items-start justify-between gap-2 sm:justify-end">
                          <ShareButtons
                            url={shareUrl}
                            descripcion={b.descripcion}
                            nombreLocal={local.nombre!}
                            fechaExpiracion={b.fechaExpiracion}
                          />
                        </div>
                        <div className="hidden w-full gap-2 sm:mt-auto sm:flex sm:w-auto">
                          <LinkButton
                            href={`/dashboard/beneficios/${b.id}/editar`}
                            variant="outline"
                            size="sm"
                            className="min-h-10 justify-center px-3 text-sm sm:min-h-9 sm:w-auto sm:py-2"
                          >
                            Editar
                          </LinkButton>
                          <LinkButton
                            href={`/dashboard/beneficios/${b.id}`}
                            variant="muted"
                            size="sm"
                            className="min-h-10 justify-center px-3 text-sm sm:min-h-9 sm:w-auto sm:py-2"
                          >
                            Ver detalle
                          </LinkButton>
                       </div>
                     </div>
                   </div>
                 </Card>
              </Reveal>
            );
          })}
          {totalPages > 1 && (
            <nav aria-label="Paginación" className="pt-3">
              <div className="flex items-center justify-between">
                <LinkButton
                  href={buildPageHref(page - 1, filterParams)}
                  variant="secondary"
                  size="sm"
                  className={
                    page <= 1 ? "pointer-events-none opacity-50" : undefined
                  }
                  aria-disabled={page <= 1}
                >
                  ← Anterior
                </LinkButton>
                <span className="text-sm text-text-muted">
                  Página {page} de {totalPages}
                </span>
                <LinkButton
                  href={buildPageHref(page + 1, filterParams)}
                  variant="secondary"
                  size="sm"
                  className={
                    page >= totalPages
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
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
