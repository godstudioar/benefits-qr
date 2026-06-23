# Coupon Time Windows Specification

## Purpose

Defines recurring per-weekday time windows for coupon availability, including cross-midnight behavior, enforcement at QR/redeem, catalog visibility, and backward compatibility for coupons without configured windows.

## Requirements

### Requirement: Schedule Storage

The system MUST store optional per-weekday time windows (`ventanasHorarias`) on each `Beneficio`. Each window consists of a `start` and `end` time as `HH:mm` strings. A null or empty windows collection means the coupon has no time-of-day restriction.

| Field | Type | Constraint |
|-------|------|------------|
| weekday | `Int` (0–6, Sun–Sat) | MUST match `diasValidos` membership |
| start | `String` (`HH:mm`) | MUST be `00:00`–`23:59` |
| end | `String` (`HH:mm`) | MUST be `00:00`–`23:59` |

#### Scenario: Coupon with no windows configured

- GIVEN a coupon with `ventanasHorarias` = null
- WHEN the system evaluates availability
- THEN time-of-day is not checked and behavior matches current `diasValidos`-only logic

#### Scenario: Coupon with a single weekday window

- GIVEN a coupon with `diasValidos=[5]` and a window `{weekday:5, start:"18:00", end:"23:00"}`
- WHEN evaluated on Friday at 17:00 AR
- THEN the coupon is blocked (outside window)

---

### Requirement: Time Zone Semantics

All window evaluations MUST use `America/Argentina/Buenos_Aires` as the reference time zone. The system MUST derive the current weekday and minutes-of-day from this zone, not from server-local or UTC time.

#### Scenario: Server in different timezone

- GIVEN server clock is UTC and current UTC time is Saturday 02:00
- WHEN Argentina local time is Friday 23:00
- THEN the system evaluates using Friday's windows

---

### Requirement: Cross-Midnight Window Evaluation

When a window's `end` is less than its `start` (e.g., `18:00–04:00`), the system MUST treat the window as spanning from `start` on the configured weekday through `end` on the following calendar day. At evaluation time, the system MUST check both the current weekday's own windows AND the previous weekday's cross-midnight windows.

#### Scenario: Friday 18:00–04:00 evaluated at Saturday 01:00

- GIVEN Friday window `{start:"18:00", end:"04:00"}` and current time is Saturday 01:00 AR
- WHEN the system evaluates availability
- THEN the coupon is active (within Friday's cross-midnight extension)

#### Scenario: Saturday coupon blocked during Friday's cross-midnight tail

- GIVEN Saturday has its own window `{start:"18:00", end:"23:00"}` and Friday has `{start:"18:00", end:"04:00"}`
- WHEN current time is Saturday 02:00 AR
- THEN Saturday's coupon is blocked (Saturday's own window has not started; Friday's extension covers a different coupon)

#### Scenario: Window ending at exactly 00:00

- GIVEN a window `{start:"18:00", end:"00:00"}`
- WHEN evaluated at 23:59 AR on the configured weekday
- THEN the coupon is active
- AND at 00:01 AR the next day the coupon is blocked

---

### Requirement: QR and Redeem Time-Window Enforcement

QR generation and redeem flows MUST block operations when the current time falls outside all active windows for the coupon's current weekday (including cross-midnight extensions from the previous weekday). The system MUST return `BENEFICIO_OUTSIDE_TIME_WINDOW` as the block reason.

#### Scenario: QR generation blocked outside window

- GIVEN a coupon with window `{weekday:5, start:"18:00", end:"22:00"}` and current time is Friday 16:00 AR
- WHEN a customer requests QR generation
- THEN the system blocks with `BENEFICIO_OUTSIDE_TIME_WINDOW`

#### Scenario: Redeem allowed inside window

- GIVEN a coupon with window `{weekday:5, start:"18:00", end:"22:00"}` and current time is Friday 19:00 AR
- WHEN a merchant scans a valid QR
- THEN the redeem succeeds

---

### Requirement: Claim Permissiveness (MVP)

Claim (reclamo creation) SHOULD NOT be blocked by time windows. The system MUST continue to allow claims outside active windows so customers can claim a coupon in advance and redeem it later during the valid window.

#### Scenario: Claim outside time window

- GIVEN a coupon with window `{weekday:6, start:"20:00", end:"02:00"}` and current time is Saturday 10:00 AR
- WHEN a customer creates a claim
- THEN the claim succeeds

---

### Requirement: Backward Compatibility

Coupons with null or empty `ventanasHorarias` MUST behave identically to the current system: only `diasValidos` weekday membership and `fechaExpiracion` date comparison determine availability. No new block reasons apply.

#### Scenario: Existing coupon unaffected

- GIVEN an existing coupon with `diasValidos=[1,3,5]`, `ventanasHorarias`=null, and current time is Monday 08:00 AR
- WHEN evaluated
- THEN the coupon is active (Monday is valid, no time restriction)

---

### Requirement: Catalog Visibility

Public catalog SQL filtering and ranking MUST respect time-window rules for `soloHoy` queries. A coupon with windows MUST rank as "available now" only when the current Argentina time falls within an active window. Coupons outside their window SHOULD still appear in the catalog but ranked lower or marked as "available later".

#### Scenario: soloHoy catalog at open time

- GIVEN a public coupon with window `{weekday:5, start:"18:00", end:"22:00"}` and current time is Friday 19:00 AR
- WHEN the catalog is queried with `soloHoy=true`
- THEN the coupon appears as available

#### Scenario: soloHoy catalog before open time

- GIVEN the same coupon and current time is Friday 10:00 AR
- WHEN the catalog is queried with `soloHoy=true`
- THEN the coupon is not ranked as available-now

---

### Requirement: Merchant Schedule Editing

The merchant benefit form MUST allow configuring time windows per weekday. The UI MUST only allow windows on weekdays already present in `diasValidos`. Removing a weekday from `diasValidos` MUST remove its associated windows.

#### Scenario: Merchant adds a time window

- GIVEN a merchant editing a coupon with `diasValidos=[5,6]`
- WHEN they set Friday window `18:00–04:00`
- THEN the window is persisted with `weekday=5, start="18:00", end="04:00"`

#### Scenario: Removing weekday clears its windows

- GIVEN a coupon with Friday window `18:00–04:00` and `diasValidos=[5,6]`
- WHEN the merchant removes Friday from `diasValidos`
- THEN Friday's window is removed

---

### Requirement: User Messaging

When a coupon is blocked by a time window, the system MUST display a message indicating the valid time range. The message MUST include the start and end times in Argentina local format.

#### Scenario: Blocked message with time info

- GIVEN a coupon blocked by `BENEFICIO_OUTSIDE_TIME_WINDOW` with window `18:00–22:00`
- WHEN the customer views the coupon
- THEN the message reads "Este cupón está disponible hoy de 18:00 a 22:00"
