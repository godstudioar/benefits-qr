import { v4 as uuidv4 } from "uuid";
import { normalizeBeneficioTimeWindows } from "@/lib/beneficioSchedule";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";
import { buildQRPayload, generateQRDataURL } from "@/lib/qr";
import { evaluateReclamoState, getCouponBlockError } from "@/lib/couponStatus";
import {
  findReclamoForCanje,
  findReclamoForQr,
  markReclamoAsCanjeado,
  setQrToken,
} from "@/server/repositories/reclamoActionsRepository";

type ServiceError = {
  ok: false;
  status: number;
  error: string;
  code: string;
};

type QrResult =
  | {
      ok: true;
      status: number;
      qrDataURL: string;
      expiresAt: Date;
    }
  | ServiceError;

type CanjeResult =
  | {
      ok: true;
      status: number;
    }
  | ServiceError;

function getNormalizedVentanasHorarias(
  ventanasHorarias: unknown,
  diasValidos: number[],
) {
  const normalized = normalizeBeneficioTimeWindows(ventanasHorarias, diasValidos);
  return normalized.ok ? normalized.value : null;
}

export async function generateReclamoQr(
  reclamoId: string,
  clienteId: string
): Promise<QrResult> {
  const reclamo = await findReclamoForQr(reclamoId, clienteId);

  if (!reclamo) {
    return { ok: false, status: 404, error: "Reclamo no encontrado", code: "RECLAMO_NOT_FOUND" };
  }

  const reclamoState = evaluateReclamoState({
    estado: reclamo.estado,
    fechaExpiracion: reclamo.beneficio.fechaExpiracion,
    deletedAt: reclamo.beneficio.deletedAt,
    maxUsos: reclamo.beneficio.maxUsos,
    canjeados: reclamo.beneficio._count.reclamos,
    diasValidos: reclamo.beneficio.diasValidos as number[],
    ventanasHorarias: getNormalizedVentanasHorarias(
      reclamo.beneficio.ventanasHorarias,
      reclamo.beneficio.diasValidos as number[],
    ),
  });
  const ventanasHorarias = getNormalizedVentanasHorarias(
    reclamo.beneficio.ventanasHorarias,
    reclamo.beneficio.diasValidos as number[],
  );

  if (!reclamoState.canGenerateQr) {
    const error = getCouponBlockError(reclamoState.blockReason, {
      diasValidos: reclamo.beneficio.diasValidos as number[],
      context: "qr",
      ventanasHorarias,
    });

    return {
      ok: false,
      status: error!.status,
      error: error!.error,
      code: error!.code,
    };
  }

  const qrToken = uuidv4();
  const qrTokenExpira = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000);

  await setQrToken(reclamoId, qrToken, qrTokenExpira);

  const payload = buildQRPayload(reclamoId, qrToken);
  const qrDataURL = await generateQRDataURL(payload);

  return { ok: true, status: 200, qrDataURL, expiresAt: qrTokenExpira };
}

export async function canjearReclamo(
  reclamoId: string,
  qrToken: unknown,
  localId: string
): Promise<CanjeResult> {
  if (typeof qrToken !== "string" || qrToken.length === 0) {
    return { ok: false, status: 400, error: "Token QR requerido", code: "QR_TOKEN_REQUIRED" };
  }

  const reclamo = await findReclamoForCanje(reclamoId, qrToken);

  if (!reclamo) {
    return { ok: false, status: 400, error: "QR inválido", code: "QR_INVALID" };
  }

  if (reclamo.beneficio.localId !== localId) {
    return { ok: false, status: 403, error: "No autorizado", code: "FORBIDDEN" };
  }

  if (!reclamo.qrTokenExpira || reclamo.qrTokenExpira < new Date()) {
    return { ok: false, status: 400, error: "QR expirado", code: "QR_EXPIRED" };
  }

  const reclamoState = evaluateReclamoState({
    estado: reclamo.estado,
    fechaExpiracion: reclamo.beneficio.fechaExpiracion,
    deletedAt: reclamo.beneficio.deletedAt,
    maxUsos: reclamo.beneficio.maxUsos,
    canjeados: reclamo.beneficio._count.reclamos,
    diasValidos: reclamo.beneficio.diasValidos as number[],
    ventanasHorarias: getNormalizedVentanasHorarias(
      reclamo.beneficio.ventanasHorarias,
      reclamo.beneficio.diasValidos as number[],
    ),
  });
  const ventanasHorarias = getNormalizedVentanasHorarias(
    reclamo.beneficio.ventanasHorarias,
    reclamo.beneficio.diasValidos as number[],
  );

  if (!reclamoState.canRedeem) {
    const error = getCouponBlockError(reclamoState.blockReason, {
      diasValidos: reclamo.beneficio.diasValidos as number[],
      context: "redeem",
      ventanasHorarias,
    });

    return {
      ok: false,
      status: error!.status,
      error: error!.error,
      code: error!.code,
    };
  }

  await markReclamoAsCanjeado(reclamoId);

  return { ok: true, status: 200 };
}
