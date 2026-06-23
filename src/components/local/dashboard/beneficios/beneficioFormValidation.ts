export const INVALID_MAX_USOS_MESSAGE = "Ingresá un máximo de usos válido (entero mayor o igual a 1).";
export const INVALID_MAX_USOS_POR_CLIENTE_MESSAGE =
  "Ingresá un máximo de usos por cliente válido (entero mayor o igual a 1).";

export type BeneficioFormFieldErrorKey =
  | "descripcion"
  | "fechaExpiracion"
  | "maxUsos"
  | "condicionesExtra"
  | "maxUsosPorCliente"
  | "ventanasHorarias";

type BeneficioFormValidationResult =
  | {
      ok: true;
      parsedMaxUsos: number | null;
      parsedMaxUsosPorCliente: number | null;
    }
  | {
      ok: false;
      field: BeneficioFormFieldErrorKey;
      message: string;
    };

type NumericValidationResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

function validateOptionalPositiveInteger(value: string, message: string): NumericValidationResult {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return { ok: true, value: null };
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return { ok: false, message };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    return { ok: false, message };
  }

  return { ok: true, value: parsedValue };
}

export function validateBeneficioFormSubmission(input: {
  descripcion: string;
  fechaExpiracion: string;
  maxUsos: string;
  maxUsosPorCliente: string;
}): BeneficioFormValidationResult {
  if (!input.descripcion.trim()) {
    return {
      ok: false,
      field: "descripcion",
      message: "Escribí una descripción para el cupón.",
    };
  }

  if (!input.fechaExpiracion) {
    return {
      ok: false,
      field: "fechaExpiracion",
      message: "Seleccioná una fecha de expiración.",
    };
  }

  const maxUsosValidation = validateOptionalPositiveInteger(input.maxUsos, INVALID_MAX_USOS_MESSAGE);

  if (!maxUsosValidation.ok) {
    return {
      ok: false,
      field: "maxUsos",
      message: maxUsosValidation.message,
    };
  }

  const maxUsosPorClienteValidation = validateOptionalPositiveInteger(
    input.maxUsosPorCliente,
    INVALID_MAX_USOS_POR_CLIENTE_MESSAGE,
  );

  if (!maxUsosPorClienteValidation.ok) {
    return {
      ok: false,
      field: "maxUsosPorCliente",
      message: maxUsosPorClienteValidation.message,
    };
  }

  return {
    ok: true,
    parsedMaxUsos: maxUsosValidation.value,
    parsedMaxUsosPorCliente: maxUsosPorClienteValidation.value,
  };
}
