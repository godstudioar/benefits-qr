import {
  getDashboardStatsRaw,
  type TopCuponRaw,
  type TrendDay,
} from "@/server/repositories/dashboardStatsRepository";
import { normalizeBeneficioTimeWindows } from "@/lib/beneficioSchedule";
import { evaluateBeneficioState } from "@/lib/couponStatus";
import { parseRawDbTimestamp } from "@/lib/dates";
import { getBeneficioStatusPresentation } from "@/lib/statusPresentation";
import type { BadgeVariant } from "@/components/ui/Badge";

export type { TrendDay };

export type TopCupon = {
  id: string;
  descripcion: string;
  totalReclamos: number;
  canjeados: number;
  tasa: number;
  statusLabel: string;
  statusVariant: NonNullable<BadgeVariant>;
};

export type TopCliente = {
  id: string;
  nombre: string | null;
  email: string | null;
  canjeados: number;
};

export type DashboardStatsData = {
  trend: TrendDay[];
  recurrence: {
    porcentajeRecurrencia: number;
  };
  topCupones: TopCupon[];
  topClientes: TopCliente[];
  avgRedeemTimeFormatted: string;
  statusDistribution: {
    activos: number;
    vencidos: number;
    agotados: number;
    eliminados: number;
  };
};

function formatAvgRedeemTime(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds) || seconds <= 0) {
    return "Sin datos";
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }

  if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)} h`;
  }

  return `${(seconds / 86400).toFixed(1)} días`;
}

function mapTopCupon(raw: TopCuponRaw): TopCupon {
  const normalizedWindows = normalizeBeneficioTimeWindows(raw.ventanasHorarias, raw.diasValidos);
  const beneficioState = evaluateBeneficioState({
    fechaExpiracion: parseRawDbTimestamp(raw.fechaExpiracion),
    deletedAt: raw.deletedAt ? parseRawDbTimestamp(raw.deletedAt) : null,
    maxUsos: raw.maxUsos,
    canjeados: raw.canjeados,
    diasValidos: raw.diasValidos,
    ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
  });

  const status = getBeneficioStatusPresentation(beneficioState.status);

  return {
    id: raw.id,
    descripcion: raw.descripcion,
    totalReclamos: raw.totalReclamos,
    canjeados: raw.canjeados,
    tasa: raw.tasa,
    statusLabel: status.label,
    statusVariant: status.badgeVariant,
  };
}

export async function getDashboardStats(localId: string): Promise<DashboardStatsData> {
  const raw = await getDashboardStatsRaw(localId);

  const recurrence = raw.recurrence ?? { nuevos: 0, recurrentes: 0 };
  const totalClientesPeriodo = recurrence.nuevos + recurrence.recurrentes;
  const porcentajeRecurrencia =
    totalClientesPeriodo > 0
      ? Math.round((recurrence.recurrentes / totalClientesPeriodo) * 100)
      : 0;

  return {
    trend: raw.trend ?? [],
    recurrence: {
      porcentajeRecurrencia,
    },
    topCupones: (raw.topCupones ?? []).map(mapTopCupon),
    topClientes: raw.topClientes ?? [],
    avgRedeemTimeFormatted: formatAvgRedeemTime(raw.avgRedeemTimeSeconds),
    statusDistribution: raw.statusDistribution ?? {
      activos: 0,
      vencidos: 0,
      agotados: 0,
      eliminados: 0,
    },
  };
}
