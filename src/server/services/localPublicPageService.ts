import { EstadoReclamo } from "@/generated/prisma/client";
import { normalizeBeneficioTimeWindows } from "@/lib/beneficioSchedule";
import { evaluateBeneficioState } from "@/lib/couponStatus";
import { getLocalLogoDisplayUrl } from "@/lib/localLogoSource";
import { prisma } from "@/lib/prisma";
import { getBeneficioAvailabilityPresentation } from "@/lib/statusPresentation";
import type { PublicBenefitCardData } from "@/server/services/publicBenefitsService";

type LocalPublicBenefitCardData = PublicBenefitCardData & {
  canRedeemToday: boolean;
};

export async function getLocalPublicPageData(localId: string) {
  const local = await prisma.local.findFirst({
    where: {
      id: localId,
      isTest: false,
      active: true,
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      logoUrl: true,
      direccion: true,
      telefono: true,
      rubro: { select: { nombre: true } },
      beneficios: {
        where: {
          deletedAt: null,
          esPublico: true,
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          descripcion: true,
          fechaExpiracion: true,
          maxUsos: true,
          diasValidos: true,
          ventanasHorarias: true,
          createdAt: true,
          reclamos: {
            where: { estado: EstadoReclamo.CANJEADO },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!local) {
    return null;
  }

  const benefits: LocalPublicBenefitCardData[] = local.beneficios
    .map((beneficio) => {
      const normalizedWindows = normalizeBeneficioTimeWindows(
        beneficio.ventanasHorarias,
        beneficio.diasValidos as number[]
      );

      const benefitState = evaluateBeneficioState({
        fechaExpiracion: beneficio.fechaExpiracion,
        maxUsos: beneficio.maxUsos,
        canjeados: beneficio.reclamos.length,
        diasValidos: beneficio.diasValidos as number[],
        ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
      });

      if (!benefitState.canClaim) {
        return null;
      }

      const cardData: PublicBenefitCardData = {
        id: beneficio.id,
        descripcion: beneficio.descripcion,
        fechaExpiracion: beneficio.fechaExpiracion,
        maxUsos: beneficio.maxUsos,
        diasValidos: beneficio.diasValidos as number[],
        createdAt: beneficio.createdAt,
        canjeados: beneficio.reclamos.length,
        effectiveStatus: benefitState.status,
        availability: getBeneficioAvailabilityPresentation({
          status: benefitState.status,
          isWrongDay: benefitState.isWrongDay,
          isOutsideTimeWindow: benefitState.isOutsideTimeWindow,
          diasValidos: beneficio.diasValidos as number[],
          ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
        }),
        local: {
          nombre: local.nombre,
          logoUrl: getLocalLogoDisplayUrl({ localId: local.id, logoUrl: local.logoUrl }),
          rubroNombre: local.rubro?.nombre ?? null,
          direccion: local.direccion,
          lat: null,
          lng: null,
        },
      };

      return {
        ...cardData,
        canRedeemToday: benefitState.canRedeemToday,
      };
    })
    .filter(
      (benefit): benefit is LocalPublicBenefitCardData => benefit !== null,
    );

  function toPublicBenefitCardData(benefit: LocalPublicBenefitCardData) {
    const { canRedeemToday, ...cardData } = benefit;
    void canRedeemToday;
    return cardData;
  }

  const redeemableNowBenefits = benefits
    .filter((benefit) => benefit.canRedeemToday)
    .map(toPublicBenefitCardData);

  const claimableLaterBenefits = benefits
    .filter((benefit) => !benefit.canRedeemToday)
    .map(toPublicBenefitCardData);

  return {
    local: {
      ...local,
      logoDisplayUrl: getLocalLogoDisplayUrl({
        localId: local.id,
        logoUrl: local.logoUrl,
      }),
    },
    benefits: redeemableNowBenefits,
    claimableLaterBenefits,
  };
}
