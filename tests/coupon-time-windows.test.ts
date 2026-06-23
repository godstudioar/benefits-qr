import test from "node:test";
import assert from "node:assert/strict";

import { normalizeBeneficioTimeWindows } from "@/lib/beneficioSchedule";
import {
  CouponBlockReason,
  evaluateBeneficioState,
  getCouponBlockMessage,
} from "@/lib/couponStatus";
import {
  createWindowDraftMap,
  serializeWindowDrafts,
  syncWindowDrafts,
  toggleSelectedWeekday,
  validateTimeWindowDrafts,
  type TimeWindowDraftMap,
} from "@/components/local/dashboard/beneficios/beneficioFormSchedule";
import { getPublicBenefitScheduleMirrorState } from "@/server/repositories/publicBenefitsScheduleMirror";

const FRIDAY_CROSS_MIDNIGHT = {
  5: { startMinute: 18 * 60, endMinute: 4 * 60 },
} as const;

test("legacy coupons keep diasValidos-only behavior", () => {
  const result = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-29T23:59:59-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [1, 3, 5],
    referenceDate: new Date("2026-06-29T08:00:00-03:00"),
  });

  assert.equal(result.canRedeemToday, true);
  assert.equal(result.redeemBlockReason, CouponBlockReason.NONE);
});

test("same-day windows block before opening and explain the next window", () => {
  const ventanasHorarias = { 5: { startMinute: 18 * 60, endMinute: 22 * 60 } };
  const referenceDate = new Date("2026-06-26T10:00:00-03:00");
  const result = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [5],
    ventanasHorarias,
    referenceDate,
  });

  assert.equal(result.canRedeemToday, false);
  assert.equal(result.redeemBlockReason, CouponBlockReason.BENEFICIO_OUTSIDE_TIME_WINDOW);
  assert.equal(
    getCouponBlockMessage(result.redeemBlockReason, { ventanasHorarias, referenceDate }),
    "Este cupón está disponible hoy de 18:00 a 22:00",
  );
});

test("cross-midnight windows stay open after midnight but the next-day coupon stays blocked", () => {
  const carryoverReferenceDate = new Date("2026-06-27T01:00:00-03:00");
  const carryoverResult = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [5],
    ventanasHorarias: FRIDAY_CROSS_MIDNIGHT,
    referenceDate: carryoverReferenceDate,
  });

  const saturdayCouponResult = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-27T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [6],
    ventanasHorarias: { 6: { startMinute: 18 * 60, endMinute: 23 * 60 } },
    referenceDate: new Date("2026-06-27T02:00:00-03:00"),
  });

  assert.equal(carryoverResult.canRedeemToday, true);
  assert.equal(carryoverResult.redeemBlockReason, CouponBlockReason.NONE);
  assert.equal(saturdayCouponResult.canRedeemToday, false);
  assert.equal(saturdayCouponResult.redeemBlockReason, CouponBlockReason.BENEFICIO_OUTSIDE_TIME_WINDOW);
});

test("final-day carryover stays valid until the configured end minute and then expires", () => {
  const beforeClose = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-27T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [6],
    ventanasHorarias: { 6: { startMinute: 20 * 60, endMinute: 2 * 60 } },
    referenceDate: new Date("2026-06-28T01:30:00-03:00"),
  });

  const afterClose = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-27T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [6],
    ventanasHorarias: { 6: { startMinute: 20 * 60, endMinute: 2 * 60 } },
    referenceDate: new Date("2026-06-28T02:01:00-03:00"),
  });

  assert.equal(beforeClose.canRedeemToday, true);
  assert.equal(afterClose.status, "VENCIDO");
  assert.equal(afterClose.redeemBlockReason, CouponBlockReason.BENEFICIO_EXPIRED);
});

test("window ending at exactly midnight stops after 00:00", () => {
  const beforeMidnight = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [5],
    ventanasHorarias: { 5: { startMinute: 18 * 60, endMinute: 0 } },
    referenceDate: new Date("2026-06-26T23:59:00-03:00"),
  });

  const afterMidnight = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [5],
    ventanasHorarias: { 5: { startMinute: 18 * 60, endMinute: 0 } },
    referenceDate: new Date("2026-06-27T00:01:00-03:00"),
  });

  assert.equal(beforeMidnight.canRedeemToday, true);
  assert.equal(afterMidnight.redeemBlockReason, CouponBlockReason.BENEFICIO_EXPIRED);
});

test("windowed coupons without an expiry-day window do not become expired on a non-valid weekday", () => {
  const result = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-23T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [3],
    ventanasHorarias: { 3: { startMinute: 18 * 60, endMinute: 22 * 60 } },
    referenceDate: new Date("2026-06-23T10:00:00-03:00"),
  });

  assert.equal(result.status, "ACTIVO");
  assert.equal(result.canRedeemToday, false);
  assert.equal(result.redeemBlockReason, CouponBlockReason.BENEFICIO_INVALID_DAY);
});

test("windowed coupons keep invalid-day semantics when today is after the last configured weekday", () => {
  const result = evaluateBeneficioState({
    fechaExpiracion: new Date("2026-06-23T00:00:00-03:00"),
    maxUsos: null,
    canjeados: 0,
    diasValidos: [1],
    ventanasHorarias: { 1: { startMinute: 18 * 60, endMinute: 22 * 60 } },
    referenceDate: new Date("2026-06-23T10:00:00-03:00"),
  });

  assert.equal(result.status, "ACTIVO");
  assert.equal(result.canRedeemToday, false);
  assert.equal(result.redeemBlockReason, CouponBlockReason.BENEFICIO_INVALID_DAY);
});

test("invalid window payloads are rejected when weekdays and windows drift", () => {
  const normalized = normalizeBeneficioTimeWindows(
    { 5: { startMinute: 600, endMinute: 600 } },
    [5],
  );
  const mismatched = normalizeBeneficioTimeWindows(
    { 5: { startMinute: 600, endMinute: 1200 } },
    [6],
  );

  assert.equal(normalized.ok, false);
  assert.equal(mismatched.ok, false);
});

test("soloHoy parity cases stay aligned with the evaluator", () => {
  const cases = [
    {
      name: "open same-day window",
      input: {
        fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
        maxUsos: null,
        canjeados: 0,
        diasValidos: [5],
        ventanasHorarias: { 5: { startMinute: 18 * 60, endMinute: 22 * 60 } },
        referenceDate: new Date("2026-06-26T19:00:00-03:00"),
      },
    },
    {
      name: "closed before opening",
      input: {
        fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
        maxUsos: null,
        canjeados: 0,
        diasValidos: [5],
        ventanasHorarias: { 5: { startMinute: 18 * 60, endMinute: 22 * 60 } },
        referenceDate: new Date("2026-06-26T10:00:00-03:00"),
      },
    },
    {
      name: "cross-midnight carryover",
      input: {
        fechaExpiracion: new Date("2026-06-26T00:00:00-03:00"),
        maxUsos: null,
        canjeados: 0,
        diasValidos: [5],
        ventanasHorarias: FRIDAY_CROSS_MIDNIGHT,
        referenceDate: new Date("2026-06-27T01:00:00-03:00"),
      },
    },
    {
      name: "next-day coupon before its own start",
      input: {
        fechaExpiracion: new Date("2026-06-27T00:00:00-03:00"),
        maxUsos: null,
        canjeados: 0,
        diasValidos: [6],
        ventanasHorarias: { 6: { startMinute: 18 * 60, endMinute: 22 * 60 } },
        referenceDate: new Date("2026-06-27T02:00:00-03:00"),
      },
    },
  ] as const;

  for (const parityCase of cases) {
    const evaluator = evaluateBeneficioState(parityCase.input);
    const repositoryMirror = getPublicBenefitScheduleMirrorState(parityCase.input);
    assert.equal(
      repositoryMirror.passesSoloHoy,
      evaluator.canRedeemToday,
      `Parity failed for ${parityCase.name}`,
    );
  }
});

test("form helper validation rejects invalid weekday/window combinations", () => {
  assert.equal(
    validateTimeWindowDrafts([5], { 5: { start: "18:00", end: "18:00" } }),
    "El horario del viernes no puede tener la misma hora de inicio y fin.",
  );
  assert.equal(validateTimeWindowDrafts([5], {}), "Completá el horario del viernes.");
});

test("form helper cleanup drops unchecked weekdays before submit serialization", () => {
  const previousDrafts: TimeWindowDraftMap = {
    5: { start: "18:00", end: "04:00" },
    6: { start: "20:00", end: "23:00" },
  };

  const nextDays = toggleSelectedWeekday([5, 6], 5);
  const nextDrafts = syncWindowDrafts(nextDays, previousDrafts);

  assert.deepEqual(nextDays, [6]);
  assert.deepEqual(nextDrafts, { 6: { start: "20:00", end: "23:00" } });
  assert.deepEqual(serializeWindowDrafts(nextDays, nextDrafts), {
    6: { startMinute: 20 * 60, endMinute: 23 * 60 },
  });
  assert.deepEqual(createWindowDraftMap({ 6: { startMinute: 20 * 60, endMinute: 23 * 60 } }), {
    6: { start: "20:00", end: "23:00" },
  });
});
