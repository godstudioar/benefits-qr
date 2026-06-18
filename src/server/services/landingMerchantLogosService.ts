import { getLocalLogoDisplayUrl } from "@/lib/localLogoSource";
import {
  getLandingMerchantLogosRaw,
  type LandingMerchantLogoRaw,
} from "@/server/repositories/landingMerchantLogosRepository";

export type LandingMerchantLogoItem = {
  id: string;
  nombre: string;
  logoUrl: string | null;
};

function hasDisplayLogo(local: LandingMerchantLogoRaw) {
  return Boolean(getLocalLogoDisplayUrl({ localId: local.id, logoUrl: local.logoUrl }));
}

export async function getLandingMerchantLogos(limit = 12): Promise<LandingMerchantLogoItem[]> {
  const locales = await getLandingMerchantLogosRaw(limit);

  return locales
    .toSorted((a, b) => Number(hasDisplayLogo(b)) - Number(hasDisplayLogo(a)))
    .map((local) => ({
      id: local.id,
      nombre: local.nombre.trim(),
      logoUrl: getLocalLogoDisplayUrl({ localId: local.id, logoUrl: local.logoUrl }),
    }));
}
