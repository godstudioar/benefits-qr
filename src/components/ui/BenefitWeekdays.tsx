import {
  BENEFICIO_WEEKDAYS,
  getDiasValidosAriaLabel,
  getNormalizedDiasValidos,
} from "@/lib/beneficioSchedule";
import { cn } from "@/lib/utils";

type BenefitWeekdaysProps = {
  diasValidos: number[];
  className?: string;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: {
    container: "gap-1.5",
    letter: "text-[11px]",
  },
  md: {
    container: "gap-2",
    letter: "text-xs",
  },
} as const;

export default function BenefitWeekdays({
  diasValidos,
  className,
  size = "sm",
}: BenefitWeekdaysProps) {
  const normalizedDays = new Set(getNormalizedDiasValidos(diasValidos));
  const ariaLabel = getDiasValidosAriaLabel(diasValidos);
  const currentSize = sizeClasses[size];

  return (
    <ul
      aria-label={`Días válidos: ${ariaLabel}`}
      className={cn(
        "m-0 inline-flex max-w-full list-none flex-wrap items-center p-0",
        currentSize.container,
        className
      )}
    >
      {BENEFICIO_WEEKDAYS.map((day) => {
        const enabled = normalizedDays.has(day.value);

        return (
          <li
            key={day.value}
            className="list-none"
            aria-label={`${day.fullLabel}${enabled ? " válido" : " no válido"}`}
          >
            <span
              aria-hidden="true"
              className={cn(
                "font-semibold uppercase tracking-[0.08em] transition-colors",
                currentSize.letter,
                enabled ? "text-primary" : "text-text-muted/55"
              )}
            >
              {day.letterLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
