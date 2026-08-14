# Roadmap

**Current Milestone:** M5 — Capture Every Day (post-MVP refinement)
**Status:** M1–M3 ✅ SHIPPED; M4 Shared Plans P1 + Expense Items P1 ✅ SHIPPED; remaining M4 refinements and M5 daily-capture tracks are now the active backlog.

> **Raw ideas bucket:** See [`IDEAS.md`](./IDEAS.md) for a separate, non-canonical collection of future product ideas captured during brainstorming. Those ideas are not yet triaged or committed; review and migrate only the accepted ones into this roadmap.

---

## Prioritized Backlog (MoSCoW)

Features are grouped by user-facing goal and tagged with their source milestone/track. Ordering inside a bucket is the suggested delivery sequence.

### Must have (next milestone candidates)

| # | Feature | Why | Source |
| - | ------- | --- | ------ |
| M5-01 | **Invoice (NF) import / reader** | Eliminates the biggest daily friction: typing purchases manually. User-flagged as the top day-to-day need. | New — M5 |
| M5-02 | **WhatsApp quick-capture bot** | Lets a user register a transaction by forwarding a message or texting a bot — lowest-friction capture when away from the app. | New — M5 |
| M4-03 | **Expense Items P2** | Quantity input + itemized indicator in the transactions table; closes the visible gap left by P1. | M4 deferred |
| M4-04 | **Expense Items P3** | Replicate items across series occurrences so a recurring grocery run stays itemized. | M4 deferred |

### Should have (high value, slightly later)

| # | Feature | Why | Source |
| - | ------- | --- | ------ |
| M4-05 | **Server-sent invite emails** | Removes the manual link-copy step from Shared Plans; needed for real multi-user adoption. | STATE.md deferred |
| M4-06 | **Alerts / notifications** | Warn when balance goes negative or a category limit is projected to break; turns the dashboard from informative to actionable. | M4 deferred / Future |
| M4-07 | **Permanent plan deletion + retention** | Soft-delete is done; owners need a real purge (and possibly restore) affordance. | STATE.md deferred |
| M4-08 | **Recurring intervals beyond MONTHLY** | WEEKLY/BIWEEKLY/YEARLY support; small UX unlock once the recurrence model is solid. | M4 deferred |

### Could have (nice to have, low urgency)

| # | Feature | Why | Source |
| - | ------- | --- | ------ |
| M4-09 | **Broader CSV / bank import sources** | Reduce Nubank-only lock-in; depends on having a robust parser first. | Future |
| M4-10 | **Dashboard "what-if" / budgets** | Let users simulate the impact of a future purchase against limits. | Future |
| — | **More frontend unit coverage** | Extend the established test harness to remaining forms/hooks. Low risk, incremental. | CONCERNS.md |

### Won't now (explicitly parked)

| # | Feature | Why parked |
| - | ------- | ---------- |
| — | Statistical forecasting / averages | Superseded by AD-002's deterministic materialized-rows model; revisit only if user explicitly asks for projections. |
| — | Open-ended installments | Installments are bounded by definition; the need is covered by in-progress installments (RECUR-10). |
| — | Native mobile app | WhatsApp capture gives 90% of the mobile value without a separate app build. |

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

## M3 — Trust the Data ✅ SHIPPED 2026-08-01

**Goal:** Make the foundation safe to evolve as forecasting grows.

### Features

**Schema migrations** - SHIPPED (adopted during the Shared Plans track, 2026-07-11 — see STATE.md AD-004/AD-006; real DB currently at Flyway V9)
**Test foundation** - SHIPPED 2026-07-17 (`.specs/features/test-foundation/`) — backend integration harness (10 `*IT` classes covering split/dashboard/authz/auth/tx-CRUD/series-edit/migrations/CSV-import/invitations; later moved off Testcontainers onto the `dev_finsight` DB, 2026-07-25) + a JaCoCo floor on 3 invariant classes + a frontend `unit` vitest project (forms + a service hook) + a Base UI compound-component interaction guard. Found and later fixed 2 real pre-existing bugs (STATE.md B-002, B-003).
**Recurrence Model v2** - SHIPPED 2026-08-01 (`.specs/features/recurrence-model-v2/`). Retired the legacy free-text `frequency` field via a Flyway `DROP COLUMN` migration (closes B-001) and shipped open-ended RECURRING series with a rolling 12-month horizon, lazy dashboard top-up, and bound/stop via series-edit. Backend **62 unit + 72 integration tests green**; frontend **42 tests green**; T11 API-driven E2E passed.

---

## M4 — Share ✅ P1 SHIPPED; refinements in backlog

**Goal:** People can track finances together in a shared space, each with their own login and controlled access.

### Features

**Shared Plans** - P1 SHIPPED 2026-07-12 (spec.md + context.md, 2026-07-11 — see STATE.md AD-004)

- Introduce a **Plan** as a shareable container that owns transactions and categories (spreadsheet-style sharing), replacing direct `user → transaction` ownership with `plan → transaction` + a `created_by` attribution
- Every user gets an auto-created **personal plan**; existing transactions and categories migrate into it (nothing lost)
- Invite others into a plan **by email and by link** (with accept) at a chosen role
- **Two-layer access control**: plan role (Owner / Editor / Contributor / Viewer) × row-level ownership — a Contributor edits only what they created; everyone sees everything; only the Owner manages members/categories/plan
- Shared categories with a **plan-total** spending limit; dashboard shows **combined + per-person** breakdown
- **M4 refinements still open**: server-sent invite emails (links are still copy-pasted today), permanent plan deletion/retention beyond the current soft-delete

**Transaction Line Items ("Expense items")** - P1 SHIPPED 2026-07-15 (see `.specs/features/expense-items/` + AD-007); P2/P3 planned

- Break a transaction into **line items**, each with its own category + amount (additive `TransactionItem` child of `FinancialTransaction`, mirrors `TransactionParticipant`)
- The dashboard **category breakdown** becomes item-aware (Partition Invariant: `spent[C] = A[C] − B[C] + I[C]`); top-line totals unchanged — answers "cleaning vs. food in one grocery run"
- **Loose** sums (remainder → parent category), items on both DEBIT and CREDIT, independent of the participant/split axis, no new authz gate
- Sequenced AFTER Shared Plans + Expense Splitting (per AD-004). **P1 (T1–T10) executed & E2E-verified 2026-07-15.** Still planned: **P2** (quantity input, itemized indicator in the transactions table) and **P3** (items replicated across recurring/installment series occurrences)

---

## M5 — Capture Every Day (current)

**Goal:** Remove the friction of getting a real-world expense into finSight, so the ledger stays complete without manual typing.

**User insight (2026-08-01):** the highest-value next step is making day-to-day capture effortless — reading invoices (NFs) and allowing quick notes via WhatsApp.

### Candidate Features

**M5-01 — Invoice / NF import**

- Accept a PDF or image of a Brazilian Nota Fiscal (NF-e) and extract merchant, total, date, and (where available) line items + categories.
- First version can target the most common NF-e XML/PDF layout; fall back to a simple "upload + manual confirm" flow.
- Reuses the existing `TransactionItem` model for itemized breakdown.

**M5-02 — WhatsApp quick-capture**

- A user can forward or send a message (text, image, or voice-to-text) to a finSight number/bot and have it parsed into a draft transaction.
- Draft goes to an inbox inside the app for one-tap confirm/edit.
- Lower initial scope: text only, single transaction per message, no natural-language parsing beyond simple patterns (amount, description, date defaults to today).

**M5-03 — Alerts / notifications (moved up from Future)**

- Surface a warning when a category is projected to exceed its limit given committed future transactions.
- Optional: weekly summary / "you spent X this week" nudge.

### Open Questions (to close before speccing)

1. **NF source format**: XML, PDF, photo, or all three? (XML gives structured data; photo needs OCR.)
2. **WhatsApp integration**: use the WhatsApp Business API / Meta Cloud, or a third-party wrapper? (Regulatory + cost implications.)
3. **Capture trust level**: Should auto-captured drafts require confirmation, or can a user enable auto-confirm?

---

## Future Considerations

The canonical backlog stops at the items above. For a broader, untriaged idea pool, see [`IDEAS.md`](./IDEAS.md). Notable themes under review include budgets/goals, broader bank imports, native mobile apps, AI insights, and automated capture workflows. Only items that pass triage should be moved into this roadmap.
