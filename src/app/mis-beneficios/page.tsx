import { Suspense } from "react";
import { redirect } from "next/navigation";
import MisBeneficiosList from "@/components/cliente/beneficio/MisBeneficiosList";
import WelcomeModal from "@/components/cliente/beneficio/WelcomeModal";
import LinkButton from "@/components/ui/LinkButton";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import { SHADOW } from "@/lib/shadowStyles";
import { getMisBeneficiosPageData } from "@/server/services/misBeneficiosService";
import { getClienteSessionFromCookies } from "@/lib/auth";
import { UserType } from "@/lib/enums";

const PAGE_SIZE = 10;

function ReclamosListSkeleton() {
  return (
    <>
      <div className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6">
        <Card className={`rounded-xl border-border-strong/40 bg-primary p-3 sm:p-4 ${SHADOW.accentBase}`}>
          <div className="mb-1 h-3 w-32 animate-pulse rounded bg-primary-foreground/20" />
          <div className="h-7 w-8 animate-pulse rounded bg-primary-foreground/30" />
        </Card>
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className={`overflow-hidden border-surface/80 bg-surface/95 ${SHADOW.accentBase}`}>
            <div className="h-1 bg-gradient-to-r from-primary to-accent opacity-30" />
             <div className="p-4 sm:p-5 lg:p-4 2xl:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-border-default" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-24 animate-pulse rounded bg-border-default" />
                      <div className="h-3 w-16 animate-pulse rounded bg-surface-muted" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-border-default" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
                  </div>
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-border-default" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

async function ReclamosList({
  clienteId,
  page,
}: {
  clienteId: string;
  page: number;
}) {
  const { reclamos, total, totalPages } = await getMisBeneficiosPageData(
    clienteId,
    page,
    PAGE_SIZE
  );

  return (
    <>
      <div className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6">
        <MetricCard label="Beneficios guardados" value={total} variant="primary" elevated />
      </div>

      <div className="space-y-4 lg:space-y-3.5 2xl:space-y-4">
        <MisBeneficiosList reclamos={reclamos} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <LinkButton
              href={`/mis-beneficios?page=${page - 1}`}
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
              href={`/mis-beneficios?page=${page + 1}`}
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
    </>
  );
}

export default async function MisBeneficiosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; welcome?: string }>;
}) {
  const { page: pageParam, welcome } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const session = await getClienteSessionFromCookies();

  if (!session || session.userType !== UserType.CLIENTE) {
    redirect("/acceso");
  }

  return (
    <main className="mx-auto max-w-3xl animate-[fade-in_0.3s_ease-out_both] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:max-w-2xl lg:pt-7 2xl:max-w-3xl 2xl:pt-8">
      {welcome === "1" ? <WelcomeModal /> : null}
      <SectionHeader
        eyebrow="Cliente"
        title="Mis cupones"
        description="Consultá tus beneficios guardados y mostrales el QR al local cuando quieras canjearlos."
        align="left"
        className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6"
      />

      <Suspense fallback={<ReclamosListSkeleton />}>
        <ReclamosList clienteId={session.userId} page={page} />
      </Suspense>
    </main>
  );
}
