import assert from "node:assert/strict";
import test from "node:test";

import {
  INVALID_MAX_USOS_MESSAGE,
  INVALID_MAX_USOS_POR_CLIENTE_MESSAGE,
  validateBeneficioFormSubmission,
} from "@/components/local/dashboard/beneficios/beneficioFormValidation";

test("beneficio form validation keeps required description and expiry checks", () => {
  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "   ",
      fechaExpiracion: "2026-07-01",
      maxUsos: "",
      maxUsosPorCliente: "",
    }),
    {
      ok: false,
      field: "descripcion",
      message: "Escribí una descripción para el cupón.",
    },
  );

  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "2x1 en café",
      fechaExpiracion: "",
      maxUsos: "",
      maxUsosPorCliente: "",
    }),
    {
      ok: false,
      field: "fechaExpiracion",
      message: "Seleccioná una fecha de expiración.",
    },
  );
});

test("beneficio form validation parses optional positive integer limits before submit", () => {
  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "20% off",
      fechaExpiracion: "2026-07-01",
      maxUsos: "15",
      maxUsosPorCliente: " 2 ",
    }),
    {
      ok: true,
      parsedMaxUsos: 15,
      parsedMaxUsosPorCliente: 2,
    },
  );

  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "20% off",
      fechaExpiracion: "2026-07-01",
      maxUsos: "",
      maxUsosPorCliente: "",
    }),
    {
      ok: true,
      parsedMaxUsos: null,
      parsedMaxUsosPorCliente: null,
    },
  );
});

test("beneficio form validation rejects non-integer or below-min numeric payloads", () => {
  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "20% off",
      fechaExpiracion: "2026-07-01",
      maxUsos: "0",
      maxUsosPorCliente: "",
    }),
    {
      ok: false,
      field: "maxUsos",
      message: INVALID_MAX_USOS_MESSAGE,
    },
  );

  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "20% off",
      fechaExpiracion: "2026-07-01",
      maxUsos: "",
      maxUsosPorCliente: "1.5",
    }),
    {
      ok: false,
      field: "maxUsosPorCliente",
      message: INVALID_MAX_USOS_POR_CLIENTE_MESSAGE,
    },
  );

  assert.deepEqual(
    validateBeneficioFormSubmission({
      descripcion: "20% off",
      fechaExpiracion: "2026-07-01",
      maxUsos: "1e2",
      maxUsosPorCliente: "",
    }),
    {
      ok: false,
      field: "maxUsos",
      message: INVALID_MAX_USOS_MESSAGE,
    },
  );
});
