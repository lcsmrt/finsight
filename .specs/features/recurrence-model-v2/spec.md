# Recurrence Model v2 Specification

**Status:** Approved — gray-area decisions locked (see "Open Decisions"); Design next
**Milestone:** M3 — Trust the Data (this feature closes it; resolves blocker B-001)
**Prefix:** `RMV2`

## Problem Statement

The recurrence model carries a legacy free-text `frequency` String on `FinancialTransaction` that is
now vestigial: the frontend never reads or writes it, and `RecurrenceDefinition` (from the series-edit
feature) is already the controlled source of truth via the `RecurrenceMode`/`RecurrenceInterval` enums.
It lingers as dead weight and unfinished blocker **B-001**. Separately, recurring series today **must**
have an end date — the generator materializes a bounded start–end range once. A user with a genuinely
open-ended commitment (salary, rent, a subscription with no known end) has to invent a fake end date.
The `RecurrenceDefinition.generatedThrough` watermark field was already added in anticipation of solving
this, but nothing uses it yet.

## Goals

- [ ] Remove the legacy free-text `frequency` field entirely (entity + DTOs + generator + service +
      SeriesRegenerator + dead frontend DTO line), backed by a Flyway `DROP COLUMN` migration, with **no
      behavior change** (the field is vestigial). Closes B-001.
- [ ] Allow a **RECURRING** series to be open-ended (no end date), materializing occurrences up to a
      bounded rolling look-ahead horizon tracked by `generatedThrough`, so open commitments appear in the
      existing dashboard look-ahead just like bounded ones.
- [ ] Keep the model **MONTHLY-only** — no new intervals this round.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| New recurrence intervals (WEEKLY/BIWEEKLY/YEARLY) | Explicitly deferred by the user — MONTHLY-only stays for now. |
| Open-ended **installments** | Installments are inherently bounded by parcel count `N`; only RECURRING goes open-ended. |
| Backfilling/altering existing bounded recurring series | Existing series keep their `endDate` unchanged; open-ended is opt-in for new/edited series only. |
| A first-class `frequency` enum on the occurrence row | Rejected: the occurrence doesn't need it — `RecurrenceDefinition` owns recurrence. Retiring the field is the fix, not replacing it. |

---

## User Stories

### P1: Retire the legacy `frequency` field ⭐ MVP

**User Story**: As a maintainer, I want the vestigial free-text `frequency` removed from the whole stack
so the recurrence model has a single controlled source of truth and B-001 is closed.

**Why P1**: Pure debt removal that de-risks Part 2 (we rewrite the recurrence/generation paths anyway);
low risk because the field is provably unused end-to-end.

**Acceptance Criteria**:

1. WHEN the backend builds and runs the full test suite THEN it SHALL compile and pass with no reference
   to `FinancialTransaction.frequency`, `FinancialTransactionRequestDto.frequency`,
   `FinancialTransactionResponseDto.frequency`, or any `.setFrequency(...)` call.
2. WHEN the Flyway `V9` migration runs THEN it SHALL `DROP COLUMN frequency` from the transactions table,
   and `ddl-auto=validate` SHALL still pass (entity matches schema).
3. WHEN an existing single transaction or series is read/created/updated after the change THEN its
   behavior (dashboard totals, series generation, series edit) SHALL be identical to before (the field
   never affected behavior).
4. WHEN the frontend builds THEN it SHALL have no `frequency` field in the transaction DTO and no usage.

**Independent Test**: Retiring the field is demoable alone — `./mvnw clean verify` green, `npm run build`
green, migration applies clean, and existing series/transaction ITs still pass unchanged.

---

### P2: Create an open-ended recurring series ⭐ (core of Part 2)

**User Story**: As a user, I want to register a recurring expense/income with **no end date** so that an
ongoing commitment keeps appearing in my dashboard look-ahead without me inventing a fake end.

**Why P2**: The actual product value; depends on P1's cleaned-up generation path being in place.

**Acceptance Criteria**:

1. WHEN a user creates a RECURRING series and omits the end date THEN the system SHALL accept it and
   persist a `RecurrenceDefinition` with `endDate = null` (open-ended).
2. WHEN an open-ended series is created THEN the system SHALL materialize occurrences from the start date
   up to the look-ahead horizon **H** (see Open Decision D2) and set `generatedThrough` to the last
   generated occurrence's date.
3. WHEN a user creates an INSTALLMENT series THEN the end (parcel count `N`) SHALL remain required —
   open-ended applies to RECURRING only.
4. WHEN a RECURRING series is created **with** an end date THEN behavior SHALL be unchanged from today
   (bounded generation, `generatedThrough` = endDate).
5. WHEN the frontend series form is in RECURRING mode THEN it SHALL let the user leave the end date empty
   and SHALL clearly indicate the series is ongoing.

**Independent Test**: Create an open-ended recurring series via the form; verify H months of occurrences
exist, `generatedThrough` is set, and they appear in the dashboard look-ahead.

---

### P2: Rolling-window top-up keeps the horizon fresh ⭐ (core of Part 2)

**User Story**: As a user, I want my open-ended series to keep generating new future occurrences as time
passes so the look-ahead never runs dry.

**Why P2**: Without a top-up trigger, an open-ended series would freeze at its initial horizon and slowly
expire — defeating the purpose.

**Acceptance Criteria**:

1. WHEN the generation trigger fires (see Open Decision D1) THEN for every open-ended series whose
   `generatedThrough` is closer than **H** to today, the system SHALL materialize the missing months up
   to the horizon and advance `generatedThrough`.
2. WHEN the top-up runs more than once within the same period THEN it SHALL be idempotent — no duplicate
   occurrences (guarded by `generatedThrough`).
3. WHEN a top-up materializes new occurrences THEN each SHALL reflect the series' **current** definition
   (amount/category/split as of now), consistent with how series-edit "all/following" already works.

**Independent Test**: Simulate time advancing (or set `generatedThrough` back), fire the trigger, verify
new occurrences appear up to the horizon and none are duplicated on a second fire.

---

### P3: Stop / bound an open-ended series later

**User Story**: As a user, I want to later put an end on an ongoing series (or stop it) so I can close out
a commitment that ended.

**Why P3**: Nice-to-have; largely **reuses the existing series-edit end-date-change** path rather than
new machinery.

**Acceptance Criteria**:

1. WHEN a user edits an open-ended series and sets an end date THEN the system SHALL bound it: delete
   not-yet-passed occurrences after the new end, clear the open-ended top-up (a real `endDate` now caps
   `generatedThrough`).
2. WHEN a user deletes an open-ended series THEN all its occurrences and its `RecurrenceDefinition` SHALL
   be removed (unchanged from today's delete-series behavior).

**Independent Test**: Edit an open-ended series to add an end date; verify occurrences past the end are
gone and no further top-up occurs.

---

## Edge Cases

- WHEN an open-ended series' start date is far in the past THEN the system SHALL still only generate from
  start up to the horizon (past occurrences are real history, generated as today), never skipping months.
- WHEN the horizon **H** would exceed the existing `MAX_OCCURRENCES = 120` safety cap for a single
  generation pass THEN the horizon SHALL be the binding limit for open-ended series (the 120 cap stays as
  a hard backstop; H must be ≤ 120 months).
- WHEN an open-ended series is edited (amount/split/category) via series-edit "all" THEN already-generated
  future occurrences SHALL be updated per existing series-edit rules; the definition drives future top-ups.
- WHEN two app instances/triggers attempt a top-up concurrently THEN generation SHALL not create
  duplicates (idempotency via `generatedThrough`; see Design for the locking/ordering approach).

---

## Open Decisions (Discuss — LOCKED 2026-07-19, see context.md)

- **D1 — Generation trigger** → **On-read (lazy top-up)**. Top up due open-ended series on the read path
  (primary: dashboard read), idempotent via `generatedThrough`, in its own non-readOnly transaction. No
  scheduler.
- **D2 — Look-ahead horizon H** → **12 months** (stays under the `MAX_OCCURRENCES = 120` backstop).
- **D3 — Stop/bound later (P3)** → **In scope**, reusing the series-edit end-date-change path.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RMV2-01 | P1: Retire frequency (entity + V9 DROP COLUMN) | Tasks | T1 |
| RMV2-02 | P1: Retire frequency (backend + frontend DTOs) | Tasks | T1, T2 |
| RMV2-03 | P1: Retire frequency (generator/service/regenerator call sites) | Tasks | T1 |
| RMV2-04 | P2: Open-ended create — endDate optional for RECURRING | Tasks | T4, T5 |
| RMV2-05 | P2: Initial materialization up to horizon H + set generatedThrough | Tasks | T4, T5 |
| RMV2-06 | P2: Rolling top-up trigger advances generatedThrough (idempotent) | Tasks | T4, T7, T8 |
| RMV2-07 | P2: Open-ended occurrences appear in dashboard look-ahead | Tasks | T5, T8 |
| RMV2-08 | P2: Frontend form allows "no end date" + ongoing indicator | Tasks | T10 |
| RMV2-09 | P3: Bound/stop an open-ended series via series-edit end-date change | Tasks | T9 |

**Coverage:** 9 total, all mapped to tasks (`tasks.md`).

---

## Success Criteria

- [ ] No reference to a `frequency` field anywhere in backend or frontend; `V9` migration applied; suite green.
- [ ] A user can create a recurring series with no end date and see H months of look-ahead in the dashboard.
- [ ] After simulated time passage + trigger, the look-ahead is refreshed with no duplicate occurrences.
- [ ] `ddl-auto=validate` passes (entity ↔ schema consistent after the column drop).
