# Design: Coupon Time Windows

## Technical Approach

Store coupon windows on `Beneficio` as nullable JSON and keep `diasValidos` as the backward-compatible weekday summary. The evaluator remains centralized in `src/lib/couponStatus.ts`: claim creation stays permissive, while QR generation, direct redeem, and merchant redeem enforce the window. Catalog SQL mirrors the same rule for `soloHoy` and ranking, with TS hydration kept as the final presentation guard.

## Architecture Decisions

| Decision | Options | Choice / Rationale |
|---|---|---|
| Persisted shape | 14 scalar columns; JSON strings; JSON minutes | Add `ventanasHorarias Json?` storing weekday-keyed minute ranges. JSON avoids schema sprawl, minute integers avoid string parsing in TS/SQL. |
| Source of truth | Replace `diasValidos`; keep both unrelated; windows derive weekdays | Keep `diasValidos` and require it to match JSON keys when windows exist. This preserves current UI/reporting and keeps legacy coupons unchanged. |
| Claim policy | Enforce windows on claim; ignore windows on claim | Keep claims permissive for MVP. Only QR/redeem flows enforce windows, matching the proposal and avoiding wallet churn. |

## Data Flow

```text
BeneficioForm/API
  -> normalizeBeneficioInput
  -> Prisma Beneficio(ventanasHorarias, diasValidos, fechaExpiracion)

Public catalog SQL / QR / redeem
  -> evaluateBeneficioState / evaluateReclamoState
  -> block reason + availability copy
```

Sequence for redeem eligibility:

```text
Route/Service -> repository fetch -> evaluator
evaluator: base status -> current-day window -> previous-day carryover -> result
result -> QR/redeem allow or block message
```

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `ventanasHorarias Json?` to `Beneficio`. |
| `prisma/migrations/*` | Create | Add nullable JSONB column without backfill. |
| `src/lib/argentinaTime.ts` | Modify | Add AR minute-of-day/date helpers for evaluator and expiry math. |
| `src/lib/beneficioSchedule.ts` | Modify | Add window formatting and payload normalization helpers. |
| `src/lib/couponStatus.ts` | Modify | Add window-aware evaluation, new block reason, carryover expiry handling. |
| `src/lib/statusPresentation.ts` | Modify | Show outside-window messaging without changing active/expired semantics. |
| `src/server/services/beneficiosApiService.ts` | Modify | Validate/persist windows and stop forcing `23:59:59` when windows exist. |
| `src/server/repositories/publicBenefitsRepository.ts` | Modify | Mirror window logic in `soloHoy`, `priority`, and ranking SQL. |
| `src/server/services/reclamosService.ts` / `reclamoActionsService.ts` | Modify | Pass window data into evaluator. |
| `src/server/repositories/*beneficio*`, `*reclamo*`, `dashboard*`, `misBeneficios*` | Modify | Select/hydrate `ventanasHorarias` where evaluator or edit UI needs it. |
| `src/components/local/dashboard/beneficios/BeneficioForm.tsx` | Modify | Add compact per-day schedule editor in the existing collapsible section. |

## Interfaces / Contracts

```ts
type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type DailyTimeWindow = {
  startMinute: number; // 0..1439
  endMinute: number;   // 0..1439, must differ from startMinute
};

type BeneficioTimeWindows = Partial<Record<WeekdayIndex, DailyTimeWindow>>;
```

Persistence rules:
- `ventanasHorarias = null` => legacy behavior (`diasValidos` only, full-day validity).
- When `ventanasHorarias` exists, its keys MUST equal normalized `diasValidos`.
- `endMinute < startMinute` means cross-midnight carryover into the next AR day.
- `endMinute === startMinute` is invalid.

Evaluation rules:
- `fechaExpiracion` remains the last scheduled AR date.
- No windows: normalize to `T23:59:59-03:00` exactly as today.
- With windows: derive the final expiration instant from the window on the AR weekday of `fechaExpiracion`; if that window crosses midnight, expiration moves to the next AR date at `endMinute`.
- A coupon is redeemable when either (a) today’s window contains `currentMinute`, or (b) yesterday’s window crossed midnight and `currentMinute < endMinute`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Window parser/validator | Minimal Vitest setup for pure helpers only. |
| Unit | Evaluator boundaries | Table-driven tests for same-day, cross-midnight, and expiry carryover. |
| Integration | Catalog parity | One repository-level assertion that `soloHoy` matches evaluator expectations for representative rows. |
| E2E | None required | Manual verification is acceptable after evaluator coverage exists. |

Minimum evaluator cases: legacy coupon, same-day window, cross-midnight open, cross-midnight closed after carryover, next-day coupon blocked before start, final-day carryover past midnight, and invalid payload rejection.

## Migration / Rollout

Add `ventanasHorarias` as nullable JSONB. No backfill is needed; existing coupons continue using `diasValidos` + end-of-day expiry. New writes may omit windows. Rollout is safe because reads treat `null` as legacy behavior.

## Open Questions

- [ ] None blocking design. The remaining implementation choice is only the exact UI density inside `BeneficioForm`, not the contract or evaluator semantics.
