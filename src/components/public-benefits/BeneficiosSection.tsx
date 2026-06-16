import BenefitsGrid from "@/components/public-benefits/BenefitsGrid";
import LandingLocalesMap from "@/components/public-benefits/LandingLocalesMap";
import PublicBenefitsViewToggle, {
  type PublicBenefitsView,
} from "@/components/public-benefits/PublicBenefitsViewToggle";
import { getTodosLocalesRaw } from "@/server/repositories/localesMapRepository";
import type { PublicBenefitsFiltersInput } from "@/server/services/publicBenefitsService";
import { getFilteredPublicBenefitsLocales } from "@/server/services/publicBenefitsService";

export default async function BeneficiosSection({
  page,
  filters,
  filterParams,
  navigationParamsString,
  vista,
}: {
  page: number;
  filters: PublicBenefitsFiltersInput;
  filterParams: URLSearchParams;
  navigationParamsString: string;
  vista: PublicBenefitsView;
}) {
  const locales = vista === "mapa" ? await getFilteredPublicBenefitsLocales(filters) : [];
  const hasMapFilters = Boolean(filters.q || filters.rubroId || filters.soloHoy || filters.soloDisponibles);
  const hasAnyLocatedLocales =
    vista === "mapa" && locales.length === 0 && hasMapFilters ? (await getTodosLocalesRaw()).length > 0 : false;
  const mapEmptyStateMessage =
    vista === "mapa" && locales.length === 0 && hasMapFilters && hasAnyLocatedLocales
      ? "No hay locales ubicados que coincidan con los filtros actuales."
      : undefined;

  return (
    <div className="space-y-5">
      <PublicBenefitsViewToggle vista={vista} />

      {vista === "mapa" ? (
        <LandingLocalesMap
          locales={locales}
          benefitsHrefSearchParams={navigationParamsString}
          emptyStateMessage={mapEmptyStateMessage}
        />
      ) : (
        <BenefitsGrid
          page={page}
          filters={filters}
          filterParams={filterParams}
        />
      )}
    </div>
  );
}
