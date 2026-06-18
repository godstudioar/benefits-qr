import { createSession } from "@/lib/auth";
import { SESSION_DURATION } from "@/lib/constants";
import { EstadoReclamo } from "@/generated/prisma/client";
import { evaluateBeneficioState, getCouponBlockError } from "@/lib/couponStatus";
import { UserType } from "@/lib/enums";
import { buildOrderNumberFromReclamoId } from "@/lib/orderNumber";
import { prisma } from "@/lib/prisma";
import {
  countReclamosByClienteForBeneficio,
  createClienteAnonimo,
  createReclamo,
  findBeneficioForReclamo,
  findClienteById,
  findExistingReclamo,
  findExistingReclamoPendiente,
  updateCliente,
} from "@/server/repositories/reclamosRepository";

function getEffectiveMaxUsosPorCliente(maxUsosPorCliente: number | null | undefined): number {
  return maxUsosPorCliente ?? 1;
}

function normalizeNombreCompleto(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0 || normalized.length > 100) return null;

  return normalized;
}

function hasNombreCompleto(value: unknown): boolean {
  if (typeof value !== "string") return false;

  return value.trim().length > 0;
}

export async function ensureReclamoForCliente(
  beneficioId: string,
  clienteId: string
): Promise<void> {
  const beneficio = await findBeneficioForReclamo(beneficioId);
  if (!beneficio) return;

  const beneficioState = evaluateBeneficioState({
    fechaExpiracion: beneficio.fechaExpiracion,
    deletedAt: null,
    maxUsos: beneficio.maxUsos,
    canjeados: beneficio.reclamos.length,
    diasValidos: beneficio.diasValidos as number[],
  });

  if (!beneficioState.canClaim) return;

  const existingReclamo = await findExistingReclamo(beneficioId, clienteId);
  if (existingReclamo) return;

  await createReclamo(beneficioId, clienteId);
}

type CreateAnonymousReclamoResult =
  | { ok: true; status: number; reclamoId: string; sessionToken: string | null }
  | { ok: false; status: number; error: string; code: string };

type AnonymousNombreRequirementResult =
  | { ok: true; requiresNombre: boolean }
  | { ok: false; status: number; error: string; code: string };

type DirectRedeemResult =
  | {
      ok: true;
      status: number;
      reclamoId: string;
      orderNumber: string;
      alreadyRedeemed: boolean;
    }
  | { ok: false; status: number; error: string; code: string };

type AnonymousDirectRedeemResult =
  | {
      ok: true;
      status: number;
      reclamoId: string;
      orderNumber: string;
      alreadyRedeemed: boolean;
      sessionToken: string | null;
    }
  | { ok: false; status: number; error: string; code: string };

type ReclamosTxClient = Pick<typeof prisma, "$executeRaw" | "beneficio" | "reclamo" | "cliente">;

class DirectRedeemFailure extends Error {
  payload: { ok: false; status: number; error: string; code: string };

  constructor(payload: { ok: false; status: number; error: string; code: string }) {
    super(payload.code);
    this.payload = payload;
  }
}

async function redeemBeneficioDirectForClienteTx(
  tx: ReclamosTxClient,
  beneficioId: string,
  clienteId: string
): Promise<DirectRedeemResult> {
  const lockKey = `direct_redeem:${beneficioId}:${clienteId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const beneficio = await tx.beneficio.findUnique({
    where: { id: beneficioId },
    include: {
      reclamos: { where: { estado: EstadoReclamo.CANJEADO }, select: { id: true } },
    },
  });

  if (!beneficio || beneficio.deletedAt !== null) {
    return { ok: false, status: 404, error: "Cupón no encontrado", code: "BENEFICIO_NOT_FOUND" };
  }

  const beneficioState = evaluateBeneficioState({
    fechaExpiracion: beneficio.fechaExpiracion,
    deletedAt: beneficio.deletedAt,
    maxUsos: beneficio.maxUsos,
    canjeados: beneficio.reclamos.length,
    diasValidos: beneficio.diasValidos as number[],
  });

  if (!beneficioState.canRedeemToday) {
    const error = getCouponBlockError(beneficioState.redeemBlockReason, {
      diasValidos: beneficio.diasValidos as number[],
      context: "redeem",
    });
    if (!error) {
      return { ok: false, status: 400, error: "Este cupón no está disponible", code: "INVALID_COUPON" };
    }
    return { ok: false, status: error.status, error: error.error, code: error.code };
  }

  const existingReclamo = await tx.reclamo.findFirst({
    where: { beneficioId, clienteId },
    orderBy: { fechaReclamo: "desc" },
  });

  if (existingReclamo?.estado === EstadoReclamo.CANJEADO) {
    const effectiveMax = getEffectiveMaxUsosPorCliente(beneficio.maxUsosPorCliente);
    const usosCliente = await tx.reclamo.count({
      where: {
        beneficioId,
        clienteId,
        estado: { in: [EstadoReclamo.PENDIENTE, EstadoReclamo.CANJEADO] },
      },
    });
    if (usosCliente >= effectiveMax) {
      return {
        ok: true,
        status: 200,
        reclamoId: existingReclamo.id,
        orderNumber: buildOrderNumberFromReclamoId(existingReclamo.id),
        alreadyRedeemed: true,
      };
    }
  }

  if (existingReclamo?.estado === EstadoReclamo.CANCELADO) {
    return {
      ok: false,
      status: 409,
      error: "Este cupón ya no está disponible",
      code: "RECLAMO_CANCELLED",
    };
  }

  if (existingReclamo?.estado === EstadoReclamo.PENDIENTE) {
    await tx.reclamo.update({
      where: { id: existingReclamo.id },
      data: {
        estado: EstadoReclamo.CANJEADO,
        fechaCanje: new Date(),
        qrToken: null,
        qrTokenExpira: null,
      },
    });

    return {
      ok: true,
      status: 200,
      reclamoId: existingReclamo.id,
      orderNumber: buildOrderNumberFromReclamoId(existingReclamo.id),
      alreadyRedeemed: false,
    };
  }

  const reclamo = await tx.reclamo.create({
    data: { beneficioId, clienteId },
  });
  await tx.reclamo.update({
    where: { id: reclamo.id },
    data: {
      estado: EstadoReclamo.CANJEADO,
      fechaCanje: new Date(),
      qrToken: null,
      qrTokenExpira: null,
    },
  });

  return {
    ok: true,
    status: 201,
    reclamoId: reclamo.id,
    orderNumber: buildOrderNumberFromReclamoId(reclamo.id),
    alreadyRedeemed: false,
  };
}

export async function getAnonymousNombreRequirement(
  beneficioId: unknown,
  existingClienteId: string | null
): Promise<AnonymousNombreRequirementResult> {
  if (!beneficioId || typeof beneficioId !== "string") {
    return { ok: false, status: 400, error: "Cupón inválido", code: "INVALID_BENEFICIO_ID" };
  }

  const beneficio = await findBeneficioForReclamo(beneficioId);
  if (!beneficio) {
    return { ok: false, status: 404, error: "Cupón no encontrado", code: "BENEFICIO_NOT_FOUND" };
  }

  if (!existingClienteId) {
    return { ok: true, requiresNombre: true };
  }

  const cliente = await findClienteById(existingClienteId);
  return { ok: true, requiresNombre: !hasNombreCompleto(cliente?.nombre) };
}

export async function createAnonymousReclamoFlow(
  beneficioId: unknown,
  existingClienteId: string | null,
  nombre: unknown
): Promise<CreateAnonymousReclamoResult> {
  const normalizedNombre = normalizeNombreCompleto(nombre);

  if (!beneficioId || typeof beneficioId !== "string") {
    return { ok: false, status: 400, error: "Cupón inválido", code: "INVALID_BENEFICIO_ID" };
  }

  const beneficio = await findBeneficioForReclamo(beneficioId);

  if (!beneficio) {
    return { ok: false, status: 404, error: "Cupón no encontrado", code: "BENEFICIO_NOT_FOUND" };
  }

  const beneficioState = evaluateBeneficioState({
    fechaExpiracion: beneficio.fechaExpiracion,
    deletedAt: null,
    maxUsos: beneficio.maxUsos,
    canjeados: beneficio.reclamos.length,
    diasValidos: beneficio.diasValidos as number[],
  });

  if (!beneficioState.canClaim) {
    const error = getCouponBlockError(beneficioState.claimBlockReason, {
      diasValidos: beneficio.diasValidos as number[],
      context: "claim",
    });
    return { ok: false, status: error!.status, error: error!.error, code: error!.code };
  }

  if (existingClienteId) {
    const cliente = await findClienteById(existingClienteId);
    if (!cliente) {
      return { ok: false, status: 401, error: "Sesión inválida", code: "INVALID_SESSION" };
    }

    const needsNombre = !hasNombreCompleto(cliente.nombre);
    if (needsNombre && !normalizedNombre) {
      return {
        ok: false,
        status: 400,
        error: "Ingresá tu nombre para generar el QR",
        code: "NOMBRE_REQUIRED",
      };
    }

    if (needsNombre && normalizedNombre) {
      await updateCliente(existingClienteId, { nombre: normalizedNombre });
    }

    const existingReclamo = await findExistingReclamoPendiente(beneficioId, existingClienteId);
    if (existingReclamo) {
      return { ok: true, status: 200, reclamoId: existingReclamo.id, sessionToken: null };
    }

    const effectiveMax = getEffectiveMaxUsosPorCliente(beneficio.maxUsosPorCliente);
    const usosCliente = await countReclamosByClienteForBeneficio(beneficioId, existingClienteId);
    if (usosCliente >= effectiveMax) {
      return {
        ok: false,
        status: 409,
        error: effectiveMax === 1
          ? "Ya canjeaste este cupón"
          : `Ya usaste este cupón el máximo de veces permitido (${effectiveMax})`,
        code: usosCliente >= 1 && effectiveMax === 1 ? "RECLAMO_ALREADY_REDEEMED" : "MAX_USOS_POR_CLIENTE_REACHED",
      };
    }

    const reclamo = await createReclamo(beneficioId, existingClienteId);
    return { ok: true, status: 201, reclamoId: reclamo.id, sessionToken: null };
  }

  if (!normalizedNombre) {
    return {
      ok: false,
      status: 400,
      error: "Ingresá tu nombre para generar el QR",
      code: "NOMBRE_REQUIRED",
    };
  }

  const cliente = await createClienteAnonimo({ nombre: normalizedNombre });
  const session = await createSession(cliente.id, UserType.CLIENTE, SESSION_DURATION.CLIENTE_RECLAMO);
  const reclamo = await createReclamo(beneficioId, cliente.id);

  return { ok: true, status: 201, reclamoId: reclamo.id, sessionToken: session.token };
}

export async function redeemBeneficioDirectForCliente(
  beneficioId: unknown,
  clienteId: string
): Promise<DirectRedeemResult> {
  if (!beneficioId || typeof beneficioId !== "string") {
    return { ok: false, status: 400, error: "Cupón inválido", code: "INVALID_BENEFICIO_ID" };
  }
  return prisma.$transaction((tx) =>
    redeemBeneficioDirectForClienteTx(tx, beneficioId, clienteId)
  );
}

export async function redeemAnonymousDirectFlow(
  beneficioId: unknown,
  existingClienteId: string | null,
  nombre: unknown
): Promise<AnonymousDirectRedeemResult> {
  const normalizedNombre = normalizeNombreCompleto(nombre);
  if (!beneficioId || typeof beneficioId !== "string") {
    return { ok: false, status: 400, error: "Cupón inválido", code: "INVALID_BENEFICIO_ID" };
  }

  if (existingClienteId) {
    const cliente = await findClienteById(existingClienteId);
    if (!cliente) {
      return { ok: false, status: 401, error: "Sesión inválida", code: "INVALID_SESSION" };
    }

    const needsNombre = !hasNombreCompleto(cliente.nombre);
    if (needsNombre && !normalizedNombre) {
      return {
        ok: false,
        status: 400,
        error: "Ingresá tu nombre para continuar el canje",
        code: "NOMBRE_REQUIRED",
      };
    }

    if (needsNombre && normalizedNombre) {
      await updateCliente(existingClienteId, { nombre: normalizedNombre });
    }

    const directResult = await redeemBeneficioDirectForCliente(beneficioId, existingClienteId);
    if (!directResult.ok) {
      return directResult;
    }

    return { ...directResult, sessionToken: null };
  }

  if (!normalizedNombre) {
    return {
      ok: false,
      status: 400,
      error: "Ingresá tu nombre para continuar el canje",
      code: "NOMBRE_REQUIRED",
    };
  }
  try {
    const directResult = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({ data: { nombre: normalizedNombre } });
      const result = await redeemBeneficioDirectForClienteTx(tx, beneficioId, cliente.id);
      if (!result.ok) {
        throw new DirectRedeemFailure(result);
      }

      return { clienteId: cliente.id, result };
    });

    const session = await createSession(
      directResult.clienteId,
      UserType.CLIENTE,
      SESSION_DURATION.CLIENTE_RECLAMO
    );

    return { ...directResult.result, sessionToken: session.token };
  } catch (error) {
    if (error instanceof DirectRedeemFailure) {
      return error.payload;
    }
    throw error;
  }
}
