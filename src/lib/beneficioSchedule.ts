export const BENEFICIO_WEEKDAYS = [
  { value: 0, shortLabel: "Dom", letterLabel: "D", fullLabel: "domingo" },
  { value: 1, shortLabel: "Lun", letterLabel: "L", fullLabel: "lunes" },
  { value: 2, shortLabel: "Mar", letterLabel: "M", fullLabel: "martes" },
  { value: 3, shortLabel: "Mié", letterLabel: "M", fullLabel: "miércoles" },
  { value: 4, shortLabel: "Jue", letterLabel: "J", fullLabel: "jueves" },
  { value: 5, shortLabel: "Vie", letterLabel: "V", fullLabel: "viernes" },
  { value: 6, shortLabel: "Sáb", letterLabel: "S", fullLabel: "sábado" },
] as const;

type LabelStyle = "short" | "full";

interface FormatDiasOptions {
  emptyLabel?: string;
  prefix?: string;
  style?: LabelStyle;
}

export function sortDiasValidos(dias: number[]) {
  return [...dias].sort((left, right) => left - right);
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
