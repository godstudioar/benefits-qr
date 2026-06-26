export const BENEFICIO_WEEKDAYS = [
  { value: 0, shortLabel: "Dom", letterLabel: "D", fullLabel: "domingo" },
  { value: 1, shortLabel: "Lun", letterLabel: "L", fullLabel: "lunes" },
  { value: 2, shortLabel: "Mar", letterLabel: "M", fullLabel: "martes" },
  { value: 3, shortLabel: "Mié", letterLabel: "M", fullLabel: "miércoles" },
  { value: 4, shortLabel: "Jue", letterLabel: "J", fullLabel: "jueves" },
  { value: 5, shortLabel: "Vie", letterLabel: "V", fullLabel: "viernes" },
  { value: 6, shortLabel: "Sáb", letterLabel: "S", fullLabel: "sábado" },
] as const;

export type WeekdayIndex = (typeof BENEFICIO_WEEKDAYS)[number]["value"];

export type DailyTimeWindow = {
  startMinute: number;
  endMinute: number;
};

export type BeneficioTimeWindows = Partial<Record<WeekdayIndex, DailyTimeWindow>>;

type BeneficioTimeWindowEntry = {
  weekday: WeekdayIndex;
  window: DailyTimeWindow;
};

type NormalizeTimeWindowsResult =
  | { ok: true; value: BeneficioTimeWindows | null }
  | { ok: false; code: string; message: string; field: "ventanasHorarias" };

interface NormalizeTimeWindowsOptions {
  allowCrossMidnight?: boolean;
}

type LabelStyle = "short" | "full";

interface FormatDiasOptions {
  emptyLabel?: string;
  prefix?: string;
  style?: LabelStyle;
}

export function sortDiasValidos(dias: number[]) {
  return [...dias].sort((left, right) => left - right);
}

function isWeekdayIndex(value: unknown): value is WeekdayIndex {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isMinuteOfDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1439;
}

function getDistinctConfiguredDays(dias: number[]) {
  return Array.from(new Set(dias.filter(isWeekdayIndex))).sort((left, right) => left - right);
}

export function hasBeneficioTimeWindows(windows: BeneficioTimeWindows | null | undefined): windows is BeneficioTimeWindows {
  return Boolean(windows && Object.keys(windows).length > 0);
}

export function isCrossMidnightWindow(window: DailyTimeWindow) {
  return window.endMinute < window.startMinute;
}

export function parseTimeStringToMinute(value: string) {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value);

  if (!match) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinuteOfDay(minute: number) {
  const normalizedMinute = Math.max(0, Math.min(1439, Math.trunc(minute)));
  const hours = String(Math.floor(normalizedMinute / 60)).padStart(2, "0");
  const minutes = String(normalizedMinute % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function capitalizeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getBeneficioWindowEntries(windows: BeneficioTimeWindows | null | undefined): BeneficioTimeWindowEntry[] {
  if (!hasBeneficioTimeWindows(windows)) {
    return [];
  }

  return Object.entries(windows)
    .map(([weekday, window]) => {
      if (!window) {
        return null;
      }

      const parsedWeekday = Number(weekday);
      if (!isWeekdayIndex(parsedWeekday)) {
        return null;
      }

      return {
        weekday: parsedWeekday,
        window,
      } satisfies BeneficioTimeWindowEntry;
    })
    .filter((entry): entry is BeneficioTimeWindowEntry => entry !== null)
    .sort((left, right) => left.weekday - right.weekday);
}

export function formatBeneficioTimeWindowLabel(
  weekday: WeekdayIndex,
  window: DailyTimeWindow,
  style: LabelStyle = "full",
) {
  const crossesIntoNextDay = isCrossMidnightWindow(window);
  const nextDaySuffix = crossesIntoNextDay ? " (continúa al día siguiente)" : "";

  return `${capitalizeLabel(getDiaLabel(weekday, style))} · ${formatMinuteOfDay(window.startMinute)} a ${formatMinuteOfDay(window.endMinute)}${nextDaySuffix}`;
}

export function getBeneficioTimeWindowLabels(
  windows: BeneficioTimeWindows | null | undefined,
  style: LabelStyle = "full",
) {
  return getBeneficioWindowEntries(windows).map(({ weekday, window }) =>
    formatBeneficioTimeWindowLabel(weekday, window, style)
  );
}

export function normalizeBeneficioTimeWindows(
  value: unknown,
  diasValidos?: number[],
  options: NormalizeTimeWindowsOptions = {},
): NormalizeTimeWindowsResult {
  const { allowCrossMidnight = true } = options;

  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      code: "INVALID_VENTANAS_HORARIAS",
      message: "Schedule windows must be an object keyed by weekday",
      field: "ventanasHorarias",
    };
  }

  const normalized: BeneficioTimeWindows = {};
  const entries = Object.entries(value);

  for (const [weekdayKey, rawWindow] of entries) {
    const weekday = Number(weekdayKey);

    if (!isWeekdayIndex(weekday)) {
      return {
        ok: false,
        code: "INVALID_VENTANAS_HORARIAS",
        message: `Invalid weekday key: ${weekdayKey}`,
        field: "ventanasHorarias",
      };
    }

    if (typeof rawWindow !== "object" || rawWindow === null || Array.isArray(rawWindow)) {
      return {
        ok: false,
        code: "INVALID_VENTANAS_HORARIAS",
        message: `Invalid schedule window payload for weekday ${weekday}`,
        field: "ventanasHorarias",
      };
    }

    const candidate = rawWindow as Partial<DailyTimeWindow>;

    if (!isMinuteOfDay(candidate.startMinute) || !isMinuteOfDay(candidate.endMinute)) {
      return {
        ok: false,
        code: "INVALID_VENTANAS_HORARIAS",
        message: `Weekday ${weekday} must use minute values between 0 and 1439`,
        field: "ventanasHorarias",
      };
    }

    if (candidate.startMinute === candidate.endMinute) {
      return {
        ok: false,
        code: "INVALID_VENTANAS_HORARIAS",
        message: `Weekday ${weekday} cannot use identical start and end minutes`,
        field: "ventanasHorarias",
      };
    }

    if (!allowCrossMidnight && candidate.endMinute < candidate.startMinute) {
      return {
        ok: false,
        code: "INVALID_VENTANAS_HORARIAS",
        message: `El horario del ${getDiaLabel(weekday, "full")} debe terminar el mismo día. Si querés seguir después de medianoche, configurá el día siguiente por separado.`,
        field: "ventanasHorarias",
      };
    }

    normalized[weekday] = {
      startMinute: candidate.startMinute,
      endMinute: candidate.endMinute,
    };
  }

  if (entries.length === 0) {
    return { ok: true, value: null };
  }

  if (diasValidos !== undefined) {
    const expectedDays = getDistinctConfiguredDays(diasValidos);
    const windowDays = getBeneficioWindowEntries(normalized).map((entry) => entry.weekday);

    const hasSameDays =
      expectedDays.length === windowDays.length && expectedDays.every((day, index) => day === windowDays[index]);

    if (!hasSameDays) {
      return {
        ok: false,
        code: "INVALID_VENTANAS_HORARIAS",
        message: "Schedule windows must match diasValidos exactly",
        field: "ventanasHorarias",
      };
    }
  }

  return { ok: true, value: normalized };
}

export function getNormalizedDiasValidos(dias: number[]) {
  const uniqueKnownDays = Array.from(
    new Set(dias.filter((day) => BENEFICIO_WEEKDAYS.some((item) => item.value === day)))
  );

  if (uniqueKnownDays.length === 0 || uniqueKnownDays.length === BENEFICIO_WEEKDAYS.length) {
    return BENEFICIO_WEEKDAYS.map((day) => day.value);
  }

  return sortDiasValidos(uniqueKnownDays);
}

export function getDiasValidosAriaLabel(dias: number[]) {
  return formatDiasValidosSentence(dias, {
    emptyLabel: "Válido todos los días",
    prefix: "Válido los",
    style: "full",
  });
}

export function getDiaLabel(value: number, style: LabelStyle = "short") {
  const day = BENEFICIO_WEEKDAYS.find((item) => item.value === value);
  return day ? day[style === "full" ? "fullLabel" : "shortLabel"] : String(value);
}

export function formatDiasValidosSentence(
  dias: number[],
  {
    emptyLabel = "Válido todos los días",
    prefix = "Válido los",
    style = "short",
  }: FormatDiasOptions = {},
) {
  const sorted = getNormalizedDiasValidos(dias);

  if (sorted.length === 0 || sorted.length === BENEFICIO_WEEKDAYS.length) {
    return emptyLabel;
  }

  if (sorted.length === 1) {
    return `${prefix} ${getDiaLabel(sorted[0], style)}`;
  }

  const names = sorted.map((day) => getDiaLabel(day, style));
  const last = names.pop();

  return `${prefix} ${names.join(", ")} y ${last}`;
}
