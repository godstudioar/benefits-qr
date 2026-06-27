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

export type CanjeadosPorLocal = {
  localId: string;
  nombre: string | null;
  canjeados: number;
};

export async function getCanjeadosPorLocalByEvento(
  eventoId: string,
): Promise<CanjeadosPorLocal[]> {
  return prisma.$queryRaw<CanjeadosPorLocal[]>`
    SELECT
      l.id AS "localId",
      l.nombre,
      COUNT(r.id)::int AS canjeados
    FROM "Local" l
    JOIN "Beneficio" b ON b."localId" = l.id
    JOIN "Reclamo" r ON r."beneficioId" = b.id AND r.estado = 'CANJEADO'
    WHERE b."eventoId" = ${eventoId}
      AND b."deletedAt" IS NULL
    GROUP BY l.id, l.nombre
    ORDER BY canjeados DESC, l.nombre ASC
  `;
}

export async function countEventoPageviewVisitors(slug: string): Promise<number> {
  const path = `/eventos/${slug}`;
  const [result] = await prisma.$queryRaw<[{ visitantes: number }]>`
    SELECT COUNT(DISTINCT "visitorHash")::int AS visitantes
    FROM "SitePageview"
    WHERE path = ${path}
  `;
  return result?.visitantes ?? 0;
}

export async function findBeneficioIdsByEvento(eventoId: string) {
  return prisma.beneficio.findMany({
    where: { eventoId, deletedAt: null },
    select: { id: true },
  });
}

export async function unsetEventoAndExpireBeneficios(beneficioIds: string[]) {
  if (beneficioIds.length === 0) return;
  const now = new Date();
  await prisma.beneficio.updateMany({
    where: { id: { in: beneficioIds } },
    data: {
      eventoId: null,
      fechaExpiracion: now,
      esPublico: false,
    },
  });
}

export async function deleteEventoById(eventoId: string) {
  return prisma.evento.delete({ where: { id: eventoId } });
}
