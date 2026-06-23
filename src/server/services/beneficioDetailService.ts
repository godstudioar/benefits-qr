import { evaluateBeneficioState, evaluateReclamoState } from "@/lib/couponStatus";
import { normalizeBeneficioTimeWindows } from "@/lib/beneficioSchedule";
import { parseRawDbTimestamp } from "@/lib/dates";
import { getBeneficioDetailRaw } from "@/server/repositories/beneficioDetailRepository";

export async function getBeneficioDetailPageData(
  beneficioId: string,
  localId: string,
  page: number,
  pageSize: number
) {
  const raw = await getBeneficioDetailRaw(beneficioId, localId, page, pageSize);
  const rawStats = raw.stats ?? { total: 0, canjeados: 0, pendientes: 0 };

  const beneficio = raw.beneficio
      ? (() => {
        const fechaExpiracion = parseRawDbTimestamp(raw.beneficio.fechaExpiracion);
        const deletedAt = raw.beneficio.deletedAt ? parseRawDbTimestamp(raw.beneficio.deletedAt) : null;
        const normalizedWindows = normalizeBeneficioTimeWindows(
          raw.beneficio.ventanasHorarias,
          raw.beneficio.diasValidos,
        );
        const beneficioState = evaluateBeneficioState({
          fechaExpiracion,
          deletedAt,
          maxUsos: raw.beneficio.maxUsos,
          canjeados: raw.stats?.canjeados ?? 0,
          diasValidos: raw.beneficio.diasValidos,
          ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
        });

        return {
          ...raw.beneficio,
          fechaExpiracion,
          deletedAt,
          ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
          effectiveStatus: beneficioState.status,
        };
      })()
    : null;

  const maxUsos = raw.beneficio?.maxUsos ?? null;
  const stats = {
    ...rawStats,
    usosDisponibles: maxUsos !== null ? Math.max(0, maxUsos - rawStats.canjeados) : null,
  };
  const reclamos = (raw.reclamos ?? []).map((r) => {
    const fechaReclamo = parseRawDbTimestamp(r.fechaReclamo);
    const fechaCanje = r.fechaCanje ? parseRawDbTimestamp(r.fechaCanje) : null;
    const reclamoState = beneficio
      ? evaluateReclamoState({
          estado: r.estado,
          fechaExpiracion: beneficio.fechaExpiracion,
          deletedAt: beneficio.deletedAt,
          maxUsos: beneficio.maxUsos,
          canjeados: stats.canjeados,
          diasValidos: beneficio.diasValidos,
          ventanasHorarias: beneficio.ventanasHorarias,
        })
      : null;

    return {
      ...r,
      fechaReclamo,
      fechaCanje,
      effectiveStatus: reclamoState?.status ?? r.estado,
    };
  });

  return {
    beneficio,
    stats,
    reclamos,
    totalPages: Math.ceil(stats.total / pageSize),
  };
}

