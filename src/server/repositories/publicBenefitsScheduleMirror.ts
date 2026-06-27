import {
  getArgentinaDateTimeParts,
  getCurrentDayInArgentina,
  getCurrentISODateInArgentina,
  shiftArgentinaIsoDate,
} from "@/lib/argentinaTime";
import {
  type BeneficioTimeWindows,
  hasBeneficioTimeWindows,
  isCrossMidnightWindow,
} from "@/lib/beneficioSchedule";

type PublicBenefitsScheduleMirrorInput = {
  fechaExpiracion: Date | string;
  maxUsos: number | null;
  canjeados: number;
  diasValidos: number[];
  ventanasHorarias?: BeneficioTimeWindows | null;
  referenceDate?: Date;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function getScheduleWindowForDay(windows: BeneficioTimeWindows, weekday: number) {
  return windows[weekday as keyof BeneficioTimeWindows] ?? null;
}

function createArgentinaDateAtMinute(isoDate: string, minuteOfDay: number) {
  const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minutes = String(minuteOfDay % 60).padStart(2, "0");
  return new Date(`${isoDate}T${hours}:${minutes}:00-03:00`);
}

function getRepositoryEffectiveExpiryDate(
  fechaExpiracion: Date | string,
  ventanasHorarias: BeneficioTimeWindows | null | undefined,
) {
  const fechaExpiracionDate = toDate(fechaExpiracion);

  if (!hasBeneficioTimeWindows(ventanasHorarias)) {
    return fechaExpiracionDate;
  }

  const expiryWeekday = getCurrentDayInArgentina(fechaExpiracionDate);
  const finalWindow = getScheduleWindowForDay(ventanasHorarias, expiryWeekday);

  if (!finalWindow) {
    return fechaExpiracionDate;
  }

  const expiryIsoDate = getCurrentISODateInArgentina(fechaExpiracionDate);

  if (isCrossMidnightWindow(finalWindow)) {
    return createArgentinaDateAtMinute(
      shiftArgentinaIsoDate(expiryIsoDate, 1),
      finalWindow.endMinute,
    );
  }

  return createArgentinaDateAtMinute(expiryIsoDate, finalWindow.endMinute);
}

function isAvailableNow(
  diasValidos: number[],
  ventanasHorarias: BeneficioTimeWindows | null | undefined,
  referenceDate: Date,
) {
  const { weekday, minuteOfDay } = getArgentinaDateTimeParts(referenceDate);

  if (!hasBeneficioTimeWindows(ventanasHorarias)) {
    return diasValidos.length === 0 || diasValidos.includes(weekday);
  }

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

  return isActiveToday || isActiveCarryover;
}

export function getPublicBenefitScheduleMirrorState({
  fechaExpiracion,
  maxUsos,
  canjeados,
  diasValidos,
  ventanasHorarias = null,
  referenceDate = new Date(),
}: PublicBenefitsScheduleMirrorInput) {
  const effectiveExpiryDate = getRepositoryEffectiveExpiryDate(fechaExpiracion, ventanasHorarias);
  const isAvailable = effectiveExpiryDate >= referenceDate && (maxUsos === null || canjeados < maxUsos);
  const isAvailableNowResult = isAvailableNow(diasValidos, ventanasHorarias, referenceDate);

  return {
    isAvailable,
    isAvailableNow: isAvailableNowResult,
    passesSoloHoy: isAvailable && isAvailableNowResult,
  };
}
