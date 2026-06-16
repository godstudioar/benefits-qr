"use client";

import { createContext, useContext } from "react";
import { useUserLocation, type UseUserLocationResult } from "@/hooks/useUserLocation";

const PublicBenefitsLocationContext = createContext<UseUserLocationResult | null>(null);

export function PublicBenefitsLocationProvider({ children }: { children: React.ReactNode }) {
  const location = useUserLocation();

  return (
    <PublicBenefitsLocationContext.Provider value={location}>
      {children}
    </PublicBenefitsLocationContext.Provider>
  );
}

export function usePublicBenefitsLocation() {
  const context = useContext(PublicBenefitsLocationContext);

  if (!context) {
    throw new Error("usePublicBenefitsLocation must be used within PublicBenefitsLocationProvider");
  }

  return context;
}

/**
 * Safe to use outside the provider (e.g. shared map wrappers that may render
 * in landing sections without location context). Returns null when no provider
 * is present so the component can fall back to a non-location-aware state.
 */
export function useOptionalPublicBenefitsLocation(): UseUserLocationResult | null {
  return useContext(PublicBenefitsLocationContext);
}
