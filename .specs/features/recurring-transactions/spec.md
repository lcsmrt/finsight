# Recurring & Installment Transactions Specification

## Problem Statement

finSight's dashboard only reflects transactions that already exist. Known future commitments — a 12× installment purchase, a monthly salary or subscription — are invisible until each month arrives. The user wants to register a commitment once and have finSight **generate the individual transactions across the months it covers**, so the existing dashboard naturally shows the upcoming bills and the money left. This is not a statistical forecast; it is deterministic materialization of what the user already knows.

## Goals

- [ ] Let the user register a transaction as an **installment** (N parcels) or **recurring** (repeats on an interval) with a bounded start and end.
- [ ] Let the user register an installment **already in progress** — by its total count and the parcel they are currently on — so only the remaining parcels are generated forward, without duplicating parcels already imported from the Nubank CSV.
- [ ] On save, **generate one concrete `FinancialTransaction` per occurrence** across the range, so they appear in the existing dashboard/monthly-trend for their months.
- [ ] Group generated occurrences as a **series** so they can be viewed and removed together (no orphan cleanup by hand).
- [ ] Change nothing about how the dashboard computes — the look-ahead comes for free from real future-dated transactions.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                          | Reason                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Statistical/projected forecast (averages, trend) | Replaced by deterministic generation — user explicitly wants "use what's registered," no math |
| Infinite / open-ended recurrence ("Google Calendar forever") | Deferred; v1 **requires** an end to avoid unbounded generation. Rolling-window generation is a future idea (STATE.md) |
| Per-category limit projection / alerts           | Not needed for "help me see the bills"; deferred                                            |
| Smart series-wide edit of a single occurrence    | v1 treats generated rows as normal transactions once created; bulk edit is P3/future        |
| Starting-balance carry / net-worth computation   | Balance stays whatever the existing dashboard already derives from transactions             |
| DB migration tooling                             | Any new column (e.g. `seriesId`) lands via current `ddl-auto=update`; formal migrations are M3 |

---

## User Stories

### P1: Generate transactions from a bounded recurrence/installment ⭐ MVP

**User Story**: As the finSight user, when I register a recurring or installment transaction with a start and end, I want the system to generate one transaction per occurrence across that range, so that my dashboard shows the upcoming months without me entering each one.

**Why P1**: This is the whole feature — one input, N real transactions, dashboard look-ahead for free. Complete vertical slice (form + generation + they show up in the dashboard).

**Acceptance Criteria**:

1. WHEN the user submits a transaction marked as **installment** with a parcel count and a start month THEN the system SHALL create that many transactions, one per interval, each carrying the (per-parcel) amount, from the start month onward.
2. WHEN the user submits a transaction marked as **recurring** with an interval, a start, and an end THEN the system SHALL create one transaction per interval from start through end (inclusive).
3. WHEN occurrences are generated THEN each SHALL be a normal `FinancialTransaction` (correct `type` CREDIT/DEBIT, `amount`, `category`, `description`, and `startDate` set to its own occurrence month) so it flows into the existing dashboard and monthly-trend unchanged.
4. WHEN a series is generated THEN all its occurrences SHALL share a common series identifier so they can be listed and deleted as one unit.
5. WHEN the user does not provide both a start and an end (or a start + parcel count that implies an end) THEN the interface SHALL block submission — v1 does not allow unbounded recurrence.
6. WHEN the user opens the dashboard for a period that includes generated future months THEN those generated transactions SHALL be included in the totals/trend exactly like manually-entered ones.

**Independent Test**: Register "Notebook — R$300, 12 parcels, starting this month" and "Salário — R$5000, monthly, Jan–Dec." Verify 12 debit rows and 12 credit rows are created in the right months, all sharing per-series IDs, and that opening the dashboard on a future month shows them in the totals.

---

### P1: Register an in-progress installment ⭐ MVP (refinement)

**User Story**: As the finSight user, when I register an installment I have already started paying, I want to say how many parcels there are in total and which parcel I am currently on, so that finSight generates only the current parcel and the ones after it — labelled with the real parcel numbers — without recreating the parcels already imported from my Nubank CSV.

**Why P1**: The original generation always assumed the first parcel (`1/N` starting at the chosen month). In real life a user registers a purchase they are already several parcels into (the earlier ones are already on imported statements). Without this, every existing installment either starts at the wrong number or double-counts already-imported parcels. It closes the same MVP loop for the common real-world case.

**Acceptance Criteria**:

1. WHEN the user submits an **installment** with a total parcel count `N` and a **current parcel** `k` (1 ≤ k ≤ N) THEN the system SHALL generate parcels `k` through `N` inclusive — that is `N − k + 1` transactions — and SHALL NOT generate parcels `1..k−1`.
2. WHEN the in-progress occurrences are generated THEN the first SHALL be dated at the chosen (current-parcel) month and each subsequent one one interval later, and each description SHALL carry its real parcel number (`k/N`, `(k+1)/N`, … `N/N`).
3. WHEN the user does not supply a current parcel THEN the system SHALL default `k = 1`, reproducing the original "generate all N from the start month" behaviour exactly (backward compatible).
4. WHEN the current parcel `k` is greater than the total count `N` (or less than 1) THEN the interface/API SHALL reject the submission with a clear validation error.
5. WHEN the user is entering an in-progress installment THEN the interface SHALL show the derived final parcel and month (e.g. "last: 12/12 — Feb 2027") read-only, so the implied end is visible without being a separate, conflicting input.

**Independent Test**: Register "Notebook — R$300, 12 parcels total, currently on parcel 5, this month" → verify exactly 8 debit rows dated this month onward, labelled `5/12 … 12/12`, and that parcels `1/12..4/12` are NOT created. Register the same with no current parcel → 12 rows `1/12..12/12` (unchanged behaviour).

---

### P2: View and delete a series

**User Story**: As the finSight user, I want to see my recurring/installment series and delete a whole series at once, so that I can undo a wrong entry without deleting each month by hand.

**Why P2**: Directly follows from generation — without it, a mistaken 12× series is 12 manual deletes. Not in P1 only because generation is demonstrable on its own first.

**Acceptance Criteria**:

1. WHEN the user views their transactions THEN generated occurrences SHALL be identifiable as belonging to a series.
2. WHEN the user deletes a series THEN the system SHALL remove all its occurrences (scoped to that user) in one action.
3. WHEN the user deletes a single occurrence (not the series) THEN only that occurrence SHALL be removed and the rest of the series SHALL remain.

**Independent Test**: Create a 12× series, delete the series, confirm all 12 are gone; recreate, delete one occurrence, confirm 11 remain.

---

### P3: Edit a series

**User Story**: As the finSight user, I want to edit a series (e.g., change the amount or shorten the range) and have the occurrences update, so that I can correct a commitment without recreating it.

**Why P3**: Convenience on top of create + delete. Editing generated rows in bulk has real semantics to resolve (past vs. future occurrences), so it stays a nice-to-have.

**Acceptance Criteria**:

1. WHEN the user edits a series' amount or range THEN the system SHALL update the affected (typically future) occurrences accordingly.

---

## Edge Cases

- WHEN `end` is before `start` THEN the interface/API SHALL reject with a clear validation error.
- WHEN a parcel count and an explicit end disagree THEN the system SHALL apply one rule consistently (parcel count defines the number of occurrences) and SHALL NOT generate a contradictory range. _(Which one wins is confirmed in Design.)_
- WHEN a current parcel `k` is supplied for an installment THEN the generated count SHALL be `N − k + 1` (the remaining parcels), and the cap SHALL apply to that generated count. `k = N` is valid (a single remaining parcel); `k < 1` or `k > N` is rejected.
- WHEN an in-progress installment is registered THEN the already-imported earlier parcels (from the Nubank CSV) SHALL NOT be regenerated — the user avoids double-counting by setting `k` to the first parcel not yet on a statement (no automatic dedup against imports; the choice of `k` is the mechanism).
- WHEN a series would generate an unusually large number of occurrences THEN the system SHALL enforce a sane upper bound and reject beyond it, rather than mass-inserting. _(Bound value set in Design.)_
- WHEN generating occurrences THEN they SHALL NOT collide with the CSV-import dedup mechanism (`externalId`) — generated rows are not imports and MUST NOT be mistaken for or deduped against imported ones.
- WHEN the interval is monthly and the start day doesn't exist in a later month (e.g., day 31) THEN the occurrence date SHALL fall back sensibly (e.g., last day of that month).
- All generation and series operations SHALL be scoped to the authenticated user only (consistent with existing ownership checks).

---

## Requirement Traceability

| Requirement ID | Story                                    | Phase  | Status  |
| -------------- | ---------------------------------------- | ------ | ------- |
| RECUR-01       | P1: Installment generation               | T5,T6,T7,T10 | Implementing (unit-verified) |
| RECUR-02       | P1: Recurring generation (start–end)     | T5,T6,T7,T10 | Implementing (unit-verified) |
| RECUR-03       | P1: Occurrences are normal dashboard-visible transactions | T4,T6 | Implementing (runtime-pending) |
| RECUR-04       | P1: Shared series identifier             | T1,T4,T6 | Implementing |
| RECUR-05       | P1: Require bounded range (block infinite) | T3,T5,T10 | Implementing (unit-verified) |
| RECUR-10       | P1: In-progress installment (current parcel k → generate k..N) | T13,T14,T15,T16 | Planned (refinement) |
| RECUR-06       | P2: Identify series in transaction list  | T11    | Implementing |
| RECUR-07       | P2: Delete whole series                  | T6,T7,T9,T11 | Implementing |
| RECUR-08       | P2: Delete single occurrence             | (existing delete) | Implementing |
| RECUR-09       | P3: Edit series                          | —      | Deferred (out of v1 scope) |

**ID format:** `RECUR-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, 8 implemented (RECUR-01..08), 1 planned refinement (RECUR-10), 1 deferred (RECUR-09). "Verified" requires the T12 runtime E2E (needs Postgres up).

---

## Success Criteria

- [ ] Registering one bounded recurring/installment entry produces the correct set of real transactions in the correct months.
- [ ] The existing dashboard shows those future months with no changes to dashboard logic.
- [ ] A wrong series can be removed in a single action.
- [ ] Nothing generated interferes with CSV import or its dedup.

---

## Open Gray Areas (to confirm at the Specify → Design checkpoint)

Locked before/within Design:

1. **Data model** — reuse the existing `frequency`/`parcelsNumber`/`startDate`/`endDate` fields on `FinancialTransaction` and add a nullable `seriesId`, with **no separate parent entity** (each occurrence is a standalone row) — vs. introducing a lightweight "recurrence definition" entity as the template. (Recommendation: `seriesId`, no parent, for MVP.)
2. **Supported intervals** — monthly only for v1, or also weekly/yearly? (Recommendation: monthly + installments first.)
3. **Parcel-vs-end precedence** — installments defined by count; recurring defined by start+end. Confirm the exact input the form asks for in each mode.
4. **Endpoint shape** — extend `POST /financial-transaction` with a recurrence payload that fans out, vs. a dedicated `POST /financial-transaction/series` (+ `DELETE .../series/{id}`). (Recommendation: dedicated series endpoints — cleaner, keeps single-create untouched.)
