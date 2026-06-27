# Tasks: Coupon Time Windows

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Resolved by chained delivery
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Persist and evaluate schedule windows safely | PR 1 | Foundation + evaluator + pure helper tests. |
| 2 | Wire catalog/UI/redeem paths to the shared rules | PR 2 | Repository, services, form, and integration checks. |

## Phase 1: Foundation

- [x] 1.1 Add nullable `ventanasHorarias` to `prisma/schema.prisma` and create the no-backfill migration.
- [x] 1.2 Add AR time helpers in `src/lib/argentinaTime.ts` and a schedule-normalization helper in `src/lib/beneficioSchedule.ts`.
- [x] 1.3 Define the shared minute-based window contract and validation rules in the new helper module.

## Phase 2: Core Evaluation

- [x] 2.1 Update `src/lib/couponStatus.ts` to enforce weekday windows, cross-midnight carryover, and `BENEFICIO_OUTSIDE_TIME_WINDOW`.
- [x] 2.2 Stop truncating scheduled coupons to `23:59:59` in `src/server/services/beneficiosApiService.ts` when windows exist.
- [x] 2.3 Pass window data through `src/server/services/reclamosService.ts` and `src/server/services/reclamoActionsService.ts` so QR/redeem checks stay centralized.

## Phase 3: Integration / Wiring

- [x] 3.1 Mirror the schedule rules in `src/server/repositories/publicBenefitsRepository.ts` for `soloHoy` filtering and ranking.
- [x] 3.2a Hydrate `ventanasHorarias` in the claim/QR/redeem/public-catalog repository and service paths that feed the evaluator for backend behavior parity.
- [x] 3.2b Hydrate `ventanasHorarias` in the remaining benefit/dashboard/editor queries used by management views.
- [x] 3.3 Extend `src/components/local/dashboard/beneficios/BeneficioForm.tsx` with per-weekday schedule inputs that stay in sync with `diasValidos`.

## Phase 4: Testing / Verification

- [x] 4.1 Add practical regression tests for evaluator/helper behavior in-repo via `node:test` + `tsx`, covering legacy coupons, same-day windows, cross-midnight windows, midnight boundary, and final-day expiration carryover.
- [x] 4.2 Add repository-parity checks for representative `soloHoy` open/closed and carryover scenarios using a committed SQL-mirror helper.
- [x] 4.3 Encode form behavior for invalid weekday/window combinations and unchecked-day cleanup through extracted pure helpers and regression tests.

## Phase 5: Cleanup / Documentation

- [x] 5.1 Add the minimal inline comments/copy updates needed to explain Argentina-local final-window semantics and the permissive claim MVP.
- [x] 5.2 Confirm the remaining expiry normalization paths only use `23:59:59` for legacy coupons without windows and keep windowed coupons anchored at start-of-day for evaluator-derived expiry.
