"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, Globe, PartyPopper, ShieldCheck } from "lucide-react";
import type { MedioPago } from "@/generated/prisma/client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import {
  BENEFICIO_WEEKDAYS,
  formatDiasValidosSentence,
  sortDiasValidos,
} from "@/lib/beneficioSchedule";
import { cn } from "@/lib/utils";

export type BeneficioFormMode = "create" | "edit";

export type BeneficioFormInitialData = {
  descripcion?: string;
  fechaExpiracion?: string;
  maxUsos?: number | null;
  diasValidos?: number[];
  esPublico?: boolean;
  mediosPago?: MedioPago[];
  esAcumulable?: boolean;
  condicionesExtra?: string | null;
  maxUsosPorCliente?: number | null;
  eventoId?: string | null;
};

type EventoSeleccionable = {
  id: string;
  nombre: string;
  slug: string;
  fechaInicio: string;
  fechaFin: string;
};

export type BeneficioFormSubmitConfig = {
  endpoint: string;
  method?: "POST" | "PATCH";
  submitLabel: string;
  cancelHref: string;
  successRedirect: string;
};

type BeneficioFormConstraintCopy = {
  emptyDaysLabel?: string;
  daysPrefix?: string;
  selectedDaysHint?: string;
  publicDescription?: string;
  privateDescription?: string;
};

type BeneficioFormProps = {
  mode: BeneficioFormMode;
  initialData?: BeneficioFormInitialData;
  submitConfig: BeneficioFormSubmitConfig;
  constraintCopy?: BeneficioFormConstraintCopy;
  summaryBadges?: Array<{
    label: string;
    variant?: "primary" | "muted" | "secondary" | "light" | "success" | "warning" | "danger";
  }>;
};

const MEDIOS_PAGO_OPTIONS: { value: MedioPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
];

const FIELD_ERROR_KEYS = ["descripcion", "fechaExpiracion", "maxUsos", "condicionesExtra", "maxUsosPorCliente"] as const;

function isFieldErrorKey(value: string): value is (typeof FIELD_ERROR_KEYS)[number] {
  return FIELD_ERROR_KEYS.includes(value as (typeof FIELD_ERROR_KEYS)[number]);
}

const DEFAULT_CONSTRAINT_COPY: Required<BeneficioFormConstraintCopy> = {
  emptyDaysLabel: "Aplica todos los días.",
  daysPrefix: "Aplica los",
  selectedDaysHint:
    "Tocá un día para quitarlo. Si desmarcás el último, vuelve a “Todos los días”.",
  publicDescription:
    "Este cupón aparecerá en el directorio público donde cualquier persona puede verlo y reclamarlo.",
  privateDescription:
    "Este cupón no aparecerá en el directorio público. Solo accesible por link directo.",
};

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BeneficioForm({
  mode,
  initialData,
  submitConfig,
  constraintCopy,
  summaryBadges,
}: BeneficioFormProps) {
  const router = useRouter();
  const copy = { ...DEFAULT_CONSTRAINT_COPY, ...constraintCopy };
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [fechaExpiracion, setFechaExpiracion] = useState(initialData?.fechaExpiracion ?? "");
  const [maxUsos, setMaxUsos] = useState(initialData?.maxUsos?.toString() ?? "");
  const [diasValidos, setDiasValidos] = useState<number[]>(initialData?.diasValidos ?? []);
  const [esPublico, setEsPublico] = useState(initialData?.esPublico ?? false);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>(initialData?.mediosPago ?? []);
  const [esAcumulable, setEsAcumulable] = useState(initialData?.esAcumulable ?? true);
  const [condicionesExtra, setCondicionesExtra] = useState(initialData?.condicionesExtra ?? "");
  const [maxUsosPorCliente, setMaxUsosPorCliente] = useState(initialData?.maxUsosPorCliente?.toString() ?? "");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<(typeof FIELD_ERROR_KEYS)[number], string>>>({});
  const [loading, setLoading] = useState(false);
  const [isDaysOpen, setIsDaysOpen] = useState(mode === "edit");
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(mode === "edit");
  const [isConditionsOpen, setIsConditionsOpen] = useState(mode === "edit");
  const [eventoId, setEventoId] = useState<string | null>(initialData?.eventoId ?? null);
  const [eventosDisponibles, setEventosDisponibles] = useState<EventoSeleccionable[]>([]);

  useEffect(() => {
    fetch("/api/eventos/seleccionables")
      .then((r) => r.json())
      .then((data) => setEventosDisponibles(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const selectedEvento = eventosDisponibles.find((e) => e.id === eventoId) ?? null;
  const isEventoCupon = eventoId !== null;

  const minDate = getTodayDateString();
  const todosLosDias = diasValidos.length === 0;

  const diasSeleccionados = useMemo(() => sortDiasValidos(diasValidos), [diasValidos]);

  function handleDiaToggle(value: number) {
    setDiasValidos((prev) => {
      if (prev.length === 0) {
        return [value];
      }

      if (prev.includes(value)) {
        const next = prev.filter((day) => day !== value);
        return next.length === 0 ? [] : next;
      }

      return [...prev, value];
    });
  }

  function handleMedioPagoToggle(value: MedioPago) {
    setMediosPago((prev) => {
      if (prev.includes(value)) {
        return prev.filter((m) => m !== value);
      }
      return [...prev, value];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!isEventoCupon && !fechaExpiracion) {
      setFieldErrors({ fechaExpiracion: "Seleccioná una fecha de expiración." });
      return;
    }

    setLoading(true);

    const response = await fetch(submitConfig.endpoint, {
      method: submitConfig.method ?? "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion,
        fechaExpiracion: isEventoCupon ? undefined : fechaExpiracion,
        maxUsos: maxUsos ? parseInt(maxUsos, 10) : null,
        diasValidos: isEventoCupon ? [] : diasValidos,
        esPublico: isEventoCupon ? false : esPublico,
        mediosPago,
        esAcumulable,
        condicionesExtra: condicionesExtra || null,
        maxUsosPorCliente: maxUsosPorCliente ? parseInt(maxUsosPorCliente, 10) : null,
        eventoId: eventoId || null,
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      const message = data.message ?? data.error ?? "No pudimos guardar el cupón.";

      if (typeof data.field === "string" && isFieldErrorKey(data.field)) {
        setFieldErrors({ [data.field]: message });
        setError("");
        return;
      }

      setError(message);
      return;
    }

    router.push(submitConfig.successRedirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-4 2xl:space-y-5">
      {summaryBadges && summaryBadges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {summaryBadges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant ?? "muted"}>
              {badge.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {eventosDisponibles.length > 0 && (
        <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
          <div className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="rounded-xl bg-accent-soft p-2 text-accent">
              <PartyPopper className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-2 text-sm font-semibold text-text-primary lg:text-[13px] 2xl:text-sm">
                Vincular a evento
              </h2>
              <select
                value={eventoId ?? ""}
                onChange={(e) => setEventoId(e.target.value || null)}
                className="h-10 w-full rounded-xl border border-border-default bg-surface py-2 px-3 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft"
              >
                <option value="">Sin evento (cupón normal)</option>
                {eventosDisponibles.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre} ({ev.fechaInicio.slice(0, 10)} → {ev.fechaFin.slice(0, 10)})
                  </option>
                ))}
              </select>
              {selectedEvento && (
                <p className="mt-2 text-xs text-accent">
                  Vigencia automática: {selectedEvento.fechaInicio.slice(0, 10)} → {selectedEvento.fechaFin.slice(0, 10)}. No aparecerá en cupones públicos.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:gap-3.5 2xl:gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Descripción"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Ej: 20% de descuento en todos los productos"
            maxLength={40}
            error={fieldErrors.descripcion}
            required
          />
        </div>

        {!isEventoCupon && (
          <DatePicker
            label="Fecha de expiración"
            value={fechaExpiracion}
            onChange={setFechaExpiracion}
            min={minDate}
            error={fieldErrors.fechaExpiracion}
            required
          />
        )}

        <Input
          label="Máximo de usos"
          type="number"
          value={maxUsos}
          onChange={(event) => setMaxUsos(event.target.value)}
          placeholder="Sin límite si se deja vacío"
          min="1"
          inputMode="numeric"
          error={fieldErrors.maxUsos}
        />

        <Input
          label="Máx. usos por cliente"
          type="number"
          value={maxUsosPorCliente}
          onChange={(event) => setMaxUsosPorCliente(event.target.value)}
          placeholder="1 uso si se deja vacío"
          min="1"
          inputMode="numeric"
          error={fieldErrors.maxUsosPorCliente}
        />
      </div>

      {!isEventoCupon && <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
        <button
          type="button"
          onClick={() => setIsDaysOpen((prev) => !prev)}
          aria-expanded={isDaysOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="rounded-xl bg-primary-soft p-2 text-primary">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary lg:text-[13px] 2xl:text-sm">
                Días disponibles
              </h2>
            </div>
          </div>
          <ChevronDown
            className={cn("mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform", isDaysOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {isDaysOpen ? <div className="mt-3 space-y-3 lg:mt-2.5 lg:space-y-2.5 2xl:mt-3 2xl:space-y-3">
          <div className="space-y-2.5 sm:flex sm:flex-wrap sm:items-start sm:gap-2 sm:space-y-0 lg:gap-2 2xl:gap-2.5">
            <div className="flex sm:flex-none">
              <Button
                type="button"
                variant={todosLosDias ? "primary" : "secondary"}
                size="sm"
                onClick={() => setDiasValidos([])}
                className="w-full sm:w-auto"
              >
                Todos los días
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-1 lg:gap-2 2xl:gap-2.5">
              {BENEFICIO_WEEKDAYS.map((day) => {
                const selected = !todosLosDias && diasValidos.includes(day.value);

                return (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selected ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleDiaToggle(day.value)}
                    aria-pressed={selected}
                    className={cn("min-w-12 px-3", todosLosDias && "border-dashed")}
                  >
                    {day.shortLabel}
                  </Button>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
            {formatDiasValidosSentence(diasSeleccionados, {
              emptyLabel: copy.emptyDaysLabel,
              prefix: copy.daysPrefix,
            })}
          </p>

          {!todosLosDias ? (
            <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">{copy.selectedDaysHint}</p>
          ) : null}
        </div> : null}
      </section>}

      {!isEventoCupon && <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
        <button
          type="button"
          onClick={() => setIsVisibilityOpen((prev) => !prev)}
          aria-expanded={isVisibilityOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="rounded-xl bg-primary-soft p-2 text-primary">
              <Globe className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary lg:text-[13px] 2xl:text-sm">
                Visibilidad del cupón
              </h2>
            </div>
          </div>
          <ChevronDown
            className={cn("mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform", isVisibilityOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {isVisibilityOpen ? <div className="mt-3 flex items-center justify-between gap-4 lg:mt-2.5 2xl:mt-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
              {esPublico ? "Público" : "Privado"}
            </p>
            <p className="text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
              {esPublico ? copy.publicDescription : copy.privateDescription}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={esPublico}
            onClick={() => setEsPublico((prev) => !prev)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              esPublico ? "bg-primary" : "bg-border-default",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                esPublico ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div> : null}
      </section>}

      <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
        <button
          type="button"
          onClick={() => setIsConditionsOpen((prev) => !prev)}
          aria-expanded={isConditionsOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex items-start gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="rounded-xl bg-primary-soft p-2 text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary lg:text-[13px] 2xl:text-sm">
                Condiciones
              </h2>
            </div>
          </div>
          <ChevronDown
            className={cn("mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform", isConditionsOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {isConditionsOpen ? <div className="mt-3 space-y-4 lg:mt-2.5 lg:space-y-3.5 2xl:mt-3 2xl:space-y-4">
          <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
            <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
              Medios de pago aceptados
            </p>
            <div className="flex flex-wrap gap-2 lg:gap-2 2xl:gap-2.5">
              <Button
                type="button"
                variant={mediosPago.length === 0 ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMediosPago([])}
              >
                Cualquier medio
              </Button>
              {MEDIOS_PAGO_OPTIONS.map((option) => {
                const selected = mediosPago.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selected ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleMedioPagoToggle(option.value)}
                    aria-pressed={selected}
                    className={cn(!selected && mediosPago.length > 0 && "border-dashed")}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
              {mediosPago.length === 0
                ? "Acepta cualquier medio de pago."
                : `Solo: ${mediosPago.map((m) => MEDIOS_PAGO_OPTIONS.find((o) => o.value === m)?.label).filter(Boolean).join(", ")}.`}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
                {esAcumulable ? "Acumulable" : "No acumulable"}
              </p>
              <p className="text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
                {esAcumulable
                  ? "Se puede combinar con otros descuentos o promociones."
                  : "No se puede combinar con otros descuentos o promociones."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={esAcumulable}
              onClick={() => setEsAcumulable((prev) => !prev)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                esAcumulable ? "bg-primary" : "bg-border-default",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                  esAcumulable ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          <Input
            label="Condiciones adicionales"
            value={condicionesExtra ?? ""}
            onChange={(event) => setCondicionesExtra(event.target.value)}
            placeholder="Ej: Válido solo para consumo en el local"
            maxLength={150}
            error={fieldErrors.condicionesExtra}
          />
        </div> : null}
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end lg:gap-2.5 2xl:gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push(submitConfig.cancelHref)}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="sm:min-w-40">
          {submitConfig.submitLabel}
        </Button>
      </div>
    </form>
  );
}
