import type { PublicBenefitsFiltersInput } from "@/server/services/publicBenefitsService";
import { getPublicBenefitsPageData } from "@/server/services/publicBenefitsService";
import PublicBenefitsList from "@/components/public-benefits/PublicBenefitsList";
import LinkButton from "@/components/ui/LinkButton";

function buildPageUrl(page: number, filterParams: URLSearchParams) {
  const next = new URLSearchParams(filterParams);
  next.set("page", String(page));
  return `/beneficios?${next.toString()}`;
}

const PAGE_SIZE = 9;

export default async function BenefitsGrid({
  page,
  filters,
  filterParams,
}: {
  page: number;
  filters: PublicBenefitsFiltersInput;
  filterParams: URLSearchParams;
}) {
  const { beneficios, totalPages, total } = await getPublicBenefitsPageData(page, PAGE_SIZE, filters);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <PublicBenefitsList
        benefits={beneficios}
        emptyMessage="No hay beneficios que coincidan con los filtros."
      />

      {totalPages > 1 ? (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <LinkButton
            href={hasPrevious ? buildPageUrl(page - 1, filterParams) : buildPageUrl(1, filterParams)}
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
            href={hasNext ? buildPageUrl(page + 1, filterParams) : buildPageUrl(page, filterParams)}
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

export function BenefitsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-2xl bg-surface-muted"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
