import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type LandingMerchantLogoRaw = {
  id: string;
  nombre: string;
  logoUrl: string | null;
};

function hasMerchantName(
  local: { id: string; nombre: string | null; logoUrl: string | null }
): local is LandingMerchantLogoRaw {
  return typeof local.nombre === "string" && local.nombre.trim().length > 0;
}

async function _getLandingMerchantLogosRaw(limit: number): Promise<LandingMerchantLogoRaw[]> {
  const locales = await prisma.local.findMany({
    where: {
      active: true,
      isTest: false,
      nombre: { not: null },
    },
    select: {
      id: true,
      nombre: true,
      logoUrl: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return locales.filter(hasMerchantName);
}

export function getLandingMerchantLogosRaw(limit: number) {
  return unstable_cache(
    async () => _getLandingMerchantLogosRaw(limit),
    ["landing-merchant-logos", String(limit)],
    { revalidate: 300 }
  )();
}
