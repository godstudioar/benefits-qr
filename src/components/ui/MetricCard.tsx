import Card from "@/components/ui/Card";
import type { SemanticVisualVariant } from "@/components/ui/buttonStyles";
import { SHADOW } from "@/lib/shadowStyles";
import { cn } from "@/lib/utils";

export type MetricCardVariant = Extract<
  SemanticVisualVariant,
  "muted" | "secondary" | "light" | "primary" | "warning"
>;

interface MetricCardProps {
  label: string;
  value: number | string;
  variant?: MetricCardVariant;
  elevated?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

const metricCardStyles: Record<
  MetricCardVariant,
  { wrapper: string; label: string; value: string }
> = {
  muted: {
    wrapper: "border-surface/80 bg-surface/95 sm:bg-surface/85",
    label: "text-text-muted",
    value: "text-text-primary",
  },
  secondary: {
    wrapper: "border-border-default/80 bg-surface-muted/70",
    label: "text-text-muted",
    value: "text-text-primary",
  },
  light: {
    wrapper: "bg-accent-soft text-accent-foreground border-accent-soft/80",
    label: "text-accent-foreground/80",
    value: "text-accent-foreground",
  },
  primary: {
    wrapper: "border-border-strong/40 bg-primary",
    label: "text-text-soft",
    value: "text-primary-foreground",
  },
  warning: {
    wrapper: "border-warning-soft/70 bg-warning-soft/60",
    label: "text-warning",
    value: "text-warning",
  },
};

export default function MetricCard({
  label,
  value,
  variant = "secondary",
  elevated = false,
  className,
  labelClassName,
  valueClassName,
}: MetricCardProps) {
  const styles = metricCardStyles[variant];

  return (
    <Card
      className={cn(
        "h-full rounded-xl p-3 sm:p-4 lg:p-3.5 2xl:p-4",
        styles.wrapper,
        elevated && SHADOW.accentBase,
        className
      )}
      data-variant={variant}
    >
      <p
        className={cn(
          "mb-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs lg:text-[11px] 2xl:text-xs",
          styles.label,
          labelClassName
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-bold leading-tight sm:text-2xl lg:text-xl 2xl:text-2xl",
          styles.value,
          valueClassName
        )}
      >
        {value}
      </p>
    </Card>
  );
}
