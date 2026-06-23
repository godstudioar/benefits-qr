import { EstadoReclamo, MedioPago, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type BeneficioTxClient = Prisma.TransactionClient;

export type BeneficioEditRecord = {
  id: string;
  descripcion: string;
  fechaExpiracion: Date;
  maxUsos: number | null;
  diasValidos: number[];
  ventanasHorarias: Prisma.JsonValue | null;
  esPublico: boolean;
  mediosPago: MedioPago[];
  esAcumulable: boolean;
  condicionesExtra: string | null;
  maxUsosPorCliente: number | null;
  localId: string;
};

export async function findBeneficiosByLocal(localId: string) {
  return prisma.beneficio.findMany({
    where: { localId },
    include: {
      _count: { select: { reclamos: true } },
      reclamos: { where: { estado: EstadoReclamo.CANJEADO }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBeneficio(data: {
  descripcion: string;
  fechaExpiracion: Date;
  maxUsos: number | null;
  diasValidos: number[];
  ventanasHorarias: Prisma.JsonValue | null;
  esPublico: boolean;
  mediosPago: MedioPago[];
  esAcumulable: boolean;
  condicionesExtra: string | null;
  maxUsosPorCliente: number | null;
  localId: string;
}) {
  return prisma.beneficio.create({
    data: {
      ...data,
      ventanasHorarias: data.ventanasHorarias ?? Prisma.DbNull,
    },
  });
}

export async function findBeneficioPublicById(id: string) {
  return prisma.beneficio.findFirst({
    where: {
      id,
      deletedAt: null,
      esPublico: true,
      local: {
        isTest: false,
        active: true,
      },
    },
    include: { local: { select: { nombre: true, logoUrl: true } } },
  });
}

export async function findBeneficioOwnedByLocal(id: string, localId: string) {
  return prisma.beneficio.findFirst({
    where: { id, localId, deletedAt: null },
  });
}

export async function findBeneficioEditByLocal(id: string, localId: string) {
  return prisma.beneficio.findFirst({
    where: { id, localId, deletedAt: null },
    select: {
      id: true,
      descripcion: true,
      fechaExpiracion: true,
      maxUsos: true,
      diasValidos: true,
      ventanasHorarias: true,
      esPublico: true,
      mediosPago: true,
      esAcumulable: true,
      condicionesExtra: true,
      maxUsosPorCliente: true,
      reclamos: {
        select: {
          id: true,
          estado: true,
        },
      },
    },
  });
}

export async function findBeneficioOwnedByLocalForUpdate(
  tx: BeneficioTxClient,
  id: string,
  localId: string,
) {
  return tx.beneficio.findFirst({
    where: { id, localId, deletedAt: null },
    select: {
      id: true,
      descripcion: true,
      fechaExpiracion: true,
      maxUsos: true,
      diasValidos: true,
      ventanasHorarias: true,
      esPublico: true,
      localId: true,
    },
  });
}

export async function countBeneficioReclamosByEstados(
  tx: BeneficioTxClient,
  beneficioId: string,
  estados: EstadoReclamo[],
) {
  return tx.reclamo.count({
    where: {
      beneficioId,
      estado: { in: estados },
    },
  });
}

export async function updateBeneficioPartial(
  tx: BeneficioTxClient,
  id: string,
  data: Partial<Pick<BeneficioEditRecord, "descripcion" | "fechaExpiracion" | "maxUsos" | "diasValidos" | "ventanasHorarias" | "esPublico" | "mediosPago" | "esAcumulable" | "condicionesExtra" | "maxUsosPorCliente">>,
) {
  const { ventanasHorarias, ...restData } = data;

  return tx.beneficio.update({
    where: { id },
    data: {
      ...restData,
      ...(ventanasHorarias !== undefined
        ? { ventanasHorarias: ventanasHorarias ?? Prisma.DbNull }
        : {}),
    },
  });
}

export async function softDeleteBeneficioAndDeleteReclamos(id: string) {
  await prisma.$transaction([
    prisma.reclamo.deleteMany({
      where: { beneficioId: id },
    }),
    prisma.beneficio.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);
}

export async function findBeneficioStatsByLocal(id: string, localId: string) {
  return prisma.beneficio.findFirst({
    where: { id, localId },
    include: {
      reclamos: {
        select: {
          id: true,
          estado: true,
          fechaReclamo: true,
          fechaCanje: true,
          cliente: { select: { email: true } },
        },
        orderBy: { fechaReclamo: "desc" },
      },
    },
  });
}
