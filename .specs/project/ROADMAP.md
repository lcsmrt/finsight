# Roadmap

**Current Milestone:** M3 — Trust the Data
**Status:** In Progress (schema migrations + test foundation shipped; Recurrence Model v2 not started)

---

## M1 — Track & Understand (shipped)

**Goal:** A user can import real bank data and understand where money went.
**Target:** Complete (baseline of the existing codebase).

### Features

**Authentication** - COMPLETE

- Register, login (JWT), profile
- Per-user data scoping

**Transactions** - COMPLETE

- CRUD with filter / sort / pagination
- Nubank CSV import with `externalId` dedup

**Categories** - COMPLETE

- CRUD with per-category `spendingLimit`

**Dashboard** - COMPLETE

- Total income / expenses / net balance
- Category breakdown vs. limits
- Monthly trend (income vs. expenses)

---

## M2 — Look Ahead (shipped 2026-07-16)

**Goal:** A user can see upcoming bills and money-left in the existing dashboard, by registering commitments once.

### Features

**Recurring & Installment Transactions** - COMPLETE (E2E-verified 2026-07-16)

- Register a commitment as installment (N parcels) or recurring, with a bounded start–end
- Generate one concrete transaction per occurrence across the range (deterministic, no projection math)
- Group occurrences under a `seriesId` so a series can be viewed/deleted together
- Look-ahead comes for free: generated future-dated transactions flow into the existing dashboard unchanged
- **In-progress installments** (RECUR-10, specced 2026-07-11): register an existing installment by total count `N` + **current parcel `k`**, generating only `k..N` forward (labelled "k/N") with the current parcel's month as the start; `k=1` is the original behaviour. Fixes the "always assumes the first parcel" behaviour and lets the user avoid double-counting parcels already imported from the Nubank CSV. Implied end shown read-only. See STATE.md AD-003.

---

## M3 — Trust the Data (in progress)

**Goal:** Make the foundation safe to evolve as forecasting grows.

### Features

**Schema migrations** - SHIPPED (adopted during the Shared Plans track, 2026-07-11 — see STATE.md AD-004/AD-006; real DB currently at Flyway V8)
**Test foundation** - SHIPPED 2026-07-17 (`.specs/features/test-foundation/`) — Testcontainers-backed backend integration harness (10 `*IT` classes covering split/dashboard/authz/auth/tx-CRUD/series-edit/migrations/CSV-import/invitations) + a JaCoCo floor on 3 invariant classes + a frontend `unit` vitest project (forms + a service hook) + a Base UI compound-component interaction guard. Found 2 real pre-existing bugs (not yet fixed — STATE.md B-002, B-003).
**Recurrence Model v2** - PLANNED (controlled vocabulary/enum to replace the legacy free-text `frequency` field — STATE.md B-001; open-ended/rolling-window recurrence "Google Calendar style" that v1 deliberately skips by requiring an end). Split out as its own forecast-track item; not started.

---

## M4 — Share (planned)

**Goal:** People can track finances together in a shared space, each with their own login and controlled access.

### Features

**Shared Plans** - SPECCED (spec.md + context.md, 2026-07-11) — supersedes the earlier "Household" framing (see STATE.md AD-004)

- Introduce a **Plan** as a shareable container that owns transactions and categories (spreadsheet-style sharing), replacing direct `user → transaction` ownership with `plan → transaction` + a `created_by` attribution
- Every user gets an auto-created **personal plan**; existing transactions and categories migrate into it (nothing lost)
- Invite others into a plan **by email and by link** (with accept) at a chosen role
- **Two-layer access control**: plan role (Owner / Editor / Contributor / Viewer) × row-level ownership — a Contributor edits only what they created; everyone sees everything; only the Owner manages members/categories/plan
- Shared categories with a **plan-total** spending limit; dashboard shows **combined + per-person** breakdown
- **Depends on M3 schema migrations** — the `user_id → plan_id` re-scope is destructive and must not run on `ddl-auto=update`; the migration foundation is the first step of this track
- **Prioritized ahead of the per-transaction items feature** — user needs multi-person expense entry now; the two are independent, items deferred (see AD-004)

**Transaction Line Items ("Expense items")** - P1 SHIPPED 2026-07-15 (see `.specs/features/expense-items/` + AD-007); P2/P3 planned

- Break a transaction into **line items**, each with its own category + amount (additive `TransactionItem` child of `FinancialTransaction`, mirrors `TransactionParticipant`)
- The dashboard **category breakdown** becomes item-aware (Partition Invariant: `spent[C] = A[C] − B[C] + I[C]`); top-line totals unchanged — answers "cleaning vs. food in one grocery run"
- **Loose** sums (remainder → parent category), items on both DEBIT and CREDIT, independent of the participant/split axis, no new authz gate
- Sequenced AFTER Shared Plans + Expense Splitting (per AD-004). **P1 (T1–T10) executed & E2E-verified 2026-07-15.** Still planned: **P2** (quantity input, itemized indicator in the transactions table) and **P3** (items replicated across recurring/installment series occurrences)

---

## Future Considerations

- Budgets/goals and "what-if" scenarios on top of the forecast
- Alerts when projected balance goes negative or a category limit is projected to break
- Broader import sources beyond Nubank CSV
