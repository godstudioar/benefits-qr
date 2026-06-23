## Exploration: coupon-time-windows

> Add time-of-day availability windows to coupons so late-night businesses (bars, pubs, bowling alleys) can keep a coupon alive past midnight and only activate the next-day coupon when the business actually reopens — not at 00:00:00 sharp.

### Current State

Qupon coupons currently support only **day-level** redemption rules:

- `Beneficio.fechaExpiracion` (`DateTime`) — the absolute expiry timestamp. `normalizeBeneficioInput` hardcodes it to `YYYY-MM-DDT23:59:59-03:00`, so a coupon always dies at end-of-calendar-day in the Argentina timezone.
- `Beneficio.diasValidos` (`Int[]`, 0=Sun..6=Sat, empty = all days) — the only weekday filter. Empty means "every day".
- No time-of-day fields exist on `Beneficio` or `Reclamo`.

The single rule engine is `evaluateBeneficioState` in `src/lib/couponStatus.ts`. It derives `isWrongDay` from `getCurrentDayInArgentina(referenceDate)` via `Intl.DateTimeFormat` with `timeZone: America/Argentina/Buenos_Aires`. Two outcomes flow from it:

| Outcome | Checks applied | Used by |
|---|---|---|
| `canClaim` | deleted / expired / agotado (NO weekday check) | `reclamosService.createAnonymousReclamoFlow`, `createReclamoFlow` |
| `canRedeemToday` | deleted / expired / agotado / wrong-day | `reclamoActionsService.canjearReclamo`, `generateReclamoQr` |

**The midnight edge case (the actual user pain):** at exactly `00:00:00` Saturday, `getCurrentDayInArgentina` returns `6`. A Friday coupon (`diasValidos=[5]`) instantly flips to `isWrongDay=true` mid-shift, and a Saturday coupon (`diasValidos=[6]`) instantly becomes redeemable. A bar open until 04:00 loses its Friday promotion while the staff is still serving customers, and the Saturday promotion activates in the middle of the Friday-night crowd. The `fechaExpiracion = 23:59:59` hardcode makes this worse: the Friday coupon also crosses the `isExpired` threshold for any date that lands on Friday.

The public catalog (`publicBenefitsRepository.ts`) mirrors the same weekday logic in raw SQL via `EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int = ANY(b."diasValidos")` in four places, and the catalog is wrapped in `unstable_cache(..., { revalidate: 60 })`. Any time-window-aware filter must tolerate up to 60s of staleness in the cached catalog.

### Affected Areas

| File | Why it's affected |
|---|---|
| `prisma/schema.prisma` | `Beneficio` needs new time-window columns (or a `Json` field); `Reclamo` may need to snapshot the window at claim time. |
| `src/lib/couponStatus.ts` | `evaluateBeneficioState` / `evaluateReclamoState` need a new `isWrongTime` (or merged `isOutsideWindow`) branch; new `CouponBlockReason` value; new block message. |
| `src/lib/argentinaTime.ts` | Add a helper to get the current time-of-day in AR (minutes since midnight) so cross-midnight math is centralized. |
| `src/lib/beneficioSchedule.ts` | Add window formatting helpers (e.g. `formatVentanaHoraria`) for the form summary and error copy. |
| `src/server/services/beneficiosApiService.ts` | `normalizeBeneficioInput` must validate the new time-window input; `T23:59:59` hardcode must become conditional on whether windows are set. |
| `src/server/services/reclamoActionsService.ts` | `generateReclamoQr` and `canjearReclamo` pass new fields into `evaluateReclamoState`. |
| `src/server/services/reclamosService.ts` | `createAnonymousReclamoFlow` and `createReclamoFlow` pass new fields into `evaluateBeneficioState` (`canClaim` may need to start respecting time windows too — policy decision). |
| `src/server/services/publicBenefitsService.ts` | Hydrates catalog rows; will need to attach window metadata so the card can show "Hoy 18:00–04:00". |
| `src/server/services/dashboardService.ts`, `beneficioDetailService.ts`, `misBeneficiosService.ts`, `dashboardStatsService.ts` | All call `evaluateBeneficioState` and must forward the new fields. |
| `src/server/repositories/publicBenefitsRepository.ts` | The `soloHoy` raw-SQL filter and the `sortRank`/`priority` CASE expressions currently only check DOW. Must add a parallel time-of-day predicate OR delegate time filtering to the TS layer post-fetch (cache-tolerance tradeoff). |
| `src/components/local/dashboard/beneficios/BeneficioForm.tsx` | Needs new UI for per-day time windows (time pickers, optional per weekday, cross-midnight indicator). Currently has only weekday chips + a date picker. |
| Display components showing "valid today" badges | Will need to render the active window (e.g. "Hoy de 18:00 a 04:00"). |

### Approaches

#### 1. Single `horaExpiracion` field (one time-of-day expiry per coupon)

Add a nullable `horaExpiracion` (`String` "HH:mm" or `Int` minutes) to `Beneficio`. When set, the coupon expires at `horaExpiracion` Argentina time each day instead of `23:59:59`. No per-weekday variation.

| Aspect | Detail |
|---|---|
| Pros | Minimal schema (1 column); minimal UI (one time picker); minimal rule-engine change (`isExpired` becomes time-of-day-aware). |
| Cons | Does NOT solve the user's scenario. A single expiry time cannot express "Friday coupon valid Fri 18:00 → Sat 04:00" — that requires per-day start AND end, with cross-midnight. It only answers "when does today's coupon die", not "when does tomorrow's coupon activate". A bar with different close times per weekday cannot model that either. |
| Effort | Low — but effort-to-value is poor because it fails the actual use case. |

#### 2. Per-weekday time windows with cross-midnight support (recommended)

Add a nullable JSON field on `Beneficio` (e.g. `ventanasHorarias Json?`) shaped as a map keyed by weekday `0..6`, each entry `{ start: "HH:mm", end: "HH:mm" }` (or `null` for "all day that day"). `end < start` means the window crosses midnight into the next weekday (e.g. Friday `start=18:00, end=04:00` means the Friday coupon is redeemable Fri 18:00 → Sat 04:00).

| Aspect | Detail |
|---|---|
| Pros | Solves the real case: a Friday-night bar can set Friday window 18:00–04:00 and Saturday window 18:00–04:00, so the Friday coupon stops being redeemable at Sat 04:00 (not Sat 00:00) and the Saturday coupon only activates at Sat 18:00. Backward compatible: `ventanasHorarias = null` (or empty) preserves current "all day, every allowed weekday" behavior. Cross-midnight is explicit and supports the late-night-business pattern directly. Per-day variation is free (different close times per weekday). One source of truth (`evaluateBeneficioState`) keeps the rule engine centralized. |
| Cons | UI is the most complex of the three options: 7 weekday rows with optional time pickers and a cross-midnight visual cue. Cross-midnight evaluation logic is subtle (the "Friday 18:00–04:00" window must keep the coupon redeemable during the early Saturday hours that fall inside the Friday window — this affects `getCurrentDayInArgentina` because at 01:00 Saturday the "current weekday" is Saturday but the active window is Friday's). Requires a new `CouponBlockReason` (e.g. `BENEFICIO_OUTSIDE_WINDOW`) and a new `isWrongTime` flag, plus parallel time filtering in the raw catalog SQL OR a documented decision to delegate time filtering to TS post-fetch (cache-tolerance tradeoff). JSON column means no native Postgres time indexing without generated columns. |
| Effort | Medium — schema + central evaluator + 7-day form UI + catalog SQL + display copy. |

#### 3. Replace `fechaExpiracion` with `validoDesde` / `validoHasta` full timestamps

Drop the day-level model entirely. Replace `fechaExpiracion` with two `DateTime` columns `validoDesde` and `validoHasta` representing a single contiguous valid range. Keep `diasValidos` as an additional weekly filter.

| Aspect | Detail |
|---|---|
| Pros | Simple mental model (a start and an end). Database-native range queries work cleanly. |
| Cons | Wrong fit for the recurring weekly pattern. A bar that runs the same Friday-night promo every week cannot express "every Friday 18:00–04:00" with a single contiguous timestamp pair — it would need one row per week. Breaks the existing `diasValidos` merchant UX (the weekday chip selector is the merchant's mental model). Forces a destructive migration of `fechaExpiracion` semantics on every existing coupon. Solves a different problem than the one the user reported. |
| Effort | High — destructive migration, breaking change to existing data, and still doesn't solve the recurring weekly case without per-week rows. |

### Recommendation

**Approach 2 — per-weekday time windows with cross-midnight support.**

The user's reported pain is the midnight rollover for late-night businesses. Only per-weekday windows with explicit start/end and cross-midnight semantics can express "this Friday coupon stays redeemable until 04:00 Saturday" AND "the Saturday coupon doesn't activate until 18:00 Saturday". Approach 1 only kills coupons; it cannot delay activation. Approach 3 models a single contiguous range, not a recurring weekly pattern.

Two open policy questions to confirm at the proposal stage (NOT during exploration):

1. **Does `canClaim` (claiming a coupon to your wallet) also respect the time window, or only `canRedeem` (showing the QR to the merchant)?** Today `canClaim` ignores weekday rules. The simplest answer is "claim respects weekday but ignores time-of-day; redeem respects both" — but a late-night bar may want to block claiming the Friday coupon at 03:00 Saturday too.
2. **Catalog filtering strategy.** Either (a) add a parallel time-of-day predicate to the raw SQL in `publicBenefitsRepository.ts` (correct but verbose, and the 60s `unstable_cache` means a coupon can appear in the catalog up to 60s after its window opens/closes), or (b) keep the catalog filter at DOW-only and let `evaluateBeneficioState` in the service/card layer mark per-row `isWrongTime`. Option (b) is simpler and matches how `isWrongDay` already works today (catalog shows wrong-day coupons with a "hoy no" badge).

### Risks

- **Cross-midnight evaluation correctness.** At 01:00 Saturday, the active window is Friday's `18:00–04:00`. The evaluator must consider "windows from the previous weekday that extend into the current weekday" in addition to the current weekday's own windows. This is the single most error-prone piece of logic in the change and MUST be covered by unit tests around `evaluateBeneficioState` even though `strict_tdd: false` (the repo has no test runner today — see `openspec/config.yaml`).
- **Catalog cache staleness.** The 60s `unstable_cache` on the catalog means a coupon can appear/dissappear from the "today" filter up to 60s late. Today this is acceptable for DOW rollovers (only happens once at midnight); with time windows it happens multiple times per day and a 60s lag at, say, 18:00 could surface a coupon that's technically not yet valid. Decide at proposal stage whether to lower the cache TTL for time-windowed catalogs or accept the lag.
- **`getCurrentDayInArgentina` is weekday-only.** There is no `getCurrentTimeInArgentina` helper today; adding one is mandatory and must use the same `Intl.DateTimeFormat` timeZone approach to stay consistent with the existing weekday derivation.
- **Backward compatibility for existing coupons.** Any solution MUST default to current behavior when no time window is set (`ventanasHorarias = null` → all-day, every allowed weekday). Existing coupons have no time data and must keep working unchanged.
- **Form UX complexity.** A 7-row time-picker grid is a significant form expansion. The current `BeneficioForm` is already a long scroll on mobile. The design phase must decide whether to (a) default to "all days share the same window" with an "advanced: per-day" toggle, or (b) keep the 7-row layout compact behind the existing collapsible section pattern.
- **Redeem-at-03:00-Saturday ambiguity.** If the Friday window is `18:00–04:00` and the Saturday window is `18:00–04:00`, then between 04:00 and 18:00 Saturday NEITHER coupon is redeemable. This is correct behavior but must be communicated clearly in the UI so the merchant doesn't file a "my coupon is broken" bug.
- **Public catalog raw SQL is the only place that bypasses `evaluateBeneficioState`.** All four `EXTRACT(DOW ...)` call sites in `publicBenefitsRepository.ts` must be kept in sync with whatever time-window semantics the TS evaluator implements, OR the SQL filter must be deliberately narrowed to DOW-only with time-of-day deferred to the TS layer. Forgetting this creates a drift between what the catalog shows and what `canjearReclamo` accepts.
- **No test runner in the repo.** `openspec/config.yaml` records "Testing: No test runner detected". The cross-midnight logic is exactly the kind of subtle code that regressions love. The proposal should call out whether to introduce a minimal Vitest setup for `couponStatus.ts`/`argentinaTime.ts` or accept manual verification only.

### Ready for Proposal

Yes — the problem, recommended approach (per-weekday time windows with cross-midnight), affected areas, and open policy questions are clear. The proposal should:

1. Pick an answer to the two policy questions above (`canClaim` time-window behavior; catalog SQL vs TS-layer filtering).
2. Decide whether to introduce a minimal test runner for the evaluator (strongly recommended given the cross-midnight subtlety), or explicitly accept manual verification.
3. Scope the form UX decision (single shared window vs per-day grid) as part of the design phase, not the proposal.
