import Card from "@/components/ui/Card";
import LinkButton from "@/components/ui/LinkButton";
import PublicBenefitCard from "@/components/public-benefits/PublicBenefitCard";
import { SHADOW } from "@/lib/shadowStyles";
import type { PublicBenefitsFiltersInput } from "@/server/services/publicBenefitsService";
import { getEventoBenefitsPageData } from "@/server/services/publicBenefitsService";

function buildPageUrl(slug: string, page: number, filterParams: URLSearchParams) {
  const next = new URLSearchParams(filterParams);
  next.set("page", String(page));
  return `/eventos/${slug}?${next.toString()}`;
}

const PAGE_SIZE = 9;

export default async function EventoBenefitsGrid({
  eventoId,
  eventoSlug,
  page,
  filters,
  filterParams,
}: {
  eventoId: string;
  eventoSlug: string;
  page: number;
  filters: PublicBenefitsFiltersInput;
  filterParams: URLSearchParams;
}) {
  const { beneficios, totalPages, total } = await getEventoBenefitsPageData(eventoId, page, PAGE_SIZE, filters);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  if (beneficios.length === 0) {
    return (
      <Card className={`border-surface/80 bg-surface/95 p-10 text-center ${SHADOW.cardBase} sm:bg-surface/85 sm:p-12 sm:backdrop-blur-md`}>
        <p className="text-sm text-text-muted">No hay cupones que coincidan con los filtros.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {beneficios.map((benefit) => (
          <PublicBenefitCard
            key={benefit.id}
            benefit={benefit}
            compactDesktop
            showAvailabilityMessage={false}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <LinkButton
            href={hasPrevious ? buildPageUrl(eventoSlug, page - 1, filterParams) : buildPageUrl(eventoSlug, 1, filterParams)}
            variant="secondary"
            size="sm"
            className={
              hasPrevious
                ? "min-w-0 px-2 text-[12px] sm:w-auto sm:px-3 sm:text-sm"
                : "pointer-events-none min-w-0 px-2 text-[12px] opacity-50 sm:w-auto sm:px-3 sm:text-sm"
            }
            aria-disabled={!hasPrevious}
          >
            ← Anterior
          </LinkButton>

          <p className="text-center text-[11px] leading-none text-text-muted sm:text-sm sm:leading-normal">
            <span className="sm:hidden">
              {Math.min(page, Math.max(totalPages, 1))}/{totalPages}
            </span>
            <span className="hidden sm:inline">
              Página {Math.min(page, Math.max(totalPages, 1))} de {totalPages} · {total}
            </span>
          </p>

          <LinkButton
            href={hasNext ? buildPageUrl(eventoSlug, page + 1, filterParams) : buildPageUrl(eventoSlug, page, filterParams)}
            variant="secondary"
            size="sm"
            className={
              hasNext
                ? "min-w-0 px-2 text-[12px] sm:w-auto sm:px-3 sm:text-sm"
                : "pointer-events-none min-w-0 px-2 text-[12px] opacity-50 sm:w-auto sm:px-3 sm:text-sm"
            }
            aria-disabled={!hasNext}
          >
            Siguiente →
          </LinkButton>
        </div>
      ) : null}
    </>
  );
}

export function EventoBenefitsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          className={`h-64 overflow-hidden border-surface/80 bg-surface/95 ${SHADOW.cardBase} sm:bg-surface/85 sm:backdrop-blur-md`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-full w-full animate-pulse bg-surface-muted" />
        </Card>
      ))}
    </div>
  );
}
