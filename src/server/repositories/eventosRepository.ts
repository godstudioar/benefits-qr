import { prisma } from "@/lib/prisma";

export async function findAllEventos() {
  return prisma.evento.findMany({
    orderBy: { fechaInicio: "desc" },
    include: {
      _count: { select: { beneficios: { where: { deletedAt: null } } } },
    },
  });
}

export async function findEventoBySlug(slug: string) {
  return prisma.evento.findUnique({ where: { slug } });
}

export async function findEventoById(id: string) {
  return prisma.evento.findUnique({ where: { id } });
}

export async function findEventosActivosFuturos() {
  return prisma.evento.findMany({
    where: {
      activo: true,
      fechaFin: { gte: new Date() },
    },
    orderBy: { fechaInicio: "asc" },
    include: {
      _count: { select: { beneficios: { where: { deletedAt: null } } } },
    },
  });
}

export async function findEventosActivosSeleccionables() {
  return prisma.evento.findMany({
    where: {
      activo: true,
      fechaFin: { gte: new Date() },
    },
    orderBy: { fechaInicio: "asc" },
    select: {
      id: true,
      nombre: true,
      slug: true,
      fechaInicio: true,
      fechaFin: true,
    },
  });
}

export async function createEvento(data: {
  nombre: string;
  slug: string;
  descripcion?: string | null;
  imageUrl?: string | null;
  fechaInicio: Date;
  fechaFin: Date;
  ubicacion?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
}) {
  return prisma.evento.create({ data });
}

export async function updateEvento(
  id: string,
  data: Partial<{
    nombre: string;
    slug: string;
    descripcion: string | null;
    imageUrl: string | null;
    fechaInicio: Date;
    fechaFin: Date;
    ubicacion: string | null;
    lat: number | null;
    lng: number | null;
    placeId: string | null;
    activo: boolean;
  }>,
) {
  return prisma.evento.update({ where: { id }, data });
}

export async function countBeneficiosByEvento(eventoId: string) {
  return prisma.beneficio.count({
    where: { eventoId, deletedAt: null },
  });
}

export async function countCanjesByEvento(eventoId: string) {
  return prisma.reclamo.count({
    where: {
      estado: "CANJEADO",
      beneficio: { eventoId, deletedAt: null },
    },
  });
}

export async function countLocalesByEvento(eventoId: string) {
  const result = await prisma.beneficio.findMany({
    where: { eventoId, deletedAt: null },
    select: { localId: true },
    distinct: ["localId"],
  });
  return result.length;
}
