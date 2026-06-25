"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHADOW } from "@/lib/shadowStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/Select";

const RUBRO_ALL = "__all__";

type Rubro = { id: number | string; nombre: string };

export default function EventoFilters({
  rubros,
  eventoSlug,
}: {
  rubros: Rubro[];
  eventoSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentRubro = searchParams.get("rubro") ?? "";
  const currentSoloDisponibles = searchParams.get("soloDisponibles") === "1";
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

  const applyFilters = useCallback(
    (overrides: Record<string, string | null>) => {
      const next = new URLSearchParams(latestSearchParamsRef.current);
      next.delete("page");

      Object.entries(overrides).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });

      const qs = next.toString();
      router.push(`/eventos/${eventoSlug}${qs ? `?${qs}` : ""}`);
    },
    [router, eventoSlug],
  );

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      applyFilters({ q: value || null });
    }, 350);
  }

  const hasAnyFilter = currentQ || currentRubro || currentSoloDisponibles;

  function handleClearAll() {
    setSearchValue("");
    router.push(`/eventos/${eventoSlug}`);
  }

  const rubroLabel =
    rubros.find((r) => String(r.id) === currentRubro)?.nombre ?? "Rubro";

  return (
    <div
      className={cn(
        "mb-5 space-y-3 rounded-2xl border border-surface/80 bg-surface/95 p-3 sm:space-y-0 sm:p-4",
        SHADOW.cardBase,
        "sm:bg-surface/85 sm:backdrop-blur-md",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar local..."
            className="h-10 w-full rounded-xl border border-border-default bg-surface py-2 pr-3 pl-9 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium shadow-sm transition-colors sm:hidden",
            isOpen
              ? "border-primary bg-primary-soft text-primary"
              : "border-border-default bg-surface text-text-muted",
          )}
        >
          <Filter className="h-4 w-4" />
          Filtros
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        <div className={cn("hidden sm:flex sm:items-center sm:gap-2")}>
          <Select
            value={currentRubro || RUBRO_ALL}
            onValueChange={(value) =>
              applyFilters({ rubro: value === RUBRO_ALL ? null : value })
            }
          >
            <SelectTrigger className="h-10 min-w-[120px] rounded-xl border border-border-default bg-surface px-3 text-sm shadow-sm">
              {rubroLabel}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={RUBRO_ALL}>Todos</SelectItem>
              {rubros.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() =>
              applyFilters({
                soloDisponibles: currentSoloDisponibles ? null : "1",
              })
            }
            className={cn(
              "h-10 whitespace-nowrap rounded-xl border px-3 text-sm font-medium shadow-sm transition-colors",
              currentSoloDisponibles
                ? "border-primary bg-primary-soft text-primary"
                : "border-border-default bg-surface text-text-muted hover:text-text-primary",
            )}
          >
            Solo activos
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex h-10 items-center gap-1 rounded-xl border border-border-default bg-surface px-3 text-sm text-text-muted shadow-sm transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-wrap gap-2 pt-3 sm:hidden">
          <Select
            value={currentRubro || RUBRO_ALL}
            onValueChange={(value) =>
              applyFilters({ rubro: value === RUBRO_ALL ? null : value })
            }
          >
            <SelectTrigger className="h-10 min-w-[120px] rounded-xl border border-border-default bg-surface px-3 text-sm shadow-sm">
              {rubroLabel}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={RUBRO_ALL}>Todos</SelectItem>
              {rubros.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() =>
              applyFilters({
                soloDisponibles: currentSoloDisponibles ? null : "1",
              })
            }
            className={cn(
              "h-10 whitespace-nowrap rounded-xl border px-3 text-sm font-medium shadow-sm transition-colors",
              currentSoloDisponibles
                ? "border-primary bg-primary-soft text-primary"
                : "border-border-default bg-surface text-text-muted hover:text-text-primary",
            )}
          >
            Solo activos
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex h-10 items-center gap-1 rounded-xl border border-border-default bg-surface px-3 text-sm text-text-muted shadow-sm transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
