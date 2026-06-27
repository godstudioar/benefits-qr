import { normalizeBeneficioTimeWindows } from "@/lib/beneficioSchedule";
import { evaluateBeneficioState, type BeneficioEffectiveStatus } from "@/lib/couponStatus";
import { parseRawDbTimestamp } from "@/lib/dates";
import { getBeneficioAvailabilityPresentation } from "@/lib/statusPresentation";
import {
  getFilteredLocalesForPublicBenefitsRaw,
  getFeaturedPublicBenefitsRaw,
  getPublicBenefitsCatalogRaw,
  type PublicBenefitsCatalogRaw,
  type PublicBenefitsFiltersInput,
} from "@/server/repositories/publicBenefitsRepository";
import { getEventoBenefitsCatalogRaw } from "@/server/repositories/eventoBenefitsRepository";

export type { PublicBenefitsFiltersInput };

export type PublicBenefitCardData = {
  id: string;
  descripcion: string;
  fechaExpiracion: Date;
  maxUsos: number | null;
  diasValidos: number[];
  createdAt: Date;
  canjeados: number;
  effectiveStatus: BeneficioEffectiveStatus;
  availability: ReturnType<typeof getBeneficioAvailabilityPresentation>;
  local: {
    nombre: string | null;
    logoUrl: string | null;
    rubroNombre: string | null;
    direccion: string | null;
    lat: number | null;
    lng: number | null;
  };
};

function hydratePublicBenefits(raw: PublicBenefitsCatalogRaw) {
  return (raw.beneficios ?? []).map((beneficio) => {
    const { ventanasHorarias: rawVentanasHorarias, ...restBeneficio } = beneficio;
    const fechaExpiracion = parseRawDbTimestamp(beneficio.fechaExpiracion);
    const createdAt = parseRawDbTimestamp(beneficio.createdAt);
    const normalizedWindows = normalizeBeneficioTimeWindows(rawVentanasHorarias, beneficio.diasValidos);
    const benefitState = evaluateBeneficioState({
      fechaExpiracion,
      maxUsos: beneficio.maxUsos,
      canjeados: beneficio.canjeados,
      diasValidos: beneficio.diasValidos,
      ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
    });

    return {
      ...restBeneficio,
      fechaExpiracion,
      createdAt,
      effectiveStatus: benefitState.status,
      availability: getBeneficioAvailabilityPresentation({
        status: benefitState.status,
        isWrongDay: benefitState.isWrongDay,
        isOutsideTimeWindow: benefitState.isOutsideTimeWindow,
        diasValidos: beneficio.diasValidos,
        ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
      }),
      } satisfies PublicBenefitCardData;
  });
}

export async function getPublicBenefitsPageData(page: number, pageSize: number, filters: PublicBenefitsFiltersInput = {}) {
  const raw = await getPublicBenefitsCatalogRaw(page, pageSize, filters);
  const total = Number(raw.total ?? 0);
  const beneficios = hydratePublicBenefits(raw);

  return {
    beneficios,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getFeaturedPublicBenefits(limit: number) {
  const raw = await getFeaturedPublicBenefitsRaw(limit);
  const beneficios = hydratePublicBenefits(raw);

  return {
    beneficios,
  };
}

export async function getFilteredPublicBenefitsLocales(filters: PublicBenefitsFiltersInput = {}) {
  return getFilteredLocalesForPublicBenefitsRaw(filters);
}

export async function getEventoBenefitsPageData(eventoId: string, page: number, pageSize: number, filters: PublicBenefitsFiltersInput = {}) {
  const raw = await getEventoBenefitsCatalogRaw(eventoId, page, pageSize, filters);
  const total = Number(raw.total ?? 0);
  const beneficios = hydratePublicBenefits(raw);

  return {
    beneficios,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
