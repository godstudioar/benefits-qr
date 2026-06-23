import {
  BeneficioEffectiveStatus,
  type BeneficioEffectiveStatus as BeneficioStatus,
  getCouponBlockMessage,
  ReclamoEffectiveStatus,
  type ReclamoEffectiveStatus as ReclamoStatus,
} from "@/lib/couponStatus";
import type { BeneficioTimeWindows } from "@/lib/beneficioSchedule";
import type { SemanticVisualVariant } from "@/components/ui/buttonStyles";
import { CouponBlockReason } from "@/lib/couponStatus";

type StatusVariant = Extract<
  SemanticVisualVariant,
  "muted" | "success" | "danger" | "warning"
>;

type BeneficioStatusPresentation = {
  label: string;
  badgeVariant: StatusVariant;
  dashboardCardToneClassName: string;
  dashboardCardSurfaceClassName: string;
};

type BeneficioAvailabilityPresentation = {
  badgeLabel: string;
  badgeVariant: StatusVariant;
  message: string | null;
  isAvailable: boolean;
};

type ReclamoStatusPresentation = {
  label: string;
  badgeVariant: StatusVariant;
};

export function getBeneficioStatusPresentation(status: BeneficioStatus): BeneficioStatusPresentation {
  if (status === BeneficioEffectiveStatus.ELIMINADO) {
    return {
      label: "Eliminado",
      badgeVariant: "danger",
      dashboardCardToneClassName: "border-l-danger-border",
      dashboardCardSurfaceClassName: "",
    };
  }

  if (status === BeneficioEffectiveStatus.VENCIDO) {
    return {
      label: "Vencido",
      badgeVariant: "danger",
      dashboardCardToneClassName: "border-l-danger-border",
      dashboardCardSurfaceClassName: "",
    };
  }

  if (status === BeneficioEffectiveStatus.AGOTADO) {
    return {
      label: "Agotado",
      badgeVariant: "warning",
      dashboardCardToneClassName: "border-l-warning-border",
      dashboardCardSurfaceClassName: "",
    };
  }

  return {
    label: "Activo",
    badgeVariant: "success",
    dashboardCardToneClassName: "border-l-success-border",
    dashboardCardSurfaceClassName: "sm:bg-surface/85",
  };
}

export function getBeneficioAvailabilityPresentation({
  status,
  isWrongDay,
  isOutsideTimeWindow,
  diasValidos,
  ventanasHorarias = null,
  referenceDate,
}: {
  status: BeneficioStatus;
  isWrongDay: boolean;
  isOutsideTimeWindow?: boolean;
  diasValidos: number[];
  ventanasHorarias?: BeneficioTimeWindows | null;
  referenceDate?: Date;
}): BeneficioAvailabilityPresentation {
  if (status === BeneficioEffectiveStatus.ELIMINADO) {
    return {
      badgeVariant: "danger",
      badgeLabel: "No disponible",
      message: getCouponBlockMessage(CouponBlockReason.BENEFICIO_UNAVAILABLE),
      isAvailable: false,
    };
  }

  if (status === BeneficioEffectiveStatus.VENCIDO) {
    return {
      badgeVariant: "danger",
      badgeLabel: "Vencido",
      message: getCouponBlockMessage(CouponBlockReason.BENEFICIO_EXPIRED),
      isAvailable: false,
    };
  }

  if (status === BeneficioEffectiveStatus.AGOTADO) {
    return {
      badgeVariant: "danger",
      badgeLabel: "Agotado",
      message: getCouponBlockMessage(CouponBlockReason.BENEFICIO_MAX_USOS_REACHED),
      isAvailable: false,
    };
  }

  if (isWrongDay) {
    return {
      badgeVariant: "warning",
      badgeLabel: "No canjeable hoy",
      message: getCouponBlockMessage(CouponBlockReason.BENEFICIO_INVALID_DAY, {
        diasValidos,
        context: "claim",
      }),
      isAvailable: true,
    };
  }

  if (isOutsideTimeWindow) {
    return {
      badgeVariant: "warning",
      badgeLabel: "Disponible más tarde",
      message: getCouponBlockMessage(CouponBlockReason.BENEFICIO_OUTSIDE_TIME_WINDOW, {
        ventanasHorarias,
        referenceDate,
      }),
      isAvailable: true,
    };
  }

  return {
    badgeVariant: "success",
    badgeLabel: "Disponible",
    message: null,
    isAvailable: true,
  };
}

export function getReclamoStatusPresentation(status: ReclamoStatus): ReclamoStatusPresentation {
  if (status === ReclamoEffectiveStatus.CANCELADO) {
    return { label: "Cancelado", badgeVariant: "muted" };
  }

  if (status === ReclamoEffectiveStatus.CANJEADO) {
    return { label: "Canjeado", badgeVariant: "success" };
  }

  if (status === ReclamoEffectiveStatus.VENCIDO) {
    return { label: "Vencido", badgeVariant: "danger" };
  }

  if (status === ReclamoEffectiveStatus.AGOTADO) {
    return { label: "Agotado", badgeVariant: "warning" };
  }

  return { label: "Pendiente", badgeVariant: "warning" };
}
