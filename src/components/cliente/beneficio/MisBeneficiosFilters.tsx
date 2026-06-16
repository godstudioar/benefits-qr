"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHADOW } from "@/lib/shadowStyles";
import { ReclamoEffectiveStatus } from "@/lib/couponStatus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/Select";

const STATUS_ALL = "__all__";
const RUBRO_ALL = "__all__";

type Rubro = { id: number | string; nombre: string };

const STATUS_OPTIONS = [
  { value: ReclamoEffectiveStatus.PENDIENTE, label: "Pendiente" },
  { value: ReclamoEffectiveStatus.CANJEADO, label: "Canjeado" },
  { value: ReclamoEffectiveStatus.VENCIDO, label: "Vencido" },
  { value: ReclamoEffectiveStatus.CANCELADO, label: "Cancelado" },
] as const;

export default function MisBeneficiosFilters({ rubros }: { rubros: Rubro[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentSoloHoy = searchParams.get("soloHoy") === "1";
  const currentRubro = searchParams.get("rubro") ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(currentQ);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchParamsRef = useRef(searchParams.toString());

  useEffect(() => {
    latestSearchParamsRef.current = searchParams.toString();
  }, [searchParams]);

  useEffect(() => {
    setSearchValue(currentQ);
  }, [currentQ]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const selectStatusValue =
    currentStatus && STATUS_OPTIONS.some((s) => s.value === currentStatus)
      ? currentStatus
      : STATUS_ALL;

  const selectedStatusLabel = STATUS_OPTIONS.find(
    (s) => s.value === currentStatus
  )?.label;

  const selectRubroValue = currentRubro || RUBRO_ALL;
  const selectedRubroLabel = !currentRubro
    ? null
    : (rubros.find((r) => String(r.id) === currentRubro)?.nombre ?? null);

  const activeCount =
    (currentQ ? 1 : 0) +
    (currentStatus ? 1 : 0) +
    (currentSoloHoy ? 1 : 0) +
    (currentRubro ? 1 : 0);

  const buildUrl = useCallback(
    (
      overrides: Record<string, string | undefined>,
      baseSearchParams = latestSearchParamsRef.current
    ) => {
      const params = new URLSearchParams(baseSearchParams);

      for (const [key, value] of Object.entries(overrides)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      const qs = params.toString();
      return qs ? `/mis-beneficios?${qs}` : "/mis-beneficios";
    },
    []
  );

  function handleQChange(value: string) {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.push(
        buildUrl(
          { q: value || undefined, page: undefined },
          latestSearchParamsRef.current
        )
      );
    }, 300);
  }

  function handleStatusChange(value: string) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.push(
      buildUrl({
        status: value === STATUS_ALL ? undefined : value,
        page: undefined,
      })
    );
  }

  function handleRubroChange(value: string) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.push(
      buildUrl({
        rubro: value === RUBRO_ALL ? undefined : value,
        page: undefined,
      })
    );
  }

  function handleToggleSoloHoy() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.push(
      buildUrl({ soloHoy: currentSoloHoy ? undefined : "1", page: undefined })
    );
  }

  function handleClear() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.push(
      buildUrl({
        q: undefined,
        status: undefined,
        soloHoy: undefined,
        rubro: undefined,
        page: undefined,
      })
    );
  }

  const toggle = (active: boolean) =>
    cn(
      "flex h-10 min-w-0 shrink-0 cursor-pointer select-none items-center justify-center rounded-xl border px-2.5 text-[12px] font-medium whitespace-nowrap transition-all duration-200 sm:px-4 sm:text-sm",
      active
        ? "border-primary bg-primary text-white shadow-sm"
        : "border-border-default bg-surface text-text-secondary hover:border-primary/40 hover:bg-primary-soft/20 hover:text-text-primary"
    );

  const controls = (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative col-span-2 w-full sm:min-w-[190px] sm:flex-[2]">
        <label htmlFor="mis-beneficios-search" className="sr-only">
          Buscar beneficio
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          id="mis-beneficios-search"
          type="text"
          placeholder="Buscar beneficio o local..."
          value={searchValue}
          onChange={(e) => handleQChange(e.target.value)}
          className="h-10 w-full rounded-xl border border-border-default bg-surface py-2 pl-9 pr-3 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft"
        />
      </div>

      <div className="min-w-0 sm:min-w-[150px] sm:flex-1">
        <Select value={selectStatusValue} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <span
              className={cn(
                "truncate text-sm",
                !selectedStatusLabel && "font-normal text-text-muted"
              )}
            >
              {selectedStatusLabel ?? "Todos los estados"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 sm:min-w-[150px] sm:flex-1">
        <Select value={selectRubroValue} onValueChange={handleRubroChange}>
          <SelectTrigger>
            <span
              className={cn(
                "truncate text-sm",
                !selectedRubroLabel && "font-normal text-text-muted"
              )}
            >
              {selectedRubroLabel ?? "Todos los rubros"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RUBRO_ALL}>Todos los rubros</SelectItem>
            {rubros.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden h-5 w-px shrink-0 bg-border-default sm:block" />

      <button
        type="button"
        onClick={handleToggleSoloHoy}
        className={cn(toggle(currentSoloHoy), "col-span-2 w-full sm:w-auto")}
      >
        Disponible hoy
      </button>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="col-span-2 flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium text-text-muted transition-colors hover:text-danger sm:col-auto"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );

  return (
    <div className="mb-5 sm:mb-6 lg:mb-5 2xl:mb-6">
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={`flex w-full items-center gap-2 overflow-hidden rounded-2xl border border-surface/80 bg-surface/95 px-4 py-2.5 text-sm font-medium text-text-primary ${SHADOW.cardBase}`}
        >
          <Filter className="h-4 w-4 shrink-0 text-text-muted" />
          <span>Filtros</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div className="mt-2 rounded-xl border border-border-default bg-surface p-3 shadow-sm">
            {controls}
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <div
          className={`overflow-hidden rounded-2xl border border-surface/80 bg-surface/95 ${SHADOW.cardBase} sm:bg-surface/85 sm:backdrop-blur-md`}
        >
          <div className="px-4 py-3">{controls}</div>
        </div>
      </div>
    </div>
  );
}
