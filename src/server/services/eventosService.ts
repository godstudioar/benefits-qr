import {
  createEvento,
  findAllEventos,
  findEventoById,
  findEventoBySlug,
  findEventosActivosFuturos,
  findEventosActivosSeleccionables,
  updateEvento,
  countBeneficiosByEvento,
  countCanjesByEvento,
  countLocalesByEvento,
  getCanjeadosPorLocalByEvento,
  countEventoPageviewVisitors,
} from "@/server/repositories/eventosRepository";
import { prisma } from "@/lib/prisma";
import {
  optimizeImageFile,
  uploadImageToStorage,
  validateImageFile,
} from "@/server/services/imageUploadService";

const MAX_OUTPUT_EVENT_IMAGE_BYTES = 500 * 1024;
const EVENT_IMAGE_DIMENSION_STEPS = [1200, 1024, 800, 640, 512, 384];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type EventoInput = {
  nombre?: string;
  descripcion?: string | null;
  imageUrl?: string | null;
  fechaInicio?: string;
  fechaFin?: string;
  ubicacion?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  activo?: boolean;
};

export async function listAllEventos() {
  const eventos = await findAllEventos();
  const enriched = await Promise.all(
    eventos.map(async (e) => {
      const [canjeados, canjeadosPorLocal, visitantesEvento] = await Promise.all([
        countCanjesByEvento(e.id),
        getCanjeadosPorLocalByEvento(e.id),
        countEventoPageviewVisitors(e.slug),
      ]);
      return { ...e, canjeados, canjeadosPorLocal, visitantesEvento };
    }),
  );
  return enriched;
}

export async function listEventosActivosFuturos() {
  const eventos = await findEventosActivosFuturos();
  const enriched = await Promise.all(
    eventos.map(async (e) => {
      const localesCount = await countLocalesByEvento(e.id);
      return { ...e, localesCount };
    }),
  );
  return enriched;
}

export async function listEventosSeleccionables() {
  return findEventosActivosSeleccionables();
}

export async function getEventoBySlug(slug: string) {
  const evento = await findEventoBySlug(slug);
  if (!evento || !evento.activo) return null;

  const [beneficiosCount, localesCount] = await Promise.all([
    countBeneficiosByEvento(evento.id),
    countLocalesByEvento(evento.id),
  ]);

  return { ...evento, beneficiosCount, localesCount };
}

export async function createEventoFlow(input: EventoInput) {
  if (!input.nombre?.trim()) {
    return { ok: false as const, status: 400, error: "El nombre es requerido." };
  }
  if (!input.fechaInicio || !input.fechaFin) {
    return { ok: false as const, status: 400, error: "Las fechas son requeridas." };
  }

  const fechaInicio = new Date(input.fechaInicio);
  const fechaFin = new Date(input.fechaFin);

  if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    return { ok: false as const, status: 400, error: "Fechas inválidas." };
  }
  if (fechaFin < fechaInicio) {
    return { ok: false as const, status: 400, error: "La fecha fin debe ser posterior a la fecha inicio." };
  }

  const slug = slugify(input.nombre.trim());
  const existing = await findEventoBySlug(slug);
  if (existing) {
    return { ok: false as const, status: 400, error: "Ya existe un evento con ese nombre/slug." };
  }

  const evento = await createEvento({
    nombre: input.nombre.trim(),
    slug,
    descripcion: input.descripcion?.trim() || null,
    imageUrl: input.imageUrl || null,
    fechaInicio,
    fechaFin,
    ubicacion: input.ubicacion?.trim() || null,
    lat: typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null,
    lng: typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null,
    placeId: typeof input.placeId === "string" && input.placeId.trim() ? input.placeId.trim() : null,
  });

  return { ok: true as const, status: 201, data: evento };
}

export async function updateEventoFlow(id: string, input: EventoInput) {
  const evento = await findEventoById(id);
  if (!evento) {
    return { ok: false as const, status: 404, error: "Evento no encontrado." };
  }

  const updates: Parameters<typeof updateEvento>[1] = {};

  if (input.nombre !== undefined && input.nombre.trim()) {
    updates.nombre = input.nombre.trim();
    const newSlug = slugify(input.nombre.trim());
    if (newSlug !== evento.slug) {
      const existing = await findEventoBySlug(newSlug);
      if (existing && existing.id !== id) {
        return { ok: false as const, status: 400, error: "Ya existe un evento con ese slug." };
      }
      updates.slug = newSlug;
    }
  }

  if (input.descripcion !== undefined) updates.descripcion = input.descripcion?.trim() || null;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl || null;
  if (input.ubicacion !== undefined) updates.ubicacion = input.ubicacion?.trim() || null;
  if (input.lat !== undefined) updates.lat = typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null;
  if (input.lng !== undefined) updates.lng = typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null;
  if (input.placeId !== undefined) updates.placeId = typeof input.placeId === "string" && input.placeId.trim() ? input.placeId.trim() : null;
  if (input.activo !== undefined) updates.activo = input.activo;

  if (input.fechaInicio) {
    const d = new Date(input.fechaInicio);
    if (!isNaN(d.getTime())) updates.fechaInicio = d;
  }
  if (input.fechaFin) {
    const d = new Date(input.fechaFin);
    if (!isNaN(d.getTime())) updates.fechaFin = d;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true as const, status: 200, data: evento };
  }

  const updated = await updateEvento(id, updates);
  return { ok: true as const, status: 200, data: updated };
}

export async function uploadEventoImageFlow(
  eventoId: string,
  file: File | null,
): Promise<{ ok: true; status: number; data: { url: string } } | { ok: false; status: number; error: string; code: string }> {
  const evento = await findEventoById(eventoId);
  if (!evento) {
    return { ok: false, status: 404, error: "Evento no encontrado.", code: "EVENTO_NOT_FOUND" };
  }

  const validation = validateImageFile(file);
  if (!validation.ok) return validation;

  let optimized;
  try {
    optimized = await optimizeImageFile(validation.file, {
      dimensionSteps: EVENT_IMAGE_DIMENSION_STEPS,
      maxOutputBytes: MAX_OUTPUT_EVENT_IMAGE_BYTES,
    });
  } catch (error) {
    console.error("[upload-evento-image] Error al optimizar la imagen:", error);
    return {
      ok: false,
      status: 500,
      error: "No se pudo procesar la imagen.",
      code: "IMAGE_PROCESSING_FAILED",
    };
  }

  const uploadResult = await uploadImageToStorage(
    optimized,
    `eventos/${eventoId}.${optimized.extension}`,
    MAX_OUTPUT_EVENT_IMAGE_BYTES,
  );
  if (!uploadResult.ok) return uploadResult;

  await updateEvento(eventoId, { imageUrl: uploadResult.url });

  return { ok: true, status: 200, data: { url: uploadResult.url } };
}

export async function deleteEventoFlow(eventoId: string) {
  const evento = await findEventoById(eventoId);
  if (!evento) {
    return { ok: false as const, status: 404, error: "Evento no encontrado." };
  }

  await prisma.$transaction(async (tx) => {
    const beneficios = await tx.beneficio.findMany({
      where: { eventoId, deletedAt: null },
      select: { id: true },
    });

    if (beneficios.length > 0) {
      const ids = beneficios.map((b) => b.id);
      await tx.beneficio.updateMany({
        where: { id: { in: ids } },
        data: {
          eventoId: null,
          fechaExpiracion: new Date(),
          esPublico: false,
        },
      });
    }

    await tx.evento.delete({ where: { id: eventoId } });
  });

  return { ok: true as const, status: 200, data: { id: eventoId, slug: evento.slug } };
}
