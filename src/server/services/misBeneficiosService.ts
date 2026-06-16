import {
  getMisBeneficioRow,
  getMisBeneficiosRows,
  getMisBeneficiosRubros,
  type MisBeneficiosFiltersInput,
  type ReclamoStatusRow,
} from "@/server/repositories/misBeneficiosRepository";
import {
  evaluateReclamoState,
  getCouponBlockMessage,
  ReclamoEffectiveStatus,
} from "@/lib/couponStatus";

function mapReclamoRow(r: ReclamoStatusRow) {
  const reclamoState = evaluateReclamoState({
    estado: r.estado,
    fechaExpiracion: r.beneficioFechaExpiracion,
    deletedAt: r.beneficioDeletedAt,
    maxUsos: r.beneficioMaxUsos,
    canjeados: r.beneficioCanjeados,
    diasValidos: r.beneficioDiasValidos,
  });

  return {
    id: r.id,
    effectiveStatus: reclamoState.status,
    canShowQr: reclamoState.canGenerateQr,
    blockedMessage:
      reclamoState.canGenerateQr ||
      (reclamoState.status !== ReclamoEffectiveStatus.PENDIENTE &&
        reclamoState.status !== ReclamoEffectiveStatus.AGOTADO)
      ? null
      : getCouponBlockMessage(reclamoState.blockReason, {
          diasValidos: r.beneficioDiasValidos,
          context: "redeem",
        }),
    fechaReclamo: r.fechaReclamo,
    fechaCanje: r.fechaCanje,
    beneficio: {
      descripcion: r.beneficioDescripcion,
      fechaExpiracion: r.beneficioFechaExpiracion,
      diasValidos: r.beneficioDiasValidos,
      local: { nombre: r.localNombre, id: r.localId, logoV: r.localLogoV, rubroNombre: r.localRubroNombre, direccion: r.localDireccion },
    },
  };
}

export type MisBeneficiosFilters = MisBeneficiosFiltersInput;

export async function getMisBeneficiosPageData(
  clienteId: string,
  page: number,
  pageSize: number,
  filters: MisBeneficiosFilters = {}
) {
  const rows = await getMisBeneficiosRows(clienteId, page, pageSize, filters);
  const total = rows[0]?.totalCount ?? 0;

  const reclamos = rows.map(mapReclamoRow);

  return {
    reclamos,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function getMisBeneficioStatusData(clienteId: string, reclamoId: string) {
  const row = await getMisBeneficioRow(clienteId, reclamoId);

  if (!row) {
    return null;
  }

  return mapReclamoRow(row);
}

export { getMisBeneficiosRubros };
