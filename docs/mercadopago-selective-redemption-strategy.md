# Mercado Pago selective payment at redemption for Qupon

This document describes a practical path to introduce **integrated payment at redemption only for selected coupon types** in Qupon, without pretending the current platform already has a money domain. It is grounded in the current schema and flows implemented in `prisma/schema.prisma`, `src/server/services/reclamosService.ts`, `src/server/services/reclamoActionsService.ts`, the current coupon authoring flow, and the current QR redemption experience.

## Executive summary

**Current:** Qupon is a coupon claim and validation platform, not a payment platform. A coupon (`Beneficio`) can be claimed (`Reclamo`), rendered as a short-lived QR, and redeemed by the merchant. There is no persisted amount, no transaction record, no payment authorization, no webhook processing, and no settlement model.

**Preferred direction:** add Mercado Pago only for coupon types that require calculating a discount on a merchant-entered subtotal at redemption time. Do **not** force payments into every coupon. Preserve the existing no-payment flow for informational, free, or simple validation-only benefits.

**Core product rule:** if a coupon requires integrated payment, the coupon is **not redeemed** until the Mercado Pago payment is approved and linked to that redemption attempt.

---

## 1) Current-state summary of Qupon

### What Qupon is today

Qupon currently supports two operational models:

| Flow | Current behavior | Main code paths |
|---|---|---|
| Standard claim -> QR -> merchant redeem | Customer claims the coupon, receives a `Reclamo` in `PENDIENTE`, generates a QR, merchant scans it, system marks it `CANJEADO` | `src/server/services/reclamosService.ts`, `src/server/services/reclamoActionsService.ts`, `src/components/cliente/beneficio/QRDisplay.tsx`, `src/app/dashboard/escanear/page.tsx` |
| Direct redemption | Customer enters via `?flow=direct-qr`; the system creates or updates a `Reclamo` and marks it `CANJEADO` immediately, then shows an order-like confirmation string | `src/lib/flows.ts`, `src/server/services/reclamosService.ts`, `src/components/cliente/beneficio/ReclamarForm.tsx` |

### Important current product behavior

- Coupons are authored by merchants from the dashboard through `BeneficioForm` and stored in `Beneficio`.
- Customers can be authenticated or anonymous; anonymous usage can create a lightweight `Cliente` plus a `cliente_session` cookie.
- The system evaluates coupon availability through `src/lib/couponStatus.ts`.
- Claiming is intentionally more permissive than redeeming: a customer can claim first and redeem later during the valid day/time window.
- QR tokens are ephemeral (`QR_EXPIRY_MINUTES = 10`) and only prove that the claim is being presented for redemption.
- `mediosPago` exists today, but only as a **display restriction / informational label** on the coupon. It does not trigger any payment processing.

### Product interpretation

The current platform validates benefits. It does **not** yet charge money, reserve funds, or reconcile a payment lifecycle.

---

## 2) Current database structure relevant to benefits, claims, sessions, events, and why payments are not modeled yet

## Current models that matter

| Model / enum | Current purpose | Relevant fields |
|---|---|---|
| `Beneficio` | Coupon definition owned by a merchant | `descripcion`, `fechaExpiracion`, `maxUsos`, `diasValidos`, `ventanasHorarias`, `esPublico`, `mediosPago`, `esAcumulable`, `condicionesExtra`, `maxUsosPorCliente`, `eventoId`, `deletedAt` |
| `Reclamo` | Customer claim / redemption record | `beneficioId`, `clienteId`, `fechaReclamo`, `fechaCanje`, `qrToken`, `qrTokenExpira`, `estado` |
| `Cliente` | End-customer identity, often lightweight | `email`, `googleId`, `nombre` |
| `Session` | Shared session infrastructure for `LOCAL` and `CLIENTE` | `token`, `userId`, `userType`, `expiresAt` |
| `Evento` | Event-scoped coupon grouping | `slug`, `fechaInicio`, `fechaFin`, `activo` |
| `EstadoReclamo` | Claim state machine | `PENDIENTE`, `CANJEADO`, `CANCELADO` |
| `MedioPago` | Informational payment-method labels | `EFECTIVO`, `TRANSFERENCIA`, `DEBITO`, `CREDITO` |

## Why payments are NOT modeled yet

The current schema has **no persisted money model**. Specifically, there is no current model for:

- payment intent / checkout session
- approved vs rejected payment status
- currency and amount fields
- subtotal / discount / final charge snapshot
- provider transaction identifiers
- webhook event ingestion
- idempotency handling for provider callbacks
- refunds / reversals / chargebacks
- reconciliation / settlement / fees

`Reclamo` is the clearest proof: it only knows whether a coupon is pending, redeemed, or canceled. It does not know **how much** was charged, **whether** anything was charged, or **which provider transaction** authorized the redemption.

## Current auditability level

Current auditability is enough for coupon validation, but not for financial operations:

- `fechaReclamo` and `fechaCanje` show timing.
- `qrToken` and `qrTokenExpira` support QR presentation security.
- Coupon stats are derived from `Reclamo` state counts.

What is missing for payments:

- immutable financial snapshots
- provider references
- payment attempt history
- webhook traceability
- merchant-entered subtotal provenance
- who triggered or confirmed each money step

---

## 3) Preferred direction: selective integrated payment only for SOME coupon types

## Recommendation

Do **not** turn all coupons into payment coupons.

Instead, introduce a coupon capability flag that allows two families to coexist:

| Family | Behavior | Keep in v1? |
|---|---|---|
| Validation-only coupon | Current Qupon behavior; claim/QR/redeem without payment | Yes |
| Payment-at-redemption coupon | Merchant enters subtotal, system calculates discount, customer pays through Mercado Pago, coupon redeems only after approval | Yes |

## Why selective is the right shape

This matches the current product better because:

1. **Most current coupons do not require a money flow.**
2. The current schema already supports non-financial coupon configuration well.
3. A payment flow adds operational complexity that should only exist where it creates product value.
4. Forcing all coupons into a payment pipeline would distort the simple QR redemption model that already works.

## Strategic boundary

Mercado Pago should be introduced as a **specialized redemption path**, not as a platform-wide assumption.

---

## 4) Proposed coupon configuration model

## Current vs proposed authoring model

### CURRENT

`Beneficio` currently captures:

- descriptive copy
- expiration and schedule
- visibility
- allowed payment method labels (`mediosPago`)
- stackability (`esAcumulable`)
- extra conditions

### PROPOSED

Add explicit pricing and payment semantics to selected coupons.

## Proposed merchant-facing configuration

| Field | Purpose | CURRENT / PROPOSED |
|---|---|---|
| `paymentMode` | Whether coupon is validation-only or requires integrated payment | PROPOSED |
| `discountType` | Structured discount logic | PROPOSED |
| `discountValue` | Numeric value used by the discount rule | PROPOSED |
| `minimumSubtotal` | Optional guardrail for applicability | PROPOSED |
| `maximumDiscountAmount` | Optional cap for percentage discounts | PROPOSED |
| `currency` | Needed once money is real | PROPOSED |
| `mediosPago` | Informational label only | CURRENT |

## Recommended configuration enums

### `PaymentMode` (new)

| Value | Meaning |
|---|---|
| `NONE` | Current Qupon behavior, no integrated payment |
| `MERCADO_PAGO_AT_REDEMPTION` | Coupon requires integrated payment approval before redemption |

### `DiscountType` (new)

Recommended v1 scope:

| Value | Meaning | Include in v1? |
|---|---|---|
| `PERCENTAGE` | e.g. 20% off eligible subtotal | Yes |
| `FIXED_AMOUNT` | e.g. ARS 5,000 off eligible subtotal | Yes |
| `FINAL_PRICE` | e.g. set final payable amount to a fixed value | No |
| `BUY_X_GET_Y` | Multi-line retail logic | No |
| `FREE_ITEM` | Requires line-item modeling | No |

## Recommended amount concepts

For payment coupons, Qupon should explicitly model:

| Concept | Meaning | Why it matters |
|---|---|---|
| `eligibleSubtotalAmount` | Merchant-entered base amount to which the coupon applies | The current system has no subtotal concept; this becomes the calculation input |
| `discountAmount` | Discount generated by the coupon rule | Needed for audit and receipt parity |
| `finalAmount` | What the customer actually pays through Mercado Pago | Becomes the provider charge amount |

## Which coupon types are in / out of v1

### In scope for v1

- Simple percentage discounts on a merchant-entered subtotal
- Simple fixed-amount discounts on a merchant-entered subtotal
- One coupon -> one payment -> one redemption

### Out of scope for v1

- Multi-item cart discounts
- Marketplace / split settlement
- Deferred capture / partial capture
- Tips, taxes, delivery, or service charges modeled by Qupon
- Refund automation
- Multi-coupon stacking with provider-side calculations
- Direct-flow instant redemption with no merchant checkpoint

The existing `direct-qr` flow should remain **outside** the first payment release. It currently marks `Reclamo` as `CANJEADO` immediately, which conflicts with the rule “redeem only after payment approval.”

---

## 5) Proposed redeem-time flow

## CURRENT standard flow

1. Customer claims coupon.
2. System creates `Reclamo` in `PENDIENTE`.
3. Customer generates QR.
4. Merchant scans QR.
5. `canjearReclamo()` marks the claim `CANJEADO` immediately.

## PROPOSED payment-at-redemption flow

1. Merchant scans QR.
2. System loads the pending claim and the coupon configuration.
3. If the coupon does **not** require integrated payment, continue with the current redeem path.
4. If the coupon **does** require integrated payment:
   1. Merchant enters the eligible subtotal / base amount.
   2. System calculates `discountAmount` and `finalAmount` from coupon rules.
   3. System creates a payment attempt tied to the claim.
   4. Customer pays with Mercado Pago.
   5. Qupon waits for approval confirmation.
   6. Only after approval, the claim transitions to redeemed.

## Operational sequence

| Step | Actor | System responsibility |
|---|---|---|
| Scan QR | Merchant | Identify a valid pending claim |
| Enter subtotal | Merchant | Capture the calculation base as an auditable input |
| Calculate amounts | Qupon | Apply deterministic coupon rules |
| Initiate payment | Qupon + Mercado Pago | Create a provider-side transaction tied to the claim |
| Pay | Customer | Approve payment |
| Confirm approval | Webhook / provider callback + merchant UI refresh | Mark payment approved |
| Redeem coupon | Qupon | Set claim as redeemed only after approval |

## Important flow decision

Do **not** rely only on the merchant browser response to finalize redemption. Approval should be confirmed through a provider-traceable mechanism, ideally webhook-backed, because the current immediate UI flow is not strong enough for money.

---

## 6) Proposed data model changes

## Design principle

Do not overload `Reclamo` with every payment field. `Reclamo` represents coupon usage state. Payment requires its own traceable records.

## Proposed schema additions

### Changes to `Beneficio`

Add configuration fields such as:

| Field | Type idea | Purpose |
|---|---|---|
| `paymentMode` | enum | Whether integrated payment is required |
| `discountType` | enum nullable | Structured discount rule |
| `discountValue` | decimal / integer cents | Rule value |
| `minimumSubtotalAmount` | decimal / integer cents nullable | Optional applicability threshold |
| `maximumDiscountAmount` | decimal / integer cents nullable | Optional cap |
| `currency` | enum/string | Currency used for charge calculations |

### Changes to `Reclamo`

Keep the claim as the business anchor, but extend it selectively:

| Field | Purpose |
|---|---|
| `redemptionModeSnapshot` | Freeze whether this claim used normal or payment redemption |
| `paymentRequired` | Snapshot from coupon config at claim/redemption time |
| `redeemedByLocalId` | Which merchant account completed the final redemption |
| `redemptionApprovedAt` | Optional explicit approval timestamp distinct from `fechaCanje` if desired |

Recommendation: `fechaCanje` can remain the final “redeemed at” timestamp, but payment-specific timestamps should live in payment records.

### New `PagoRedencion` model (recommended)

Introduce a dedicated model for the financial attempt tied to a claim.

Suggested responsibilities:

- one row per payment attempt
- links to `Reclamo`, `Beneficio`, `Cliente`, and optionally `Local`
- stores money snapshot used for the transaction
- stores provider references and status lifecycle

Suggested fields:

| Field | Purpose |
|---|---|
| `id` | Internal primary key |
| `reclamoId` | Business anchor |
| `beneficioId` | Snapshot link for reporting |
| `clienteId` | Customer reference |
| `localId` | Merchant reference |
| `provider` | e.g. `MERCADO_PAGO` |
| `providerPaymentId` | Mercado Pago payment identifier |
| `providerPreferenceId` / `providerOrderId` | Creation reference if applicable |
| `status` | Internal payment state |
| `eligibleSubtotalAmount` | Merchant-entered subtotal |
| `discountAmount` | Calculated discount |
| `finalAmount` | Customer charge amount |
| `currency` | Currency snapshot |
| `idempotencyKey` | Safe retry control |
| `createdAt` / `updatedAt` | Lifecycle timestamps |
| `approvedAt` / `rejectedAt` / `cancelledAt` / `expiredAt` | Status-specific timestamps |
| `failureCode` / `failureMessage` | Provider decline trace |

### New `PagoRedencionEvento` model (recommended)

For auditability, add an append-only event table instead of mutating only the latest payment row.

Suggested use cases:

- provider webhook received
- approval confirmed
- rejection recorded
- merchant canceled attempt
- duplicate callback ignored

This matters because the current platform has no event journal for financial state changes.

## Proposed enums

### `PaymentProvider`

- `MERCADO_PAGO`

### `PaymentStatus`

Recommended internal states:

| State | Meaning |
|---|---|
| `PENDING` | Payment intent created, awaiting customer action |
| `IN_PROCESS` | Provider is processing |
| `APPROVED` | Payment approved |
| `REJECTED` | Payment rejected |
| `CANCELLED` | Cancelled by merchant or customer |
| `EXPIRED` | Payment window expired |

## Proposed claim state transitions

### CURRENT

`PENDIENTE -> CANJEADO` or `PENDIENTE -> CANCELADO`

### PROPOSED

Keep `EstadoReclamo` small if possible:

- `PENDIENTE`
- `CANJEADO`
- `CANCELADO`

Then let payment lifecycle live in `PagoRedencion`.

This is preferable because Qupon already uses `Reclamo` as the user-visible coupon state, and mixing payment states like `PAYMENT_PENDING` into `EstadoReclamo` would blur two concerns.

If stronger operational visibility is needed, a fourth state such as `BLOQUEADO_POR_PAGO` could be considered later, but it is not the cleanest v1.

## Payment reference handling

At minimum, Qupon should store:

- internal idempotency key used when creating the provider transaction
- Mercado Pago payment id
- any preference/order identifier used to open the checkout flow
- raw provider status snapshots or normalized event payload references

The current `orderNumber` generated from `Reclamo` (`ORD-...`) is only a display helper. It is **not** a real payment order identifier and should not become the sole payment reference.

## Auditability and traceability requirements

For every paid redemption, Qupon should be able to answer:

1. Which coupon rule was applied?
2. Which subtotal did the merchant enter?
3. Which discount was calculated?
4. What amount did the customer pay?
5. Which Mercado Pago transaction approved it?
6. Which webhook or callback finalized the state?
7. Which merchant session completed the redemption?

The current schema cannot answer these questions reliably yet.

---

## 7) Risks, edge cases, and anti-patterns

## Main risks

| Risk | Why it matters | Recommendation |
|---|---|---|
| Marking coupon redeemed before provider approval | Breaks financial correctness | Never set `CANJEADO` until approval is confirmed |
| Reusing `mediosPago` as the payment engine flag | `mediosPago` is currently informational only | Add explicit payment configuration fields |
| Overloading `Reclamo` with all payment data | Makes coupon state unreadable and brittle | Use a dedicated payment model |
| Trusting only client/browser success redirect | Browser can close, refresh, or race | Use provider-backed confirmation, ideally webhook-first |
| Allowing multiple concurrent payment attempts for one pending claim without rules | Can create double charge / double redemption ambiguity | Enforce one active payment attempt per redeemable claim |
| Keeping direct instant redemption unchanged for paid coupons | Current direct flow immediately marks `CANJEADO` | Exclude paid coupons from `direct-qr` v1 |

## Edge cases to plan for

- Merchant scans a QR that is valid, but the coupon becomes exhausted before payment approval.
- Merchant enters a subtotal, then customer abandons the payment.
- Customer pays successfully, but webhook arrives late.
- Duplicate webhook callbacks arrive.
- Merchant retries after a failed or expired payment.
- Coupon expires while the payment is still pending.
- Merchant edits coupon payment settings after customers already claimed it.

## Recommended business rules for those edge cases

1. **Snapshot payment rules at attempt creation.** Do not recalculate from a later edited coupon definition.
2. **One active payment attempt per claim** unless the previous one is terminal.
3. **Claim remains pending** while payment is pending.
4. **Coupon config changes should not retroactively alter in-flight payment attempts.**
5. **Exhaustion and expiry must be revalidated before final redemption commit.**

## Anti-patterns to avoid

- Adding a single `paymentStatus` string on `Reclamo` and calling it done.
- Storing only the final amount and not the entered subtotal + calculated discount.
- Treating provider redirect success as approval.
- Making every coupon require Mercado Pago because it is “simpler.” It is not simpler.
- Reusing `orderNumber` as the authoritative payment id.

---

## 8) Rollout recommendation: v1 / later phases

## V1 recommendation

Ship a constrained, operationally safe version:

### V1 scope

- selective coupon flag for integrated payment
- only standard QR redemption path supports payment coupons
- only percentage and fixed-amount discounts
- merchant enters eligible subtotal manually
- Qupon stores full money snapshot per payment attempt
- Mercado Pago approval required before `Reclamo.estado = CANJEADO`
- provider callback / webhook support for final confirmation

### Explicitly not in V1

- direct instant redemption for paid coupons
- refund workflows
- partial captures
- multi-item basket logic
- stacked discounts
- fiscal receipt orchestration

## Later phases

### Phase 2

- better merchant UX for payment retries
- payment timeout handling and merchant recovery flows
- admin / merchant reporting by paid redemptions
- support for discount caps and minimum subtotals in UI validation

### Phase 3

- refunds / reversals operational support
- stronger reconciliation dashboards
- optional richer coupon economics (fixed final price, bundles, etc.)

---

## 9) Concrete tables/models likely affected

## Highest-impact current tables

| Table / model | Expected impact |
|---|---|
| `Beneficio` | Add payment configuration and discount rule fields |
| `Reclamo` | Add redemption/payment snapshot metadata; keep final coupon state anchor |
| `Session` | Likely unchanged structurally, but used for merchant/customer authorization during payment flow |
| `Cliente` | Mostly unchanged; remains customer identity reference |
| `Local` | Mostly unchanged; may be referenced by payment records for merchant traceability |
| `Evento` | Likely unchanged structurally, but event coupons may need payment eligibility rules |

## Recommended new tables

| Table / model | Purpose |
|---|---|
| `PagoRedencion` | Financial attempt and latest normalized payment state |
| `PagoRedencionEvento` | Append-only event log for provider and internal state changes |

---

## Final recommendation

The cleanest architecture for Qupon is **not** “Mercado Pago everywhere.”

It is:

1. keep the current validation-only coupon path intact,
2. add an explicit payment capability only for selected coupons,
3. model payment as its own domain next to `Reclamo`,
4. redeem only after approval,
5. keep v1 narrow and operationally auditable.

That direction fits the current codebase, respects the existing claim/QR model, and avoids pretending that the current `Reclamo` schema is already a transactional commerce system when it clearly is not.
