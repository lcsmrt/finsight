# Recurrence Model v2 Context

**Gathered:** 2026-07-19
**Spec:** `.specs/features/recurrence-model-v2/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Two coupled goals, MONTHLY-only (no new intervals): (1) retire the vestigial free-text `frequency` field
across the whole stack behind a Flyway `DROP COLUMN`; (2) allow RECURRING series to be open-ended (no end
date), materialized up to a rolling look-ahead horizon via the existing `RecurrenceDefinition.generatedThrough`
watermark. Closes B-001 and milestone M3.

---

## Implementation Decisions

### D1 — Generation trigger mechanism → On-read (lazy top-up)

- Open-ended series are topped up **on the read path**, not by a scheduler. No `@Scheduled`, no
  single-instance concern; self-healing (if the app is down, nothing needs to run; the next read tops up).
- The top-up runs inside the request that surfaces look-ahead. Primary consumer is the **dashboard read**;
  Design decides whether the transaction-list read also triggers it (a shared top-up service method both
  can call). Must be idempotent via `generatedThrough` and run in its own (non-readOnly) transaction.
- Accepted trade-off: a write side-effect on a GET path. Kept safe by idempotency + transaction boundary.

### D2 — Look-ahead horizon H → 12 months

- Open-ended series materialize occurrences up to **12 months** ahead of "today".
- Rationale: matches the dashboard's monthly nature, covers a year of planning, stays well under the
  existing `MAX_OCCURRENCES = 120` backstop (which remains as a hard cap; H ≤ 120 always).

### D3 — Stop/bound an open-ended series later → In scope (P3), reusing series-edit

- Setting an `endDate` on an open-ended series (via the existing series-edit end-date-change path) bounds
  it: delete not-yet-passed occurrences after the new end, and a real `endDate` now caps `generatedThrough`
  so top-up stops. Reuses existing series-edit machinery rather than new code.

### Agent's Discretion

- Exact read path(s) that trigger the on-read top-up (dashboard only vs dashboard + transaction list),
  the shared service method's shape, transaction/locking approach for idempotency, and the precise
  "today" anchor (server date) — all Design's call.
- Frontend "ongoing series" indicator styling and how the form expresses "no end date" (empty vs a toggle)
  — Design/implementation choice following existing form conventions.

---

## Specific References

- The infra is already prepared: `RecurrenceMode{INSTALLMENT,RECURRING}`, `RecurrenceInterval{MONTHLY}`,
  `RecurrenceDefinition` (with `generatedThrough`, unique `seriesId`), `SeriesRegenerator`,
  `RecurringTransactionGenerator` (MONTHLY loop, `MAX_OCCURRENCES = 120`).
- Open-ended is **RECURRING-only**; installments stay bounded by parcel count `N`.
- Mental model mirrors the existing bounded flow ("look-ahead comes for free": generated future-dated rows
  flow into the existing dashboard unchanged) — open-ended just keeps refilling the window.

---

## Deferred Ideas

- New recurrence intervals (WEEKLY/BIWEEKLY/YEARLY) — explicitly out of scope this round (MONTHLY-only).
- Scheduled-job generation (D1 alternative) — could revisit if on-read proves insufficient at scale.
