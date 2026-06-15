"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Map, AdvancedMarker, useMap, InfoWindow, useApiIsLoaded } from "@vis.gl/react-google-maps";
import { Store, AlertCircle } from "lucide-react";
import LogoFrame from "@/components/ui/LogoFrame";
import type { LocalConBeneficiosRaw } from "@/server/repositories/localesMapRepository";
import type { LatLng } from "@/lib/geo/distance";
import { formatDistance, haversineKm } from "@/lib/geo/distance";

const DEFAULT_CENTER: LatLng = { lat: -27.36693, lng: -55.89363 };
const DEFAULT_ZOOM = 12;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MapBoundsFitter({
  locales,
  userCoords,
}: {
  locales: LocalConBeneficiosRaw[];
  userCoords: LatLng | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (userCoords) {
      map.panTo(userCoords);
      map.setZoom(13);
      return;
    }
    if (locales.length === 0) return;
    if (locales.length === 1) {
      map.panTo({ lat: locales[0].lat, lng: locales[0].lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const l of locales) bounds.extend({ lat: l.lat, lng: l.lng });
    map.fitBounds(bounds, 64);
  }, [map, locales, userCoords]);

  return null;
}

function LocalMarker({
  local,
  isSelected,
  onSelect,
}: {
  local: LocalConBeneficiosRaw;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const name = local.nombre ?? "Local adherido";
  const initials = getInitials(name) || "LO";
  const hasActiveBenefits = local.beneficiosCount > 0;
  return (
    <AdvancedMarker
      position={{ lat: local.lat, lng: local.lng }}
      onClick={() => onSelect(local.id)}
      title={name}
    >
      <div
        className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 shadow-lg transition-all duration-200 ${
          hasActiveBenefits
            ? isSelected
              ? "bg-surface text-primary scale-115 border-primary ring-4 ring-primary-soft/30 z-50"
              : "bg-surface text-primary border-primary/50 hover:border-primary hover:scale-105"
            : isSelected
              ? "bg-surface-muted text-text-muted opacity-70 grayscale scale-115 border-border-default ring-4 ring-border-default/30 z-50"
              : "bg-surface-muted text-text-muted opacity-60 grayscale border-border-default hover:opacity-80 hover:scale-105"
        }`}
      >
        {local.logoUrl ? (
          <LogoFrame
            src={local.logoUrl}
            alt={`Logo de ${name}`}
            name={name}
            shape="circle"
            className="h-full w-full rounded-full bg-transparent shadow-none"
            fallbackClassName="text-sm"
          />
        ) : (
          <span className="text-sm font-bold">{initials}</span>
        )}
      </div>
    </AdvancedMarker>
  );
}

function UserMarker({ coords }: { coords: LatLng }) {
  return (
    <AdvancedMarker position={coords} title="Estás acá">
      <div className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute h-8 w-8 animate-ping rounded-full bg-primary/40" />
        <span className="relative h-4 w-4 rounded-full border-2 border-white bg-primary shadow-md" />
      </div>
    </AdvancedMarker>
  );
}

function MapErrorState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertCircle className="h-10 w-10 text-danger" />
      <div>
        <p className="font-semibold text-text-primary">No se pudo cargar el mapa</p>
        <p className="text-sm text-text-muted">
          Verificá que la API key de Google Maps esté configurada correctamente y que las APIs de Maps JavaScript y Places estén habilitadas en Google Cloud Console.
        </p>
      </div>
    </div>
  );
}

export default function LocalesMap({
  locales,
  userCoords,
  heightClassName = "h-[70vh]",
  benefitCountLabel = "vigentes",
  benefitsHrefSearchParams = "",
  emptyStateMessage = "Todavía no hay locales ubicados en el mapa.",
}: {
  locales: LocalConBeneficiosRaw[];
  userCoords: LatLng | null;
  heightClassName?: string;
  benefitCountLabel?: "vigentes" | "coincidentes";
  benefitsHrefSearchParams?: string;
  emptyStateMessage?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const apiIsLoaded = useApiIsLoaded();

  // AdvancedMarker requiere obligatoriamente un mapId. Usamos DEMO_MAP_ID como fallback.
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

  // Log para debug en desarrollo
  if (process.env.NODE_ENV !== "production") {
    console.log("[LocalesMap] mapId:", mapId);
    console.log("[LocalesMap] apiIsLoaded:", apiIsLoaded);
  }

  const initialCenter = useMemo(() => {
    if (locales.length > 0) {
      return { lat: locales[0].lat, lng: locales[0].lng };
    }
    return DEFAULT_CENTER;
  }, [locales]);

  // Si la API no se cargó después de un tiempo, mostrar error
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!apiIsLoaded) {
        setShowError(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [apiIsLoaded]);

  if (showError) {
    return (
      <div className={`relative ${heightClassName} w-full overflow-hidden rounded-2xl border border-border-default bg-surface-muted shadow-sm`}>
        <MapErrorState />
      </div>
    );
  }

  const selected = selectedId
    ? locales.find((l) => l.id === selectedId) ?? null
    : null;

  const distanceLabel =
    selected && userCoords
      ? formatDistance(haversineKm(userCoords, { lat: selected.lat, lng: selected.lng }))
      : null;
  const selectedBenefitsLabel =
    selected?.beneficiosCount === 1
      ? benefitCountLabel === "coincidentes"
        ? "beneficio que coincide"
        : "beneficio vigente"
      : benefitCountLabel === "coincidentes"
        ? "beneficios que coinciden"
        : "beneficios vigentes";
  const selectedEmptyLabel =
    benefitCountLabel === "coincidentes" ? "Sin beneficios que coincidan" : "Sin beneficios vigentes";

  function buildSelectedBenefitsHref(localId: string) {
    const params = new URLSearchParams(benefitsHrefSearchParams);
    params.set("local", localId);

    const query = params.toString();
    return query ? `/beneficios?${query}` : "/beneficios";
  }

  if (locales.length === 0) {
    return (
      <div className={`flex ${heightClassName} items-center justify-center rounded-2xl border border-border-default bg-surface-muted p-6 text-center text-sm text-text-muted`}>
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className={`relative ${heightClassName} w-full overflow-hidden rounded-2xl border border-border-default bg-surface-muted shadow-sm`}>
      <Map
        defaultCenter={initialCenter}
        defaultZoom={DEFAULT_ZOOM}
        mapId={mapId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        reuseMaps
      >
        <MapBoundsFitter locales={locales} userCoords={userCoords} />
        {userCoords ? <UserMarker coords={userCoords} /> : null}
        {locales.map((local) => (
          <LocalMarker
            key={local.id}
            local={local}
            isSelected={selectedId === local.id}
            onSelect={setSelectedId}
          />
        ))}
        {selected ? (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelectedId(null)}
            pixelOffset={[0, -28]}
          >
            <div className="min-w-[200px] space-y-2 p-1">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-text-primary">
                  {selected.nombre ?? "Local adherido"}
                </p>
              </div>
              {selected.beneficiosCount > 0 ? (
                <p className="text-xs text-text-muted">
                  {selected.beneficiosCount} {selectedBenefitsLabel}
                  {distanceLabel ? ` · a ${distanceLabel}` : ""}
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  {selectedEmptyLabel}
                  {distanceLabel ? ` · a ${distanceLabel}` : ""}
                </p>
              )}
              {selected.beneficiosCount > 0 && (
                <Link
                  href={buildSelectedBenefitsHref(selected.id)}
                  className="inline-block text-xs font-semibold text-primary hover:text-accent"
                >
                  Ver beneficios →
                </Link>
              )}
            </div>
          </InfoWindow>
        ) : null}
      </Map>
    </div>
  );
}
