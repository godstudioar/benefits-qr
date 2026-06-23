# Proposal: Coupon Time Windows

## Intent

Enable late-night businesses to keep a coupon valid past midnight and prevent the next day's coupon from activating before its real opening window.

## Scope

### In Scope
- Add recurring per-weekday time windows with cross-midnight support.
- Enforce windows for QR generation and redeem flows; keep claim/reclamo creation permissive for MVP.
- Apply time-window semantics in public catalog SQL filtering/ranking and add targeted evaluator tests.

### Out of Scope
- Merchant-configurable exact expiration timestamps on `fechaExpiracion`.
- Broad UX polish beyond the MVP schedule editor and availability copy.

## Capabilities

### New Capabilities
- `coupon-time-windows`: recurring coupon availability windows, including cross-midnight behavior and catalog visibility.

### Modified Capabilities
- None

## Approach

Store nullable weekday windows on `Beneficio` and evaluate them centrally in `src/lib/couponStatus.ts` with Argentina-local weekday + minutes-of-day helpers. `end < start` means the window continues into the next day. `fechaExpiracion` remains the last valid date, but normalization MUST stop truncating the last scheduled window at `23:59:59` when windows exist. Public catalog SQL MUST mirror the same window rules for `soloHoy` and ranking; TS hydration remains a secondary guard and messaging layer.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add coupon schedule storage. |
| `src/lib/argentinaTime.ts` | Modified | Add Argentina time-of-day helper. |
| `src/lib/couponStatus.ts` | Modified | Centralize window evaluation and new block reason. |
| `src/server/repositories/publicBenefitsRepository.ts` | Modified | Keep catalog SQL filtering/ranking aligned with schedule rules. |
| `src/server/services/reclamosService.ts`, `src/server/services/reclamoActionsService.ts` | Modified | Enforce claim/QR/redeem policy consistently. |
| `src/components/local/dashboard/beneficios/BeneficioForm.tsx` | Modified | Capture merchant schedule input. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cross-midnight evaluator bugs | High | Add focused unit tests around boundary hours. |
| Catalog/SQL drift from TS evaluator | Medium | Define one shared semantic model and verify `soloHoy` cases. |
| 60s catalog cache lag near open/close times | Medium | Accept MVP lag explicitly and document it for follow-up review. |

## Rollback Plan

Disable schedule-aware reads/writes, revert to existing `diasValidos` + date-only checks, and keep nullable schedule data ignored so existing coupons remain usable.

## Dependencies

- Prisma migration for the schedule field.
- Minimal Vitest setup for pure schedule evaluators in this same change.

## Success Criteria

- [ ] A Friday `18:00–04:00` coupon stays redeemable after midnight until `04:00` AR, and the Saturday coupon stays blocked until its own start time.
- [ ] Public catalog `soloHoy` filtering and ranking match redemption availability within the accepted cache TTL.
- [ ] Coupons without schedules behave exactly as they do today.
