import {
  type BeneficioTimeWindows,
  formatMinuteOfDay,
  getDiaLabel,
  hasBeneficioTimeWindows,
  parseTimeStringToMinute,
  sortDiasValidos,
} from "@/lib/beneficioSchedule";

export type TimeWindowDraft = {
  start: string;
  end: string;
};

export type TimeWindowDraftMap = Partial<Record<number, TimeWindowDraft>>;

export const DEFAULT_WINDOW_START = "09:00";
export const DEFAULT_WINDOW_END = "18:00";

export function createDefaultWindowDraft(): TimeWindowDraft {
  return { start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
}

export function createWindowDraftMap(initialWindows: BeneficioTimeWindows | null | undefined): TimeWindowDraftMap {
  if (!hasBeneficioTimeWindows(initialWindows)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(initialWindows).map(([weekday, window]) => [
      Number(weekday),
      {
        start: formatMinuteOfDay(window.startMinute),
        end: formatMinuteOfDay(window.endMinute),
      },
    ]),
  );
}

export function toggleSelectedWeekday(previousDays: number[], day: number) {
  if (previousDays.length === 0) {
    return [day];
  }

  if (previousDays.includes(day)) {
    const nextDays = previousDays.filter((currentDay) => currentDay !== day);
    return nextDays.length === 0 ? [] : nextDays;
  }

  return [...previousDays, day];
}

export function syncWindowDrafts(days: number[], previous: TimeWindowDraftMap) {
  return Object.fromEntries(
    sortDiasValidos(days).map((day) => [day, previous[day] ?? createDefaultWindowDraft()]),
  ) as TimeWindowDraftMap;
}

export function serializeWindowDrafts(days: number[], drafts: TimeWindowDraftMap): BeneficioTimeWindows | null {
  if (days.length === 0) {
    return null;
  }

  const normalizedWindows: BeneficioTimeWindows = {};

  for (const day of sortDiasValidos(days)) {
    const draft = drafts[day];
    const startMinute = draft ? parseTimeStringToMinute(draft.start) : null;
    const endMinute = draft ? parseTimeStringToMinute(draft.end) : null;

    if (startMinute === null || endMinute === null) {
      return null;
    }

    normalizedWindows[day as keyof BeneficioTimeWindows] = { startMinute, endMinute };
  }

  return normalizedWindows;
}

export function validateTimeWindowDrafts(days: number[], drafts: TimeWindowDraftMap) {
  for (const day of sortDiasValidos(days)) {
    const draft = drafts[day];

    if (!draft) {
      return `Completá el horario del ${getDiaLabel(day, "full")}.`;
    }

    const startMinute = parseTimeStringToMinute(draft.start);
    const endMinute = parseTimeStringToMinute(draft.end);

    if (startMinute === null || endMinute === null) {
      return `Ingresá un horario válido para el ${getDiaLabel(day, "full")}.`;
    }

    if (startMinute === endMinute) {
      return `El horario del ${getDiaLabel(day, "full")} no puede tener la misma hora de inicio y fin.`;
    }
  }

  return null;
}
