import { EstadoReclamo, MedioPago, Prisma } from "@/generated/prisma/client";
import { getCurrentISODateInArgentina } from "@/lib/argentinaTime";
import {
  hasBeneficioTimeWindows,
  normalizeBeneficioTimeWindows,
  type BeneficioTimeWindows,
} from "@/lib/beneficioSchedule";
import { prisma } from "@/lib/prisma";
import {
  countBeneficioReclamosByEstados,
  createBeneficio,
  findBeneficioEditByLocal,
  findBeneficioOwnedByLocal,
  findBeneficioOwnedByLocalForUpdate,
  findBeneficioPublicById,
  findBeneficioStatsByLocal,
  findBeneficiosByLocal,
  softDeleteBeneficioAndDeleteReclamos,
  updateBeneficioPartial,
} from "@/server/repositories/beneficiosApiRepository";

type ServiceError = {
  ok: false;
  status: number;
  error: string;
  code: string;
  message?: string;
  field?: string;
};

type BeneficioWritableInput = {
  descripcion?: unknown;
  fechaExpiracion?: unknown;
  maxUsos?: unknown;
  diasValidos?: unknown;
  ventanasHorarias?: unknown;
  esPublico?: unknown;
  mediosPago?: unknown;
  esAcumulable?: unknown;
  condicionesExtra?: unknown;
  maxUsosPorCliente?: unknown;
};

type NormalizedBeneficioInput = Partial<{
  descripcion: string;
  fechaExpiracion: Date;
  maxUsos: number | null;
  diasValidos: number[];
  ventanasHorarias: BeneficioTimeWindows | null;
  esPublico: boolean;
  mediosPago: MedioPago[];
  esAcumulable: boolean;
  condicionesExtra: string | null;
  maxUsosPorCliente: number | null;
}>;

function createServiceError(status: number, code: string, message: string, field?: string): ServiceError {
  return {
    ok: false,
    status,
    error: message,
    code,
    message,
    field,
  };
}

function hasOwnInputField(input: BeneficioWritableInput, key: keyof BeneficioWritableInput) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function normalizeDiasValidos(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (day): day is number => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6,
  );
}

function createBeneficioExpiryDate(isoDate: string, ventanasHorarias: BeneficioTimeWindows | null) {
  // Persist scheduled coupons at the start of the Argentina-local day so the
  // evaluator remains the single source of truth for final-window carryover.
  const timeSuffix = hasBeneficioTimeWindows(ventanasHorarias) ? "00:00:00" : "23:59:59";
  return new Date(`${isoDate}T${timeSuffix}-03:00`);
}

function createTimeWindowsError(code: string, message: string, field: "ventanasHorarias") {
  return createServiceError(400, code, message, field);
}

function normalizeBeneficioInput(
  input: BeneficioWritableInput,
  options?: {
    requireDescripcion?: boolean;
    requireFechaExpiracion?: boolean;
  },
): { ok: true; data: NormalizedBeneficioInput } | ServiceError {
  const normalized: NormalizedBeneficioInput = {};

  if (hasOwnInputField(input, "descripcion")) {
    if (typeof input.descripcion !== "string") {
      return createServiceError(400, "INVALID_DESCRIPCION", "Descripción inválida (máx. 40 caracteres)", "descripcion");
    }

    const descripcion = input.descripcion.trim();
    if (descripcion.length === 0 || descripcion.length > 40) {
      return createServiceError(400, "INVALID_DESCRIPCION", "Descripción inválida (máx. 40 caracteres)", "descripcion");
    }

    normalized.descripcion = descripcion;
  } else if (options?.requireDescripcion) {
    return createServiceError(400, "INVALID_DESCRIPCION", "Descripción inválida (máx. 40 caracteres)", "descripcion");
  }

  if (hasOwnInputField(input, "fechaExpiracion")) {
    if (typeof input.fechaExpiracion !== "string" || input.fechaExpiracion.length === 0) {
      return createServiceError(400, "INVALID_FECHA_EXPIRACION", "Fecha de expiración requerida", "fechaExpiracion");
    }

    const expiryDate = new Date(`${input.fechaExpiracion}T00:00:00-03:00`);
    if (Number.isNaN(expiryDate.getTime())) {
      return createServiceError(400, "INVALID_FECHA_EXPIRACION", "Fecha de expiración inválida", "fechaExpiracion");
    }

    const todayAR = getCurrentISODateInArgentina();
    if (input.fechaExpiracion < todayAR) {
      return createServiceError(
        400,
        "PAST_FECHA_EXPIRACION",
        "La fecha de expiración no puede ser anterior a hoy",
        "fechaExpiracion",
      );
    }

    normalized.fechaExpiracion = expiryDate;
  } else if (options?.requireFechaExpiracion) {
    return createServiceError(400, "INVALID_FECHA_EXPIRACION", "Fecha de expiración requerida", "fechaExpiracion");
  }

  if (hasOwnInputField(input, "maxUsos")) {
    if (input.maxUsos === null) {
      normalized.maxUsos = null;
    } else if (
      typeof input.maxUsos !== "number" ||
      !Number.isInteger(input.maxUsos) ||
      input.maxUsos < 1
    ) {
      return createServiceError(
        400,
        "INVALID_MAX_USOS",
        "La cantidad máxima de usos debe ser un número entero positivo",
        "maxUsos",
      );
    } else {
      normalized.maxUsos = input.maxUsos;
    }
  }

  if (hasOwnInputField(input, "diasValidos")) {
    normalized.diasValidos = normalizeDiasValidos(input.diasValidos);
  }

  if (hasOwnInputField(input, "ventanasHorarias")) {
    const normalizedWindows = normalizeBeneficioTimeWindows(input.ventanasHorarias, normalized.diasValidos, {
      allowCrossMidnight: false,
    });

    if (!normalizedWindows.ok) {
      return createTimeWindowsError(normalizedWindows.code, normalizedWindows.message, normalizedWindows.field);
    }

    normalized.ventanasHorarias = normalizedWindows.value;
  }

  if (hasOwnInputField(input, "esPublico")) {
    normalized.esPublico = input.esPublico === true;
  }

  if (hasOwnInputField(input, "mediosPago")) {
    const validValues = Object.values(MedioPago);
    if (!Array.isArray(input.mediosPago)) {
      return createServiceError(400, "INVALID_MEDIOS_PAGO", "Medios de pago inválidos", "mediosPago");
    }
    const filtered = input.mediosPago.filter((v): v is MedioPago => validValues.includes(v as MedioPago));
    normalized.mediosPago = Array.from(new Set(filtered));
  }

  if (hasOwnInputField(input, "esAcumulable")) {
    normalized.esAcumulable = input.esAcumulable !== false;
  }

  if (hasOwnInputField(input, "condicionesExtra")) {
    if (input.condicionesExtra === null || input.condicionesExtra === undefined) {
      normalized.condicionesExtra = null;
    } else if (typeof input.condicionesExtra !== "string") {
      return createServiceError(400, "INVALID_CONDICIONES_EXTRA", "Condiciones adicionales inválidas", "condicionesExtra");
    } else {
      const trimmed = input.condicionesExtra.trim();
      if (trimmed.length > 150) {
        return createServiceError(400, "INVALID_CONDICIONES_EXTRA", "Las condiciones adicionales no pueden superar los 150 caracteres", "condicionesExtra");
      }
      normalized.condicionesExtra = trimmed.length > 0 ? trimmed : null;
    }
  }

  if (hasOwnInputField(input, "maxUsosPorCliente")) {
    if (input.maxUsosPorCliente === null) {
      normalized.maxUsosPorCliente = null;
    } else if (
      typeof input.maxUsosPorCliente !== "number" ||
      !Number.isInteger(input.maxUsosPorCliente) ||
      input.maxUsosPorCliente < 1
    ) {
      return createServiceError(
        400,
        "INVALID_MAX_USOS_POR_CLIENTE",
        "La cantidad máxima de usos por cliente debe ser un número entero positivo",
        "maxUsosPorCliente",
      );
    } else {
      normalized.maxUsosPorCliente = input.maxUsosPorCliente;
    }
  }

  return { ok: true, data: normalized };
}

function isSerializableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function listBeneficiosByLocal(localId: string) {
  const beneficios = await findBeneficiosByLocal(localId);

  return {
    ok: true as const,
    status: 200,
    data: beneficios.map((b) => ({
      id: b.id,
      descripcion: b.descripcion,
      fechaExpiracion: b.fechaExpiracion,
      maxUsos: b.maxUsos,
      createdAt: b.createdAt,
      totalReclamos: b._count.reclamos,
      canjeados: b.reclamos.length,
    })),
  };
}

export async function createBeneficioFlow(
  localId: string,
  input: BeneficioWritableInput,
): Promise<{ ok: true; status: number; data: unknown } | ServiceError> {
  const normalized = normalizeBeneficioInput(input, {
    requireDescripcion: true,
    requireFechaExpiracion: true,
  });
  if (!normalized.ok) {
    return normalized;
  }

  const diasValidos = normalized.data.diasValidos ?? [];
  const normalizedWindows = normalizeBeneficioTimeWindows(normalized.data.ventanasHorarias ?? null, diasValidos, {
    allowCrossMidnight: false,
  });

  if (!normalizedWindows.ok) {
    return createTimeWindowsError(normalizedWindows.code, normalizedWindows.message, normalizedWindows.field);
  }

  const fechaExpiracion = createBeneficioExpiryDate(
    getCurrentISODateInArgentina(normalized.data.fechaExpiracion!),
    normalizedWindows.value,
  );

  const beneficio = await createBeneficio({
    descripcion: normalized.data.descripcion!,
    fechaExpiracion,
    maxUsos: normalized.data.maxUsos ?? null,
    diasValidos,
    ventanasHorarias: normalizedWindows.value,
    esPublico: normalized.data.esPublico ?? false,
    mediosPago: normalized.data.mediosPago ?? [],
    esAcumulable: normalized.data.esAcumulable ?? true,
    condicionesExtra: normalized.data.condicionesExtra ?? null,
    maxUsosPorCliente: normalized.data.maxUsosPorCliente ?? null,
    localId,
  });

  return { ok: true, status: 201, data: beneficio };
}

export async function getBeneficioEditPageData(id: string, localId: string) {
  const beneficio = await findBeneficioEditByLocal(id, localId);

  if (!beneficio) {
    return null;
  }

  const canjeados = beneficio.reclamos.filter((reclamo) => reclamo.estado === EstadoReclamo.CANJEADO).length;
  const activeReclamos = beneficio.reclamos.filter(
    (reclamo) => reclamo.estado === EstadoReclamo.CANJEADO || reclamo.estado === EstadoReclamo.PENDIENTE,
  ).length;
  const normalizedWindows = normalizeBeneficioTimeWindows(beneficio.ventanasHorarias, beneficio.diasValidos);

  return {
    id: beneficio.id,
    initialData: {
      descripcion: beneficio.descripcion,
      fechaExpiracion: getCurrentISODateInArgentina(beneficio.fechaExpiracion),
      maxUsos: beneficio.maxUsos,
      diasValidos: beneficio.diasValidos,
      ventanasHorarias: normalizedWindows.ok ? normalizedWindows.value : null,
      esPublico: beneficio.esPublico,
      mediosPago: beneficio.mediosPago,
      esAcumulable: beneficio.esAcumulable,
      condicionesExtra: beneficio.condicionesExtra,
      maxUsosPorCliente: beneficio.maxUsosPorCliente,
    },
    constraints: {
      canjeados,
      activeReclamos,
      maxUsos: beneficio.maxUsos,
      isUnlimited: beneficio.maxUsos === null,
    },
  };
}

export async function updateBeneficioFlow(
  localId: string,
  id: string,
  input: BeneficioWritableInput,
): Promise<{ ok: true; status: number; data: unknown } | ServiceError> {
  const normalized = normalizeBeneficioInput(input);
  if (!normalized.ok) {
    return normalized;
  }

  const runAttempt = async () => {
    return prisma.$transaction(
      async (tx) => {
        const beneficio = await findBeneficioOwnedByLocalForUpdate(tx, id, localId);

        if (!beneficio) {
          return createServiceError(404, "BENEFICIO_NOT_FOUND", "Cupón no encontrado");
        }

        const currentDiasValidos = beneficio.diasValidos as number[];
        const resolvedDiasValidos = normalized.data.diasValidos ?? currentDiasValidos;
        const resolvedWindows = normalizeBeneficioTimeWindows(
          normalized.data.ventanasHorarias === undefined ? beneficio.ventanasHorarias : normalized.data.ventanasHorarias,
          resolvedDiasValidos,
          normalized.data.ventanasHorarias === undefined
            ? undefined
            : {
                allowCrossMidnight: false,
              },
        );

        if (!resolvedWindows.ok) {
          return createTimeWindowsError(resolvedWindows.code, resolvedWindows.message, resolvedWindows.field);
        }

        if (normalized.data.ventanasHorarias !== undefined) {
          normalized.data.ventanasHorarias = resolvedWindows.value;
        }

        if (normalized.data.fechaExpiracion !== undefined || normalized.data.ventanasHorarias !== undefined) {
          const expiryIsoDate = getCurrentISODateInArgentina(
            normalized.data.fechaExpiracion ?? beneficio.fechaExpiracion,
          );
          normalized.data.fechaExpiracion = createBeneficioExpiryDate(expiryIsoDate, resolvedWindows.value);
        }

        if (
          normalized.data.fechaExpiracion &&
          getCurrentISODateInArgentina(normalized.data.fechaExpiracion) < getCurrentISODateInArgentina(beneficio.fechaExpiracion)
        ) {
          const activeReclamos = await countBeneficioReclamosByEstados(tx, id, [
            EstadoReclamo.PENDIENTE,
            EstadoReclamo.CANJEADO,
          ]);

          if (activeReclamos > 0) {
            return createServiceError(
              400,
              "ACTIVE_RECLAMOS_BLOCK_EXPIRY_SHORTEN",
              "No podés acortar la vigencia mientras existan reclamos activos o ya canjeados.",
              "fechaExpiracion",
            );
          }
        }

        if (normalized.data.maxUsos !== undefined && normalized.data.maxUsos !== null) {
          const canjeados = await countBeneficioReclamosByEstados(tx, id, [EstadoReclamo.CANJEADO]);

          if (normalized.data.maxUsos < canjeados) {
            return createServiceError(
              400,
              "MAX_USOS_BELOW_CANJEADOS",
              `No podés definir menos de ${canjeados} usos porque ya fueron canjeados.`,
              "maxUsos",
            );
          }
        }

        if (Object.keys(normalized.data).length === 0) {
          return { ok: true as const, status: 200, data: beneficio };
        }

        const updatedBeneficio = await updateBeneficioPartial(tx, id, normalized.data);
        return { ok: true as const, status: 200, data: updatedBeneficio };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  };

  try {
    return await runAttempt();
  } catch (error) {
    if (!isSerializableTransactionError(error)) {
      throw error;
    }
  }

  try {
    return await runAttempt();
  } catch (error) {
    if (isSerializableTransactionError(error)) {
      return createServiceError(500, "BENEFICIO_UPDATE_RETRY_FAILED", "No pudimos guardar el cupón. Intentá de nuevo.");
    }

    throw error;
  }
}

export async function getBeneficioById(
  id: string
): Promise<{ ok: true; status: number; data: unknown } | ServiceError> {
  const beneficio = await findBeneficioPublicById(id);

  if (!beneficio) {
    return { ok: false, status: 404, error: "Beneficio no encontrado", code: "BENEFICIO_NOT_FOUND" };
  }

  return { ok: true, status: 200, data: beneficio };
}

export async function deleteBeneficioFlow(
  id: string,
  localId: string
): Promise<{ ok: true; status: number } | ServiceError> {
  const beneficio = await findBeneficioOwnedByLocal(id, localId);

  if (!beneficio) {
    return { ok: false, status: 404, error: "Cupón no encontrado", code: "BENEFICIO_NOT_FOUND" };
  }

  await softDeleteBeneficioAndDeleteReclamos(id);

  return { ok: true, status: 200 };
}

export async function getBeneficioStats(
  id: string,
  localId: string
): Promise<{ ok: true; status: number; data: unknown } | ServiceError> {
  const beneficio = await findBeneficioStatsByLocal(id, localId);

  if (!beneficio) {
    return { ok: false, status: 404, error: "Beneficio no encontrado", code: "BENEFICIO_NOT_FOUND" };
  }

  return {
    ok: true,
    status: 200,
    data: {
      ...beneficio,
      totalReclamos: beneficio.reclamos.length,
      canjeados: beneficio.reclamos.filter((r) => r.estado === EstadoReclamo.CANJEADO).length,
      pendientes: beneficio.reclamos.filter((r) => r.estado === EstadoReclamo.PENDIENTE).length,
    },
  };
}
