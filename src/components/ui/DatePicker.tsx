"use client";

import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Calendar from "@/components/ui/Calendar";
import FieldHelp from "@/components/ui/FieldHelp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  label?: string;
  labelHelp?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

function parseDateString(value?: string) {
  if (!value) return null;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateString(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayDate(value: string) {
  const parsed = parseDateString(value);
  if (!parsed) return "Seleccionar fecha";

  return format(parsed, "PPP", { locale: es });
}

export default function DatePicker({
  label,
  labelHelp,
  value,
  onChange,
  min,
  required,
  error,
  className,
}: DatePickerProps) {
  const inputId = useId();
  const selectedDate = useMemo(() => parseDateString(value), [value]);
  const minDate = useMemo(() => parseDateString(min), [min]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    () => selectedDate ?? minDate ?? new Date(),
  );
  const fallbackMonth = selectedDate ?? minDate ?? new Date();

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1 flex items-center gap-1.5">
          <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
            {label}
            {required ? <span className="ml-1 text-danger">*</span> : null}
          </label>
          {labelHelp ? <FieldHelp label={label} content={labelHelp} /> : null}
        </div>
      ) : null}

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setVisibleMonth(selectedDate ?? minDate ?? new Date());
          }

          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={inputId}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between rounded-xl text-left font-normal data-[empty=true]:text-text-muted",
              error && "border-danger-border focus-visible:ring-danger-soft",
            )}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-invalid={Boolean(error)}
            data-empty={!value}
          >
            {value ? <span className="truncate">{formatDisplayDate(value)}</span> : <span>Seleccionar fecha</span>}
            <ChevronDownIcon className="shrink-0 text-text-muted" aria-hidden="true" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-0">
            <Calendar
              initialFocus
              mode="single"
              month={open ? visibleMonth : fallbackMonth}
              onMonthChange={setVisibleMonth}
              selected={selectedDate ?? undefined}
              onSelect={(date) => {
                if (!date) return;
                setVisibleMonth(date);
                onChange(formatDateString(date));
                setOpen(false);
              }}
              disabled={minDate ? { before: minDate } : undefined}
              defaultMonth={fallbackMonth}
            />
          </div>
        </PopoverContent>
      </Popover>

      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
