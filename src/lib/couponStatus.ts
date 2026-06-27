import {
  getArgentinaDateTimeParts,
  getCurrentDayInArgentina,
  getCurrentISODateInArgentina,
  shiftArgentinaIsoDate,
} from "@/lib/argentinaTime";
import {
  type BeneficioTimeWindows,
  formatMinuteOfDay,
  formatDiasValidosSentence,
  getDiaLabel,
  hasBeneficioTimeWindows,
  isCrossMidnightWindow,
  sortDiasValidos,
} from "@/lib/beneficioSchedule";

const ReclamoPersistedStatus = {
  PENDIENTE: "PENDIENTE",
  CANJEADO: "CANJEADO",
  CANCELADO: "CANCELADO",
} as const;

type ReclamoPersistedStatus =
  (typeof ReclamoPersistedStatus)[keyof typeof ReclamoPersistedStatus];

export const BeneficioEffectiveStatus = {
  ACTIVO: "ACTIVO",
  AGOTADO: "AGOTADO",
  VENCIDO: "VENCIDO",
  ELIMINADO: "ELIMINADO",
} as const;

export type BeneficioEffectiveStatus =
  (typeof BeneficioEffectiveStatus)[keyof typeof BeneficioEffectiveStatus];

export const ReclamoEffectiveStatus = {
  PENDIENTE: "PENDIENTE",
  CANJEADO: "CANJEADO",
  CANCELADO: "CANCELADO",
  VENCIDO: "VENCIDO",
  AGOTADO: "AGOTADO",
} as const;

export type ReclamoEffectiveStatus =
  (typeof ReclamoEffectiveStatus)[keyof typeof ReclamoEffectiveStatus];

export const CouponBlockReason = {
  NONE: "NONE",
  BENEFICIO_UNAVAILABLE: "BENEFICIO_UNAVAILABLE",
  BENEFICIO_EXPIRED: "BENEFICIO_EXPIRED",
  BENEFICIO_MAX_USOS_REACHED: "BENEFICIO_MAX_USOS_REACHED",
  BENEFICIO_INVALID_DAY: "BENEFICIO_INVALID_DAY",
  BENEFICIO_OUTSIDE_TIME_WINDOW: "BENEFICIO_OUTSIDE_TIME_WINDOW",
  RECLAMO_CANCELLED: "RECLAMO_CANCELLED",
  RECLAMO_ALREADY_REDEEMED: "RECLAMO_ALREADY_REDEEMED",
} as const;

export type CouponBlockReason =
  (typeof CouponBlockReason)[keyof typeof CouponBlockReason];

export type CouponErrorContext = "claim" | "qr" | "redeem";

function toDate(value: Date | string | null | undefined) {
  return value instanceof Date ? value : value ? new Date(value) : null;
}

function getScheduleWindowForDay(windows: BeneficioTimeWindows, weekday: number) {
  return windows[weekday as keyof BeneficioTimeWindows] ?? null;
}

function createArgentinaDateAtMinute(isoDate: string, minuteOfDay: number) {
  const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minutes = String(minuteOfDay % 60).padStart(2, "0");
  return new Date(`${isoDate}T${hours}:${minutes}:00-03:00`);
}

function createArgentinaEndOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59-03:00`);
}

function getEffectiveExpiryDate(
  fechaExpiracion: Date | string,
  ventanasHorarias: BeneficioTimeWindows | null | undefined,
) {
  const fechaExpiracionDate = toDate(fechaExpiracion);

  if (!fechaExpiracionDate || !hasBeneficioTimeWindows(ventanasHorarias)) {
    return fechaExpiracionDate;
  }

  const expiryWeekday = getCurrentDayInArgentina(fechaExpiracionDate);
  const finalWindow = getScheduleWindowForDay(ventanasHorarias, expiryWeekday);
  const expiryIsoDate = getCurrentISODateInArgentina(fechaExpiracionDate);

  if (!finalWindow) {
    return createArgentinaEndOfDay(expiryIsoDate);
  }

  // Windowed coupons expire at the end of their final Argentina-local window,
  // including carryover into the next calendar day for cross-midnight schedules.
  if (isCrossMidnightWindow(finalWindow)) {
    return createArgentinaDateAtMinute(
      shiftArgentinaIsoDate(expiryIsoDate, 1),
      finalWindow.endMinute,
    );
  }

  return createArgentinaDateAtMinute(expiryIsoDate, finalWindow.endMinute);
}

function evaluateTimeWindowState(
  ventanasHorarias: BeneficioTimeWindows | null | undefined,
  referenceDate: Date,
) {
  if (!hasBeneficioTimeWindows(ventanasHorarias)) {
    return {
      hasWindows: false,
      isWithinWindow: true,
      activeWindowWeekday: null,
    };
  }

  const { weekday, minuteOfDay } = getArgentinaDateTimeParts(referenceDate);
  const previousWeekday = (weekday + 6) % 7;
  const todayWindow = getScheduleWindowForDay(ventanasHorarias, weekday);
  const previousWindow = getScheduleWindowForDay(ventanasHorarias, previousWeekday);

  const isActiveToday =
    todayWindow !== null &&
    (isCrossMidnightWindow(todayWindow)
      ? minuteOfDay >= todayWindow.startMinute
      : minuteOfDay >= todayWindow.startMinute && minuteOfDay < todayWindow.endMinute);

  const isActiveCarryover =
    previousWindow !== null &&
    isCrossMidnightWindow(previousWindow) &&
    minuteOfDay < previousWindow.endMinute;

  if (isActiveToday) {
    return {
      hasWindows: true,
      isWithinWindow: true,
      activeWindowWeekday: weekday,
    };
  }

  if (isActiveCarryover) {
    return {
      hasWindows: true,
      isWithinWindow: true,
      activeWindowWeekday: previousWeekday,
    };
  }

  return {
    hasWindows: true,
    isWithinWindow: false,
    activeWindowWeekday: null,
  };
}

function getRelativeWindowDayLabel(dayOffset: number, weekday: number) {
  if (dayOffset === 0) {
    return "hoy";
  }

  if (dayOffset === 1) {
    return "mañana";
  }

  if (dayOffset === 7) {
    return `el próximo ${getDiaLabel(weekday, "full")}`;
  }

  return `el ${getDiaLabel(weekday, "full")}`;
}

function getNextTimeWindowCopy(
  ventanasHorarias: BeneficioTimeWindows | null | undefined,
  referenceDate: Date,
) {
  if (!hasBeneficioTimeWindows(ventanasHorarias)) {
    return null;
  }

  const { weekday: currentWeekday, minuteOfDay } = getArgentinaDateTimeParts(referenceDate);

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const weekday = ((currentWeekday + dayOffset) % 7) as number;
    const window = getScheduleWindowForDay(ventanasHorarias, weekday);

    if (!window) {
      continue;
    }

    if (dayOffset === 0 && minuteOfDay >= window.startMinute) {
      continue;
    }

    return {
      dayLabel: getRelativeWindowDayLabel(dayOffset, weekday),
      start: formatMinuteOfDay(window.startMinute),
      end: formatMinuteOfDay(window.endMinute),
    };
  }

  return null;
}

export function getCouponInvalidDayMessage(
  diasValidos: number[],
  mode: "claim" | "redeem" = "redeem"
) {
  const diasValidosOrdenados = sortDiasValidos(diasValidos);

  if (mode === "claim") {
    return `Hoy no es un día válido para canjear este cupón. Podés reclamarlo ahora y presentarlo ${formatDiasValidosSentence(
      diasValidosOrdenados,
      {
        emptyLabel: "",
        prefix: "los",
        style: "full",
      }
    )}.`;
  }

  return `Este cupón solo se puede canjear ${formatDiasValidosSentence(diasValidosOrdenados, {
    emptyLabel: "todos los días",
    prefix: "los",
    style: "full",
  })}`;
}

export function getCouponBlockMessage(
  reason: CouponBlockReason,
  {
    diasValidos = [],
    context = "redeem",
    ventanasHorarias = null,
    referenceDate = new Date(),
  }: {
    diasValidos?: number[];
    context?: CouponErrorContext;
    ventanasHorarias?: BeneficioTimeWindows | null;
    referenceDate?: Date;
  } = {}
) {
  if (reason === CouponBlockReason.BENEFICIO_UNAVAILABLE) {
    return "Este beneficio ya no está disponible";
  }

  if (reason === CouponBlockReason.BENEFICIO_EXPIRED) {
    return "Este cupón ya expiró";
  }

  if (reason === CouponBlockReason.BENEFICIO_MAX_USOS_REACHED) {
    return "Este cupón ya alcanzó el máximo de usos";
  }

  if (reason === CouponBlockReason.BENEFICIO_INVALID_DAY) {
    return getCouponInvalidDayMessage(diasValidos, context === "claim" ? "claim" : "redeem");
  }

  if (reason === CouponBlockReason.BENEFICIO_OUTSIDE_TIME_WINDOW) {
    const nextWindow = getNextTimeWindowCopy(ventanasHorarias, referenceDate);

    if (nextWindow) {
      return `Este cupón está disponible ${nextWindow.dayLabel} de ${nextWindow.start} a ${nextWindow.end}`;
    }

    return "Este cupón no está disponible en este horario";
  }

  if (reason === CouponBlockReason.RECLAMO_CANCELLED) {
    return "Este cupón ha sido eliminado por el local";
  }

  if (reason === CouponBlockReason.RECLAMO_ALREADY_REDEEMED) {
    return "Este cupón ya fue canjeado";
  }

  return null;
}

export function getCouponBlockError(
  reason: CouponBlockReason,
  options: {
    diasValidos?: number[];
    context?: CouponErrorContext;
    ventanasHorarias?: BeneficioTimeWindows | null;
    referenceDate?: Date;
  } = {}
) {
  if (reason === CouponBlockReason.NONE) {
    return null;
  }

  return {
    status: reason === CouponBlockReason.RECLAMO_CANCELLED ? 409 : 400,
    code: reason,
    error: getCouponBlockMessage(reason, options) ?? "Este cupón no está disponible",
  };
}

export function evaluateBeneficioState({
  fechaExpiracion,
  deletedAt = null,
  maxUsos,
  canjeados,
  diasValidos,
  ventanasHorarias = null,
  referenceDate = new Date(),
}: {
  fechaExpiracion: Date | string;
  deletedAt?: Date | string | null;
  maxUsos: number | null;
  canjeados: number;
  diasValidos: number[];
  ventanasHorarias?: BeneficioTimeWindows | null;
  referenceDate?: Date;
}) {
  const fechaExpiracionDate = getEffectiveExpiryDate(fechaExpiracion, ventanasHorarias);
  const deletedAtDate = toDate(deletedAt);
  const todayIndex = getCurrentDayInArgentina(referenceDate);
  const timeWindowState = evaluateTimeWindowState(ventanasHorarias, referenceDate);
  const isDeleted = deletedAtDate !== null;
  const isExpired = fechaExpiracionDate !== null && fechaExpiracionDate < referenceDate;
  const isAgotado = maxUsos !== null && canjeados >= maxUsos;
  const isCarryoverWindowActive =
    timeWindowState.hasWindows &&
    timeWindowState.isWithinWindow &&
    timeWindowState.activeWindowWeekday !== null &&
    timeWindowState.activeWindowWeekday !== todayIndex;
  const isWrongDay = diasValidos.length > 0 && !diasValidos.includes(todayIndex) && !isCarryoverWindowActive;
  const isOutsideTimeWindow = timeWindowState.hasWindows && !timeWindowState.isWithinWindow && !isWrongDay;

  const status = isDeleted
    ? BeneficioEffectiveStatus.ELIMINADO
    : isExpired
      ? BeneficioEffectiveStatus.VENCIDO
      : isAgotado
        ? BeneficioEffectiveStatus.AGOTADO
        : BeneficioEffectiveStatus.ACTIVO;

  const claimBlockReason = isDeleted
    ? CouponBlockReason.BENEFICIO_UNAVAILABLE
    : isExpired
      ? CouponBlockReason.BENEFICIO_EXPIRED
      : isAgotado
        ? CouponBlockReason.BENEFICIO_MAX_USOS_REACHED
        // MVP policy: claiming stays permissive outside time windows so customers
        // can secure the coupon now and redeem it later during the valid window.
        : CouponBlockReason.NONE;

  const redeemBlockReason = isDeleted
    ? CouponBlockReason.BENEFICIO_UNAVAILABLE
    : isExpired
      ? CouponBlockReason.BENEFICIO_EXPIRED
      : isAgotado
        ? CouponBlockReason.BENEFICIO_MAX_USOS_REACHED
        : isWrongDay
          ? CouponBlockReason.BENEFICIO_INVALID_DAY
          : isOutsideTimeWindow
            ? CouponBlockReason.BENEFICIO_OUTSIDE_TIME_WINDOW
          : CouponBlockReason.NONE;

  return {
    status,
    isDeleted,
    isExpired,
    isAgotado,
    isWrongDay,
    isOutsideTimeWindow,
    canClaim: claimBlockReason === CouponBlockReason.NONE,
    canRedeemToday: redeemBlockReason === CouponBlockReason.NONE,
    claimBlockReason,
    redeemBlockReason,
    hasTimeWindows: timeWindowState.hasWindows,
  };
}

export function evaluateReclamoState({
  estado,
  fechaExpiracion,
  deletedAt = null,
  maxUsos,
  canjeados,
  diasValidos,
  ventanasHorarias = null,
  referenceDate = new Date(),
}: {
  estado: ReclamoPersistedStatus | string;
  fechaExpiracion: Date | string;
  deletedAt?: Date | string | null;
  maxUsos: number | null;
  canjeados: number;
  diasValidos: number[];
  ventanasHorarias?: BeneficioTimeWindows | null;
  referenceDate?: Date;
}) {
  const beneficioState = evaluateBeneficioState({
    fechaExpiracion,
    deletedAt,
    maxUsos,
    canjeados,
    diasValidos,
    ventanasHorarias,
    referenceDate,
  });

  if (estado === ReclamoPersistedStatus.CANJEADO) {
    return {
      ...beneficioState,
      status: ReclamoEffectiveStatus.CANJEADO,
      blockReason: CouponBlockReason.RECLAMO_ALREADY_REDEEMED,
      canGenerateQr: false,
      canRedeem: false,
    };
  }

  if (estado === ReclamoPersistedStatus.CANCELADO || beneficioState.isDeleted) {
    return {
      ...beneficioState,
      status: ReclamoEffectiveStatus.CANCELADO,
      blockReason: CouponBlockReason.RECLAMO_CANCELLED,
      canGenerateQr: false,
      canRedeem: false,
    };
  }

  if (beneficioState.isExpired) {
    return {
      ...beneficioState,
      status: ReclamoEffectiveStatus.VENCIDO,
      blockReason: CouponBlockReason.BENEFICIO_EXPIRED,
      canGenerateQr: false,
      canRedeem: false,
    };
  }

  if (beneficioState.isAgotado) {
    return {
      ...beneficioState,
      status: ReclamoEffectiveStatus.AGOTADO,
      blockReason: CouponBlockReason.BENEFICIO_MAX_USOS_REACHED,
      canGenerateQr: false,
      canRedeem: false,
    };
  }

  if (beneficioState.isWrongDay) {
    return {
      ...beneficioState,
      status: ReclamoEffectiveStatus.PENDIENTE,
      blockReason: CouponBlockReason.BENEFICIO_INVALID_DAY,
      canGenerateQr: false,
      canRedeem: false,
    };
  }

  if (beneficioState.isOutsideTimeWindow) {
    return {
      ...beneficioState,
      status: ReclamoEffectiveStatus.PENDIENTE,
      blockReason: CouponBlockReason.BENEFICIO_OUTSIDE_TIME_WINDOW,
      canGenerateQr: false,
      canRedeem: false,
    };
  }

  return {
    ...beneficioState,
    status: ReclamoEffectiveStatus.PENDIENTE,
    blockReason: CouponBlockReason.NONE,
    canGenerateQr: true,
    canRedeem: true,
  };
}
