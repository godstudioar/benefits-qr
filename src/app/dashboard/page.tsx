import DashboardRefreshButton from "@/components/local/dashboard/DashboardRefreshButton";
import ShareButtons from "@/components/local/dashboard/ShareButtons";
import BenefitWeekdays from "@/components/ui/BenefitWeekdays";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";
import LogoFrame from "@/components/ui/LogoFrame";
import Reveal from "@/components/ui/Reveal";
import { Eye, PencilLine } from "lucide-react";
import { getSessionFromCookies } from "@/lib/auth";
import { formatDateAR } from "@/lib/dates";
import { UserType } from "@/lib/enums";
import { getLocalLogoDisplayUrl } from "@/lib/localLogoSource";
import { getBeneficioStatusPresentation } from "@/lib/statusPresentation";
import { getDashboardPageData } from "@/server/services/dashboardService";
import { redirect } from "next/navigation";

const PAGE_SIZE = 10;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const session = await getSessionFromCookies();
  if (!session || session.userType !== UserType.LOCAL) {
    redirect("/login");
  }

  const {
    local,
    beneficios,
    totalBeneficios,
    totalPages,
  } = await getDashboardPageData(session.userId, page, PAGE_SIZE);

  if (!local) redirect("/login");
  if (local.nombre === null) redirect("/onboarding");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const localName = local.nombre ?? "Local adherido";
  const localLogoDisplayUrl = getLocalLogoDisplayUrl({
    localId: local.id,
    logoUrl: local.logoUrl,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-16 lg:max-w-4xl lg:pt-7 lg:pb-14 2xl:max-w-5xl 2xl:pt-8 2xl:pb-16">
      <Reveal y={10} amount={0.2} className="mb-5 sm:mb-6">
        <div className="rounded-2xl border border-surface/80 bg-surface/95 p-3 shadow-sm shadow-primary-soft/40 sm:bg-surface/85 sm:p-4 lg:p-3.5 2xl:p-4">
          <div className="flex items-start justify-between gap-4 lg:gap-3 2xl:gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="shrink-0">
                <LogoFrame
                  src={localLogoDisplayUrl}
                  alt={`Logo de ${localName}`}
                  name={localName}
                  className="h-16 w-16 sm:h-20 sm:w-20 lg:h-[4.5rem] lg:w-[4.5rem] 2xl:h-20 2xl:w-20"
                  fallbackClassName="text-2xl sm:text-3xl lg:text-[1.625rem] 2xl:text-3xl"
                />
              </div>
                <div className="min-w-0 space-y-0.5 lg:space-y-0">
                  <h1 className="text-lg font-bold leading-tight text-text-primary sm:text-xl lg:text-lg 2xl:text-xl">
                    {localName}
                  </h1>
                  <p className="break-all text-sm font-medium text-text-muted lg:text-[13px] 2xl:text-sm">
                   {local.email}
                 </p>
                {local.direccion && (
                   <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">{local.direccion}</p>
                )}
                {local.telefono && (
                   <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">{local.telefono}</p>
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
        </div>
      </Reveal>

      {/* Beneficios */}
      <div id="mis-cupones" className="scroll-mt-24">
        <Reveal y={8} amount={0.2} className="mb-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-surface/80 bg-surface/95 p-4 sm:bg-surface/85 sm:p-5 lg:gap-2.5 lg:p-4 2xl:gap-3 2xl:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-text-primary lg:text-lg 2xl:text-xl">Mis cupones</h2>
                <p className="text-sm font-medium text-text-muted lg:text-[13px] 2xl:text-sm">
                  Gestioná estado, vigencia y acciones de cada cupón.
                </p>
              </div>
              <div className="self-center">
                <DashboardRefreshButton />
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {totalBeneficios === 0 ? (
        <Reveal y={12} amount={0.2}>
           <Card className="border-surface/70 bg-surface/90 p-10 text-center sm:bg-surface/75 sm:backdrop-blur-md sm:p-12 lg:p-9 2xl:p-12">
            <p className="mb-2 text-base font-medium text-text-primary">
              No tenés cupones aún
            </p>
            <p className="mb-5 text-sm text-text-muted">
              Creá el primero para empezar a recibir reclamos.
            </p>
            <LinkButton
              href="/dashboard/beneficios/nuevo"
              variant="primary"
              size="sm"
            >
              Crear primer cupón
            </LinkButton>
          </Card>
        </Reveal>
      ) : (
         <div className="space-y-3 sm:space-y-4 lg:space-y-3.5 2xl:space-y-4">
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
                   className={`relative border border-surface/80 border-l-4 ${status.dashboardCardToneClassName} ${status.dashboardCardSurfaceClassName} p-3 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 lg:p-4 2xl:p-5`}
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
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4 lg:gap-3 2xl:gap-4">
                     <div className="min-w-0 flex-1 pr-14 sm:pr-0">
                       <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2 lg:mb-1.5 2xl:mb-2">
                         <h3 className="truncate text-base font-semibold text-text-primary sm:text-lg lg:text-base 2xl:text-lg">
                          {b.descripcion}
                        </h3>
                        <Badge variant={status.badgeVariant}>{status.label}</Badge>
                      </div>

                       <div className="grid gap-1 text-[13px] leading-tight sm:grid-cols-2 sm:gap-1.5 sm:text-sm lg:text-[13px] 2xl:text-sm">
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

                       <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2 lg:mt-2.5 2xl:mt-3">
                        <Badge variant="muted">
                          Reclamos: {b.totalReclamos}
                        </Badge>
                        <Badge variant="light">Canjeados: {canjeados}</Badge>
                      </div>
                    </div>

                     <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:self-stretch sm:items-end sm:justify-between sm:gap-1.5 2xl:gap-2">
                        <div className="flex items-start justify-between gap-2 sm:justify-end">
                          <ShareButtons
                            url={shareUrl}
                            descripcion={b.descripcion}
                            nombreLocal={local.nombre!}
                            fechaExpiracion={b.fechaExpiracion}
                          />
                        </div>
                       <div className="hidden w-full grid-cols-2 gap-2 sm:mt-auto sm:flex sm:w-auto sm:grid-cols-none">
                         <LinkButton
                           href={`/dashboard/beneficios/${b.id}/editar`}
                           variant="outline"
                           size="sm"
                           className="min-h-10 justify-center px-3 text-sm sm:min-h-9 sm:w-auto sm:px-3 sm:py-2 sm:text-sm lg:min-h-8 lg:px-2.5 lg:text-xs 2xl:min-h-9 2xl:px-3 2xl:text-sm"
                         >
                           Editar
                         </LinkButton>
                         <LinkButton
                           href={`/dashboard/beneficios/${b.id}`}
                           variant="muted"
                           size="sm"
                           className="min-h-10 justify-center px-3 text-sm sm:min-h-9 sm:w-auto sm:px-3 sm:py-2 sm:text-sm lg:min-h-8 lg:px-2.5 lg:text-xs 2xl:min-h-9 2xl:px-3 2xl:text-sm"
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
             <div className="flex items-center justify-between pt-3 lg:pt-2.5 2xl:pt-3">
              <LinkButton
                href={`/dashboard?page=${page - 1}`}
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
                href={`/dashboard?page=${page + 1}`}
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
          )}
        </div>
      )}
    </main>
  );
}
