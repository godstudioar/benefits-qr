import { TIMEZONE_AR } from "@/lib/constants";

const arDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE_AR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const arWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE_AR,
  weekday: "short",
});

const arDateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE_AR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const WEEKDAY_INDEX_BY_LABEL = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
} as const;

function getArgentinaDateParts(referenceDate: Date) {
  const parts = arDatePartsFormatter.formatToParts(referenceDate);

  return parts.reduce(
    (acc, part) => {
      if (part.type === "year" || part.type === "month" || part.type === "day") {
        acc[part.type] = part.value;
      }

      return acc;
    },
    { year: "", month: "", day: "" }
  );
}

function addDaysToIsoDate(isoDate: string, amount: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shiftedDate = new Date(Date.UTC(year, month - 1, day + amount));

  const shiftedYear = shiftedDate.getUTCFullYear();
  const shiftedMonth = String(shiftedDate.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shiftedDate.getUTCDate()).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

export function getCurrentISODateInArgentina(referenceDate = new Date()) {
  const { year, month, day } = getArgentinaDateParts(referenceDate);
  return `${year}-${month}-${day}`;
}

export function getCurrentDayInArgentina(referenceDate = new Date()) {
  const weekdayLabel = arWeekdayFormatter.format(referenceDate) as keyof typeof WEEKDAY_INDEX_BY_LABEL;
  return WEEKDAY_INDEX_BY_LABEL[weekdayLabel];
}

export function getCurrentMinuteOfDayInArgentina(referenceDate = new Date()) {
  const parts = arDateTimePartsFormatter.formatToParts(referenceDate);

  const values = parts.reduce(
    (acc, part) => {
      if (part.type === "hour" || part.type === "minute") {
        acc[part.type] = part.value;
      }

      return acc;
    },
    { hour: "00", minute: "00" },
  );

  return Number(values.hour) * 60 + Number(values.minute);
}

export function getArgentinaDateTimeParts(referenceDate = new Date()) {
  return {
    isoDate: getCurrentISODateInArgentina(referenceDate),
    weekday: getCurrentDayInArgentina(referenceDate),
    minuteOfDay: getCurrentMinuteOfDayInArgentina(referenceDate),
  };
}

export function shiftArgentinaIsoDate(isoDate: string, amount: number) {
  return addDaysToIsoDate(isoDate, amount);
}
