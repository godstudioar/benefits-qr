import {
  findLocalById,
  findReclamosByCliente,
  updateLocalLogo,
  updateLocalProfile,
} from "@/server/repositories/localApiRepository";
import {
  optimizeImageFile,
  uploadImageToStorage,
  validateImageFile,
} from "@/server/services/imageUploadService";

const MAX_OUTPUT_LOGO_BYTES = 200 * 1024;
const LOGO_DIMENSION_STEPS = [512, 448, 384, 320, 256, 192, 160, 128, 96];

type ServiceError = {
  ok: false;
  status: number;
  error: string;
  code: string;
};

export type UploadLogoSuccess = {
  url: string;
};

export async function getLocalMeFlow(localId: string) {
  const local = await findLocalById(localId);
  if (!local) return { ok: false as const, status: 404, error: "Local no encontrado", code: "NOT_FOUND" };
  return { ok: true as const, status: 200, data: local };
}

export async function updateLocalMeFlow(
  localId: string,
  input: {
    nombre?: unknown;
    direccion?: unknown;
    lat?: unknown;
    lng?: unknown;
    placeId?: unknown;
    telefono?: unknown;
    rubroId?: unknown;
    logo?: unknown;
  }
): Promise<{ ok: true; status: number; data: unknown } | ServiceError> {
  const { nombre, direccion, lat, lng, placeId, telefono, rubroId, logo } = input;

  if (!nombre || typeof nombre !== "string" || nombre.trim() === "") {
    return { ok: false, status: 400, error: "El nombre es requerido", code: "NOMBRE_REQUIRED" };
  }

  if (nombre.trim().length > 50) {
    return { ok: false, status: 400, error: "El nombre no puede superar 50 caracteres", code: "NOMBRE_TOO_LONG" };
  }

  if (!direccion || typeof direccion !== "string" || direccion.trim() === "") {
    return { ok: false, status: 400, error: "La dirección es requerida", code: "DIRECCION_REQUIRED" };
  }

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return {
      ok: false,
      status: 400,
      error: "Seleccioná una dirección de las sugerencias",
      code: "DIRECCION_INVALIDA",
    };
  }

  if (!telefono || typeof telefono !== "string" || telefono.trim() === "") {
    return { ok: false, status: 400, error: "El teléfono es requerido", code: "TELEFONO_REQUIRED" };
  }

  if (!rubroId || typeof rubroId !== "number" || !Number.isInteger(rubroId) || rubroId <= 0) {
    return { ok: false, status: 400, error: "El rubro es requerido", code: "RUBRO_REQUIRED" };
  }

  let logoUrl: string | undefined;

  if (logo != null) {
    if (!(logo instanceof File)) {
      return { ok: false, status: 400, error: "Archivo inválido", code: "INVALID_FILE" };
    }

    const logoResult = await uploadLogoFlow(localId, logo);

    if (!logoResult.ok) {
      return logoResult;
    }

    logoUrl = logoResult.data.url;
  }

  const local = await updateLocalProfile(localId, {
    nombre: nombre.trim(),
    direccion: direccion.trim(),
    lat,
    lng,
    placeId: typeof placeId === "string" && placeId.trim() !== "" ? placeId.trim() : null,
    telefono: telefono.trim() || null,
    rubroId,
    ...(logoUrl ? { logoUrl } : {}),
  });

  return { ok: true, status: 200, data: { ok: true, local } };
}

export async function uploadLogoFlow(
  localId: string,
  file: File | null
): Promise<{ ok: true; status: number; data: UploadLogoSuccess } | ServiceError> {
  const validation = validateImageFile(file);
  if (!validation.ok) return validation;

  let optimized;
  try {
    optimized = await optimizeImageFile(validation.file, {
      dimensionSteps: LOGO_DIMENSION_STEPS,
      maxOutputBytes: MAX_OUTPUT_LOGO_BYTES,
    });
  } catch (error) {
    console.error("[upload-logo] Error al optimizar la imagen:", error);
    return {
      ok: false,
      status: 500,
      error: "No se pudo procesar la imagen. Probá nuevamente con otro archivo.",
      code: "IMAGE_PROCESSING_FAILED",
    };
  }

  const uploadResult = await uploadImageToStorage(
    optimized,
    `logos/${localId}.${optimized.extension}`,
    MAX_OUTPUT_LOGO_BYTES,
  );
  if (!uploadResult.ok) return uploadResult;

  await updateLocalLogo(localId, uploadResult.url);

  return { ok: true, status: 200, data: { url: uploadResult.url } };
}

export async function listMisBeneficiosByCliente(clienteId: string) {
  const reclamos = await findReclamosByCliente(clienteId);
  return { ok: true as const, status: 200, data: reclamos };
}
