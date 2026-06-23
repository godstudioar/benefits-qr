"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, Clock3, Globe, ShieldCheck } from "lucide-react";
import type { MedioPago } from "@/generated/prisma/client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import FieldHelp from "@/components/ui/FieldHelp";
import Input from "@/components/ui/Input";
import {
  BENEFICIO_WEEKDAYS,
  type BeneficioTimeWindows,
  formatDiasValidosSentence,
  getDiaLabel,
  hasBeneficioTimeWindows,
  sortDiasValidos,
} from "@/lib/beneficioSchedule";
import {
  createDefaultWindowDraft,
  createWindowDraftMap,
  serializeWindowDrafts,
  syncWindowDrafts,
  toggleSelectedWeekday,
  validateTimeWindowDrafts,
  type TimeWindowDraft,
  type TimeWindowDraftMap,
} from "./beneficioFormSchedule";
import { validateBeneficioFormSubmission } from "./beneficioFormValidation";
import { cn } from "@/lib/utils";

export type BeneficioFormMode = "create" | "edit";

export type BeneficioFormInitialData = {
  descripcion?: string;
  fechaExpiracion?: string;
  maxUsos?: number | null;
  diasValidos?: number[];
  ventanasHorarias?: BeneficioTimeWindows | null;
  esPublico?: boolean;
  mediosPago?: MedioPago[];
  esAcumulable?: boolean;
  condicionesExtra?: string | null;
  maxUsosPorCliente?: number | null;
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

const FIELD_ERROR_KEYS = ["descripcion", "fechaExpiracion", "maxUsos", "condicionesExtra", "maxUsosPorCliente", "ventanasHorarias"] as const;

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

const BENEFICIO_FIELD_HELP = {
  descripcion:
    "Es el texto corto que verá la gente cuando encuentre el cupón. Conviene que resuma el beneficio de forma clara y específica.",
  fechaExpiracion:
    "Define hasta qué día se puede reclamar o usar el cupón. Después de esa fecha deja de estar disponible automáticamente.",
  maxUsos:
    "Limita la cantidad total de veces que este cupón puede canjearse entre todas las personas. Si lo dejás vacío, no tendrá tope general.",
  maxUsosPorCliente:
    "Marca cuántas veces puede usarlo cada cliente. Si lo dejás vacío, cada cliente podrá usarlo una vez.",
  diasDisponibles:
    "Elegí si el cupón aplica todos los días o solo en días puntuales. Esto te ayuda a controlar cuándo aparece como válido.",
  horarioPorDia:
    "Activalo si necesitás horarios distintos por día. Solo funciona cuando seleccionaste días específicos, no para “Todos los días”.",
  visibilidad:
    "Un cupón público aparece en el directorio para cualquier persona. Uno privado solo se puede compartir por link directo.",
  mediosPago:
    "Podés dejarlo abierto a cualquier medio o restringirlo a los métodos que quieras aceptar para este beneficio.",
  acumulable:
    "Definí si este cupón puede combinarse con otras promociones. Si lo desactivás, el cliente deberá usarlo por separado.",
  condicionesExtra:
    "Usá este campo para aclarar reglas importantes, por ejemplo consumo mínimo, exclusiones o restricciones del local.",
} as const;

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
  const [useTimeWindows, setUseTimeWindows] = useState(hasBeneficioTimeWindows(initialData?.ventanasHorarias));
  const [timeWindowDrafts, setTimeWindowDrafts] = useState<TimeWindowDraftMap>(() =>
    createWindowDraftMap(initialData?.ventanasHorarias),
  );
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

  const minDate = getTodayDateString();
  const todosLosDias = diasValidos.length === 0;

  const diasSeleccionados = useMemo(() => sortDiasValidos(diasValidos), [diasValidos]);
  const selectedDaysWindowDrafts = useMemo(
    () => diasSeleccionados.map((day) => ({ day, draft: timeWindowDrafts[day] ?? createDefaultWindowDraft() })),
    [diasSeleccionados, timeWindowDrafts],
  );

  function clearFieldError(field: (typeof FIELD_ERROR_KEYS)[number]) {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleDiaToggle(value: number) {
    setDiasValidos((prev) => {
      const nextDays = toggleSelectedWeekday(prev, value);

      setTimeWindowDrafts((current) => syncWindowDrafts(nextDays, current));

      if (nextDays.length === 0) {
        setUseTimeWindows(false);
      }

      return nextDays;
    });
  }

  function handleEnableTimeWindows(enabled: boolean) {
    setUseTimeWindows(enabled);
    setFieldErrors((prev) => {
      if (!prev.ventanasHorarias) {
        return prev;
      }

      const next = { ...prev };
      delete next.ventanasHorarias;
      return next;
    });

    if (enabled) {
      setTimeWindowDrafts((current) => syncWindowDrafts(diasSeleccionados, current));
    }
  }

  function handleWindowDraftChange(day: number, field: keyof TimeWindowDraft, value: string) {
    setTimeWindowDrafts((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] ?? createDefaultWindowDraft()),
        [field]: value,
      },
    }));

    setFieldErrors((prev) => {
      if (!prev.ventanasHorarias) {
        return prev;
      }

      const next = { ...prev };
      delete next.ventanasHorarias;
      return next;
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

    const formValidation = validateBeneficioFormSubmission({
      descripcion,
      fechaExpiracion,
      maxUsos,
      maxUsosPorCliente,
    });

    if (!formValidation.ok) {
      setFieldErrors({ [formValidation.field]: formValidation.message });
      return;
    }

    if (useTimeWindows) {
      if (todosLosDias || diasSeleccionados.length === 0) {
        setFieldErrors({ ventanasHorarias: "Seleccioná días específicos antes de configurar un horario." });
        return;
      }

      const timeWindowError = validateTimeWindowDrafts(diasSeleccionados, timeWindowDrafts);

      if (timeWindowError) {
        setFieldErrors({ ventanasHorarias: timeWindowError });
        return;
      }
    }

    const serializedWindows = useTimeWindows ? serializeWindowDrafts(diasSeleccionados, timeWindowDrafts) : null;

    if (useTimeWindows && !serializedWindows) {
      setFieldErrors({ ventanasHorarias: "No pudimos interpretar el horario configurado. Revisá los valores cargados." });
      return;
    }

    setLoading(true);

    const response = await fetch(submitConfig.endpoint, {
      method: submitConfig.method ?? "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descripcion,
        fechaExpiracion,
        maxUsos: formValidation.parsedMaxUsos,
        diasValidos,
        ventanasHorarias: serializedWindows,
        esPublico,
        mediosPago,
        esAcumulable,
        condicionesExtra: condicionesExtra || null,
        maxUsosPorCliente: formValidation.parsedMaxUsosPorCliente,
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
    <form noValidate onSubmit={handleSubmit} className="space-y-5 lg:space-y-4 2xl:space-y-5">
      {summaryBadges && summaryBadges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {summaryBadges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant ?? "muted"}>
              {badge.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3.5 2xl:gap-4">
        <div className="sm:col-span-2 lg:col-span-3">
          <Input
            label="Descripción"
            labelHelp={BENEFICIO_FIELD_HELP.descripcion}
            value={descripcion}
            onChange={(event) => {
              setDescripcion(event.target.value);
              clearFieldError("descripcion");
            }}
            placeholder="Ej: 20% de descuento en todos los productos"
            maxLength={40}
            error={fieldErrors.descripcion}
            required
          />
        </div>

        <DatePicker
          label="Fecha de expiración"
          labelHelp={BENEFICIO_FIELD_HELP.fechaExpiracion}
          value={fechaExpiracion}
          onChange={(value) => {
            setFechaExpiracion(value);
            clearFieldError("fechaExpiracion");
          }}
          min={minDate}
          error={fieldErrors.fechaExpiracion}
          required
        />

        <Input
          label="Máximo de usos"
          labelHelp={BENEFICIO_FIELD_HELP.maxUsos}
          type="number"
          value={maxUsos}
          onChange={(event) => {
            setMaxUsos(event.target.value);
            clearFieldError("maxUsos");
          }}
          placeholder="Sin límite si se deja vacío"
          min="1"
          inputMode="numeric"
          error={fieldErrors.maxUsos}
        />

        <Input
          label="Máx. usos por cliente"
          labelHelp={BENEFICIO_FIELD_HELP.maxUsosPorCliente}
          type="number"
          value={maxUsosPorCliente}
          onChange={(event) => {
            setMaxUsosPorCliente(event.target.value);
            clearFieldError("maxUsosPorCliente");
          }}
          placeholder="1 uso si se deja vacío"
          min="1"
          inputMode="numeric"
          error={fieldErrors.maxUsosPorCliente}
        />
      </div>

      <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setIsDaysOpen((prev) => !prev)}
            aria-expanded={isDaysOpen}
            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
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
          <FieldHelp label="Días disponibles" content={BENEFICIO_FIELD_HELP.diasDisponibles} className="mt-0.5" />
        </div>

        {isDaysOpen ? <div className="mt-3 space-y-3 lg:mt-2.5 lg:space-y-2.5 2xl:mt-3 2xl:space-y-3">
          <div className="space-y-2.5 sm:flex sm:flex-wrap sm:items-start sm:gap-2 sm:space-y-0 lg:gap-2 2xl:gap-2.5">
            <div className="flex sm:flex-none">
              <Button
                type="button"
                variant={todosLosDias ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setDiasValidos([]);
                  setUseTimeWindows(false);
                  setTimeWindowDrafts({});
                }}
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

          <div className="rounded-2xl border border-border-default/70 bg-surface/80 p-3 lg:p-2.5 2xl:p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
                      Horario por día
                    </p>
                    <FieldHelp label="Horario por día" content={BENEFICIO_FIELD_HELP.horarioPorDia} />
                  </div>
                </div>
                  <p className="text-sm text-text-muted lg:text-[13px] 2xl:text-sm">
                    {todosLosDias
                      ? "Para cargar un horario, primero elegí los días puntuales en los que querés que aplique el cupón."
                      : "Definí desde qué hora hasta qué hora puede canjearse el cupón en cada día elegido."}
                  </p>
                </div>
              <button
                type="button"
                role="switch"
                aria-checked={useTimeWindows}
                disabled={todosLosDias}
                onClick={() => handleEnableTimeWindows(!useTimeWindows)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  useTimeWindows ? "bg-primary" : "bg-border-default",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                    useTimeWindows ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {useTimeWindows && !todosLosDias ? (
              <div className="mt-3 space-y-3 lg:mt-2.5 lg:space-y-2.5 2xl:mt-3 2xl:space-y-3">
                {selectedDaysWindowDrafts.map(({ day, draft }) => (
                  <div key={day} className="grid gap-3 rounded-xl border border-border-default/60 bg-surface px-3 py-3 sm:grid-cols-[minmax(0,1fr)_140px_140px] sm:items-end lg:px-3 lg:py-2.5 2xl:px-3 2xl:py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
                        {getDiaLabel(day, "full")}
                      </p>
                      <p className="text-xs text-text-muted lg:text-[11px] 2xl:text-xs">
                        Si el cierre pasa la medianoche, cargá una hora de fin menor a la de inicio.
                      </p>
                    </div>

                    <Input
                      label="Desde"
                      type="time"
                      value={draft.start}
                      onChange={(event) => handleWindowDraftChange(day, "start", event.target.value)}
                      step={60}
                    />

                    <Input
                      label="Hasta"
                      type="time"
                      value={draft.end}
                      onChange={(event) => handleWindowDraftChange(day, "end", event.target.value)}
                      step={60}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {fieldErrors.ventanasHorarias ? (
              <p className="mt-2 text-xs text-danger lg:text-[11px] 2xl:text-xs">{fieldErrors.ventanasHorarias}</p>
            ) : null}
          </div>
        </div> : null}
      </section>

      <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setIsVisibilityOpen((prev) => !prev)}
            aria-expanded={isVisibilityOpen}
            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
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
          <FieldHelp label="Visibilidad del cupón" content={BENEFICIO_FIELD_HELP.visibilidad} className="mt-0.5" />
        </div>

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
      </section>

      <section className="rounded-2xl border border-border-default/80 bg-surface-muted/50 p-4 lg:p-3.5 2xl:p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setIsConditionsOpen((prev) => !prev)}
            aria-expanded={isConditionsOpen}
            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
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
          <FieldHelp label="Condiciones" content={BENEFICIO_FIELD_HELP.condicionesExtra} className="mt-0.5" />
        </div>

        {isConditionsOpen ? <div className="mt-3 space-y-4 lg:mt-2.5 lg:space-y-3.5 2xl:mt-3 2xl:space-y-4">
          <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
                Medios de pago aceptados
              </p>
              <FieldHelp label="Medios de pago aceptados" content={BENEFICIO_FIELD_HELP.mediosPago} />
            </div>
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
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
                  {esAcumulable ? "Acumulable" : "No acumulable"}
                </p>
                <FieldHelp label="Acumulable" content={BENEFICIO_FIELD_HELP.acumulable} />
              </div>
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
            labelHelp={BENEFICIO_FIELD_HELP.condicionesExtra}
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
