import { prisma } from "@/lib/prisma";
import { EstadoReclamo } from "@/generated/prisma/client";

export async function findReclamoForQr(reclamoId: string, clienteId: string) {
  return prisma.reclamo.findFirst({
    where: { id: reclamoId, clienteId },
    select: {
      estado: true,
      beneficio: {
        select: {
          deletedAt: true,
          fechaExpiracion: true,
          diasValidos: true,
          ventanasHorarias: true,
          maxUsos: true,
          _count: { select: { reclamos: { where: { estado: EstadoReclamo.CANJEADO } } } },
          evento: { select: { fechaInicio: true } },
        },
      },
    },
  });
}

export async function setQrToken(
  reclamoId: string,
  qrToken: string,
  qrTokenExpira: Date
) {
  return prisma.reclamo.update({
    where: { id: reclamoId },
    data: { qrToken, qrTokenExpira },
  });
}

export async function findReclamoForCanje(reclamoId: string, qrToken: string) {
  return prisma.reclamo.findFirst({
    where: { id: reclamoId, qrToken },
    select: {
      estado: true,
      qrTokenExpira: true,
      beneficio: {
        select: {
          localId: true,
          deletedAt: true,
          fechaExpiracion: true,
          diasValidos: true,
          ventanasHorarias: true,
          maxUsos: true,
          _count: { select: { reclamos: { where: { estado: EstadoReclamo.CANJEADO } } } },
          evento: { select: { fechaInicio: true } },
        },
      },
    },
  });
}

export async function markReclamoAsCanjeado(reclamoId: string) {
  return prisma.reclamo.update({
    where: { id: reclamoId },
    data: {
      estado: EstadoReclamo.CANJEADO,
      fechaCanje: new Date(),
      qrToken: null,
    },
  });
}
