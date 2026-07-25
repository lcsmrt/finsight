# Series Edit Specification

**Date:** 2026-07-16
**Feature dir:** `.specs/features/series-edit/`
**Status:** Specified & user-approved 2026-07-16. Architecture already converged & LOCKED (see `research.md` D1–D6 + D7–D10 below). Ready for Design.
**Depends on / builds from:** Recurring & Installment Transactions (shipped), Expense Splitting (SPLIT-01 invariant), Shared Plans (plan-scoped auth).

> Naming note: the three edit scopes are named in English throughout — **"This one" / "This and following" / "All"** (the whole system is English-only). The research notes used Portuguese during discussion; that does not carry into the product or these artifacts.

## Problem Statement

Today a recurring/installment **series** has no first-class identity: it's just N `FinancialTransaction` rows sharing a bare UUID `seriesId`, and the recurrence template (mode, interval, parcels, range, split) is discarded the moment the rows are generated. As a result the user **cannot edit a series** — if an amount, category, split, or parcel count is wrong, or a recurring commitment changes, their only options are delete-the-whole-series-and-recreate or hand-edit each row. There is no endpoint and no UI for "change this recurring thing going forward."

## Goals

- [ ] Introduce a first-class **`RecurrenceDefinition`** entity that owns the forward-looking template; existing occurrences FK back to it (one-time data migration backfills one definition per existing `seriesId`).
- [ ] Let the user **edit a series** with the industry-standard three-way scope — **This one** / **This and following** / **All** (Google-Calendar UX) — for the core fields (amount, description, category, split).
- [ ] Keep the **past immutable by default**: "This and following" rewrites only occurrences from the pivot forward; "All" is the only scope that touches already-generated past rows.
- [ ] Retire the legacy free-text `frequency` field onto the definition (resolves blocker **B-001**).
- [ ] Preserve every existing correctness invariant across edits: **SPLIT-01** (participations sum to amount), dashboard top-line + per-category totals, and plan role × row-ownership authorization.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| **Endless / no-end recurrence (rolling-window generation)** | LOCKED as post-v1 (research D5). v1 still requires an end (installments finite, recurring needs endDate). The `RecurrenceDefinition` entity is what makes it feasible later, but no rolling-window job ships now. |
| **Manual single-occurrence override preservation** | D9 (v1 = clobber). A bulk "This and following"/"All" edit overwrites prior "This one" edits in scope. Per-row override/detach tracking is deferred. |
| **Non-monthly intervals** | Only `MONTHLY` exists today; interval selection stays single-valued. No new intervals in this feature. |
| **Propagating line items (`TransactionItem`) into series occurrences** | Pre-existing gap (Expense-Items P3). Series occurrences carry zero items today; series edit does not add item handling. |
| **Editing the transaction `type` (CREDIT/DEBIT) of an existing series** | Changing income↔expense mid-series is nonsensical; type is fixed at creation. |
| **Bulk "smart" edits across unrelated series** | One series at a time. |

---

## User Stories

### P1: Correct a series' attributes across all three scopes ⭐ MVP

**User Story**: As a plan member, I want to open any occurrence of a series and change its amount, description, category, or split — choosing whether the change applies to just this one, this-and-following, or all occurrences — so that I can fix mistakes or reflect a change without deleting and recreating the whole series.

**Why P1**: This is the whole point of the feature and a complete demoable vertical slice (entity + migration + edit endpoint + scope chooser + form). It excludes only range resizing (P2).

**Acceptance Criteria**:

1. WHEN the system starts against an existing database THEN a migration SHALL create exactly one `RecurrenceDefinition` per distinct `(plan, seriesId)`, infer its template from the surviving rows (mode via `parcelsNumber` presence, amount, category, split, interval, date range), and FK every occurrence to its definition — with no change to any occurrence's user-visible values.
2. WHEN the user triggers "edit series" on a series occurrence THEN the system SHALL present a scope chooser offering **This one**, **This and following**, and **All**, and an edit form prefilled from the definition's current values.
3. WHEN the user picks **This one** and saves THEN the system SHALL update only that one occurrence (its existing single-row behavior), leaving `seriesId`, `parcelsNumber`, and `frequency` intact so the row stays part of the series.
4. WHEN the user picks **This and following** from a pivot occurrence and saves THEN the system SHALL update the definition and rewrite every occurrence dated on or after the pivot occurrence's date, leaving strictly-earlier occurrences untouched.
5. WHEN the user picks **All** and saves THEN the system SHALL update the definition and rewrite every occurrence in the series, past included.
6. WHEN a "This and following" or "All" edit changes `amount` or the split template THEN each rewritten occurrence's participations SHALL sum exactly to the (new) amount (SPLIT-01 preserved).
7. WHEN any edit is submitted THEN the system SHALL authorize it per occurrence via the existing plan role × row-ownership rule (same guard as delete-series), rejecting edits to occurrences the actor may not modify.
8. WHEN a bulk ("This and following"/"All") edit overlaps an occurrence that had been manually changed via a prior "This one" THEN the system SHALL overwrite it (clobber, D9) — no override preservation.

**Independent Test**: Create a 12-parcel installment with a wrong amount. Open parcel 8, choose "All", change the amount → all 12 rows and the dashboard reflect the new amount, split still valid. Repeat choosing "This and following" from parcel 8 → parcels 8–12 change, 1–7 unchanged. Repeat "This one" → only that row changes and it keeps its `seriesId`.

---

### P2: Resize a series (change range)

**User Story**: As a plan member, I want to change how many parcels an installment has (or move a recurring series' end date) so that I can correct "actually it's 18 parcels, not 12" or extend/shorten a recurring commitment without recreating it.

**Why P2**: High value but the most complex path — it adds/removes occurrence rows and forces k/N relabeling. Cleanly separable from P1's attribute edits.

**Acceptance Criteria**:

1. WHEN the user changes an installment's **total parcel count** THEN the edit SHALL apply at **"All" scope only** (D10) — every occurrence relabels to the new total (position-anchored: parcel `k` keeps its position, `N` becomes the new total — D8), added trailing occurrences are generated, and excess trailing occurrences are deleted. There is never a mixed-label series.
2. WHEN the user changes a recurring series' end date under **All** or **This and following** THEN the system SHALL add occurrences up to the new end (bounded by `MAX_OCCURRENCES`) or remove occurrences past a shortened end.
3. WHEN a range change would exceed `MAX_OCCURRENCES` (120) THEN the system SHALL reject it with a clear error, unchanged.
4. WHEN the scope chooser is shown for an installment AND the user has changed the total count THEN the UI SHALL make it clear the change applies to the whole series (scope forced to "All"), so the behavior is predictable and never surprises the user.

**Independent Test**: Extend a 12-parcel installment to 18 → 18 rows labeled `1/18…18/18`. Shorten to 6 → 6 rows `1/6…6/6`, trailing rows gone. Move a recurring series' end from Dec to Mar → three more monthly rows appear.

---

### P3: (deferred — see Out of Scope)

Endless recurrence (rolling window, D5) and manual-override preservation are explicitly deferred. Listed here only to mark that the `RecurrenceDefinition` entity is deliberately the enabling groundwork for them.

---

## Edge Cases

- WHEN "This and following" is chosen from the **first** occurrence of a series THEN it SHALL behave identically to "All" (nothing is before the pivot).
- WHEN "This and following"/"All" is chosen but no field actually changed THEN the system SHALL be a no-op (or idempotent rewrite) with no spurious row churn.
- WHEN a single-row `PUT` ("This one") omits recurrence fields in its body (full-replace contract) THEN the occurrence SHALL retain `seriesId`, `parcelsNumber`, and `frequency` — a "This one" edit must never silently detach the row from its series.
- WHEN a series spans occurrences created by different plan members THEN authorization SHALL be evaluated per occurrence; an actor lacking rights on any in-scope occurrence SHALL have the whole edit rejected (fail-closed), consistent with delete-series.
- WHEN the migration runs on a series whose surviving rows are inconsistent (e.g. mismatched amounts because of a prior manual edit) THEN it SHALL infer the definition from a deterministic source (e.g. the earliest occurrence) and SHALL NOT rewrite any occurrence — the backfill is metadata-only, never destructive.
- WHEN a recurring occurrence (`frequency="MONTHLY"`, `parcelsNumber=null`) is edited THEN no k/N relabeling applies (recurring rows have no parcel label).
- WHEN an edit changes the `category` to one not in the plan THEN it SHALL be rejected with the same validation used on create.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SEDIT-01 | P1: RecurrenceDefinition entity + migration backfill (foundation) | T1,T2,T3 | Verified |
| SEDIT-02 | P1: "This one" single-occurrence edit preserves series membership | T6 | Verified |
| SEDIT-03 | P1: "This and following" — update definition + rewrite occurrences from pivot forward; past untouched | T4,T6 | Verified |
| SEDIT-04 | P1: "All" — update definition + rewrite every occurrence | T4,T6 | Verified |
| SEDIT-05 | P1: Editable fields = amount, description, category, splitMode + participants (no range) | T6,T10 | Verified |
| SEDIT-06 | P1: Split invariant (SPLIT-01) preserved on rewritten occurrences | T6,T4 | Verified |
| SEDIT-07 | P1: Per-occurrence authorization (role × row-ownership), fail-closed | T6 | Verified |
| SEDIT-08 | P1: Bulk edit clobbers prior single-occurrence edits (D9) | T4,T6 | Verified |
| SEDIT-09 | P1: Retire legacy free-text `frequency` onto the definition (B-001) | T1,T3 | Verified |
| SEDIT-10 | P1: FE — scope chooser (This one/This and following/All) + series-edit form prefilled from definition + read endpoint | T7,T8,T9,T10,T11 | Verified |
| SEDIT-11 | P2: Installment count change — "All" scope only, add/remove rows, position-anchored k/N relabel (D8, D10) | T4,T6,T10 | Verified |
| SEDIT-12 | P2: Recurring end-date change — add/remove occurrences, MAX_OCCURRENCES guard | T4,T6,T10 | Verified |

**ID format:** `SEDIT-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 12 total, 12 Verified 2026-07-16 (T12 migration integrity gate + T13 full-stack E2E, see tasks.md Progress Log).

---

## Locked Decisions (this Specify session, extend research.md D1–D6)

- **D7 — Scopes:** all three ship in v1 — *This one* (existing single-row edit, made series-safe), *This and following* (rewrite from pivot forward, past immutable), *All* (rewrite everything).
- **D8 — Installment labels:** k/N is **position-anchored** — parcel `k` keeps its position; `N` changes only when the total count changes (P2).
- **D9 — Overrides:** bulk edits **clobber** prior single-occurrence edits in v1; override preservation deferred.
- **D10 — Count change ⇒ "All" scope only:** changing an installment's total parcel count is only permitted at "All" scope, so every row relabels to the new total and a series never ends up with mixed labels (e.g. `4/12` next to `5/18`). Chosen for predictability — the user asked only that resize behavior be predictable and never surprising.

## Success Criteria

- [ ] A wrong amount / category / description / split on any series is fixable in-place via all three scopes, with the dashboard reflecting the change and the split invariant intact.
- [ ] The migration backfills one definition per existing series with **zero** change to any occurrence's visible values (verified against a copy DB, like the Round-1 B1 integrity gate).
- [ ] Legacy `frequency` free-text is no longer the source of truth for recurrence (B-001 resolved).
- [ ] Past occurrences are never altered by a "This and following" edit; only "All" touches them.
- [ ] All edits respect plan role × row-ownership, fail-closed.
