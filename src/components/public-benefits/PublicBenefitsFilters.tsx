"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, LocateFixed, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicBenefitsLocation } from "@/components/public-benefits/PublicBenefitsLocationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/Select";

const RUBRO_ALL = "__all__";

type Rubro = { id: number | string; nombre: string };

export default function PublicBenefitsFilters({ rubros }: { rubros: Rubro[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const location = usePublicBenefitsLocation();

  const currentQ = searchParams.get("q") ?? "";
  const currentRubro = searchParams.get("rubro") ?? "";
  const currentSoloHoy = searchParams.get("soloHoy") === "1";
  const currentSoloDisponibles = searchParams.get("soloDisponibles") === "1";
  const currentLocal = searchParams.get("local") ?? "";
  const isNearbyActive = location.status === "granted" && location.coords !== null;
  const isNearbyLoading = location.status === "prompting";
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

  // Derive Select value and label entirely from the URL — single source of truth.
  // Local state (rubroValue) caused desync: the Suspense remount on RSC navigation
  // would reinitialize useState before searchParams updated, losing the selection.
  const selectRubroValue = currentRubro || RUBRO_ALL;
  const selectedRubroLabel = !currentRubro
    ? null
    : (rubros.find((r) => String(r.id) === currentRubro)?.nombre ?? null);

  const activeCount =
    (currentQ ? 1 : 0) +
    (currentRubro ? 1 : 0) +
    (currentSoloHoy ? 1 : 0) +
    (currentSoloDisponibles ? 1 : 0) +
    (currentLocal ? 1 : 0) +
    (isNearbyActive ? 1 : 0);

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>, baseSearchParams = latestSearchParamsRef.current) => {
      const params = new URLSearchParams(baseSearchParams);

      for (const [key, value] of Object.entries(overrides)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      const qs = params.toString();
      return qs ? `/beneficios?${qs}` : "/beneficios";
    },
    []
  );

  function handleQChange(value: string) {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.push(
        buildUrl({ q: value || undefined, page: undefined }, latestSearchParamsRef.current)
      );
    }, 300);
  }

  function handleRubroChange(value: string) {
    router.push(buildUrl({ rubro: value === RUBRO_ALL ? undefined : value, page: undefined }));
  }

  function handleToggleSoloHoy() {
    router.push(buildUrl({ soloHoy: currentSoloHoy ? undefined : "1", page: undefined }));
  }

  function handleToggleSoloDisponibles() {
    router.push(
      buildUrl({ soloDisponibles: currentSoloDisponibles ? undefined : "1", page: undefined })
    );
  }

  function handleClear() {
    if (isNearbyActive) {
      location.clear();
    }

    router.push(
      buildUrl({
        q: undefined,
        rubro: undefined,
        soloHoy: undefined,
        soloDisponibles: undefined,
        local: undefined,
        page: undefined,
      })
    );
  }

  function handleNearbyToggle() {
    if (isNearbyActive) {
      location.clear();
      return;
    }

    location.request();
  }

  const toggle = (active: boolean) =>
    cn(
      "flex h-10 min-w-0 shrink-0 cursor-pointer select-none items-center justify-center rounded-xl border px-2.5 text-[12px] font-medium whitespace-nowrap transition-all duration-200 sm:px-4 sm:text-sm",
      active
        ? "border-primary bg-primary text-white shadow-sm"
        : "border-border-default bg-surface text-text-secondary hover:border-primary/40 hover:bg-primary-soft/20 hover:text-text-primary"
    );

  const controls = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Búsqueda por nombre */}
      <div className="relative w-full sm:min-w-[190px] sm:flex-[2]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar local..."
          value={searchValue}
          onChange={(e) => handleQChange(e.target.value)}
          className="h-10 w-full rounded-xl border border-border-default bg-surface py-2 pl-9 pr-3 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft"
        />
      </div>

      {/* Rubro — label computed from props, not from Radix item-text */}
      <div className="w-full sm:min-w-[165px] sm:flex-1">
        <Select value={selectRubroValue} onValueChange={handleRubroChange}>
          <SelectTrigger>
            <span className={cn("truncate text-sm", !selectedRubroLabel && "text-text-muted font-normal")}>
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

      {/* Separador visual solo desktop */}
      <div className="hidden h-5 w-px shrink-0 bg-border-default sm:block" />

      <div className="flex w-full gap-2 sm:contents">
        <button type="button" onClick={handleToggleSoloHoy} className={cn(toggle(currentSoloHoy), "flex-1 sm:flex-none")}>
          Disponible hoy
        </button>

        <button
          type="button"
          onClick={handleToggleSoloDisponibles}
          className={cn(toggle(currentSoloDisponibles), "flex-1 sm:flex-none")}
        >
          Solo activos
        </button>

        <button
          type="button"
          onClick={handleNearbyToggle}
          disabled={isNearbyLoading}
          aria-pressed={isNearbyActive}
          aria-busy={isNearbyLoading || undefined}
          className={cn(toggle(isNearbyActive), "flex-1 sm:flex-none")}
        >
          {isNearbyActive ? (
            <>
              <MapPin className="mr-1 h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              Cerca mío
              <X className="ml-1 h-3.5 w-3.5 sm:ml-1.5" aria-hidden="true" />
            </>
          ) : (
            <>
              <LocateFixed className="mr-1 h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              {isNearbyLoading ? "Buscando..." : "Ver cerca mío"}
            </>
          )}
        </button>
      </div>

      {currentLocal && (
        <button
          type="button"
          onClick={() => router.push(buildUrl({ local: undefined, page: undefined }))}
          className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary-soft/10 px-3 text-sm font-medium text-primary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
        >
          <span>Local seleccionado</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium text-text-muted transition-colors hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );

  const locationFeedback =
    location.error && location.status !== "granted" ? (
      <p className="mt-2 text-[11px] text-warning">{location.error}</p>
    ) : null;

  return (
    <div className="mb-6">
      {/* Mobile: collapsible */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center gap-2 overflow-hidden rounded-2xl border border-surface/80 bg-surface/95 px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm shadow-primary-soft/25"
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
            {locationFeedback}
          </div>
        )}
      </div>

      {/* Desktop: card container — same visual DNA as PublicBenefitCard */}
      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-2xl border border-surface/80 bg-surface/95 shadow-sm shadow-primary-soft/25 sm:bg-surface/85 sm:backdrop-blur-md">
          <div className="h-1 bg-gradient-to-r from-primary to-accent" />
          <div className="px-4 py-3">
            {controls}
            {locationFeedback}
          </div>
        </div>
      </div>
    </div>
  );
}
