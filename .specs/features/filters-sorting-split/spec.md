# Filters, Sorting & Split-Correctness (Round 1) — Specification

**Feature**: Round 1 of the transactions/dashboard refinement track — a **user lens** over the data.
**Origin**: User request 2026-07-16 (transaction filter/sort by user, verify split reflection on the dashboard, fix broken sorting/search). Queued in STATE.md ("user-requested refinements … not yet started").
**Relation**: Builds directly on **Expense Splitting** (`../expense-splitting/`, SPLIT-01..08) and **Shared Plans** (`../shared-plans/`). Depends on the SPLIT-01 invariant (below). Does **not** replace them.

## Problem Statement

The transactions table and dashboard can't be viewed through a single person's lens: there's no user filter anywhere, search can't find a person's transactions, and several columns either don't sort or show a sort arrow that disagrees with the actual server ordering. On the dashboard, only the person breakdown is participant-aware — the summary cards, category chart, and monthly trend still aggregate the raw transaction amount, so there's no way to ask "how much of category X did user A spend?" Round 1 makes the whole surface user-aware and fixes the sorting/search defects; the broader dashboard rework (month navigation, projections, dedicated per-user-per-category widget) is Round 2.

## Key Invariant (inherited, load-bearing)

**SPLIT-01**: every `financial_transaction` has **≥1 participation** `{member_user_id, share_amount}`, and `SUM(share_amount) = amount` exactly (existing rows backfilled to a single 100%-to-`created_by` participation; create/update/series default to the same when participations are omitted).

**Consequence**: at the plan-total level, aggregating `share_amount` and aggregating `ft.amount` produce identical numbers. So participant-based aggregation does **not** change today's unfiltered dashboard totals — its payoff is enabling a **correct per-user filter** across every widget and removing the inner-join fragility. This invariant MUST be verified against live data before shipping (see AGG-03).

## Goals

- [ ] Single-select **user filter** on both the transactions table and the dashboard (attributed-to / participant semantics).
- [ ] Every dashboard widget (summary, category, trend, person) aggregates on `share_amount` and honors the user filter — a filtered view shows exactly that user's slice.
- [ ] Table search matches a person's name (find transactions a user participates in).
- [ ] Column sorting is correct: no indicator/ordering mismatch; **category** and **attributed-to (user)** columns sortable; `endDate` reachable if trivial.

## Out of Scope

| Item | Reason |
| --- | --- |
| Month prev/next navigation on the dashboard | Round 2 (dashboard rework) |
| Projected / forecast spending | Round 2 — new feature, no model support today (see STATE AD-002) |
| Dedicated "category spend by user A vs B" side-by-side widget | Round 2 — the user filter delivers the underlying capability first |
| Per-user category **limits** / sub-limits | Limit stays plan-total even when filtered (user chose "simpler for now", 2026-07-16); revisit in Round 2 |
| Multi-select user filter | User chose single-select for Round 1 |
| Changing the row's amount to the user's share when filtered | User chose to keep full amount in the row; the "Attributed to" column already shows shares |
| `PERCENT` split mode | Still deferred (SPLIT out-of-scope, unchanged) |
| Multi-column (composite) server sort | Backend sends a single sort key; fixing the mismatch means enforcing single-sort in the UI, not adding composite sort |

---

## User Stories

### P1: User filter on the transactions table ⭐ MVP

**User Story**: As a plan member, I want to filter the transactions table to a single person, so I can see just the transactions they're attributed to (participate in).

**Why P1**: Core of the "user lens"; smallest independent vertical slice (one filter param end-to-end).

**Acceptance Criteria**:

1. WHEN the user opens the transaction filters THEN the system SHALL offer a single-select user picker listing the active plan's members.
2. WHEN a user is selected THEN the table SHALL show only transactions where that user is a **participant** (has a `TransactionParticipant` row), regardless of who created them.
3. WHEN a user is selected THEN each row SHALL still display the transaction's **full amount** (not the selected user's share).
4. WHEN the user filter is combined with other filters (type, category, date, amount, search) THEN all SHALL apply together (AND).
5. WHEN the user filter is cleared THEN the table SHALL return to showing all transactions.
6. WHEN a member with no attributed transactions is selected THEN the table SHALL show an empty result gracefully (no error).
7. WHEN the plan has only one member THEN the user picker MAY be hidden or show that single member (consistent with the existing "Attributed to" column hiding when `members.length <= 1`).

**Independent Test**: Select member A in the filter; verify only A's participated transactions appear, at full amount, and paging/count reflect the filtered set.

---

### P1: Participant-aware dashboard + user filter ⭐ MVP

**User Story**: As a plan member, I want to filter the dashboard to one person and have every widget reflect only their share, so I can see how much that person contributed/spent overall and per category.

**Why P1**: Delivers the "how much of category X did user A spend?" capability and fixes the aggregation inconsistency.

**Acceptance Criteria**:

1. WHEN no user filter is applied THEN summary cards, category breakdown, and monthly trend SHALL equal today's numbers for the same date range (invariant-preserving; regression check).
2. WHEN a user is selected THEN **summary cards** (income / expense / net) SHALL sum only that user's `share_amount` for the range.
3. WHEN a user is selected THEN the **category breakdown** SHALL sum only that user's `share_amount` per category.
4. WHEN a user is selected THEN the **monthly trend** SHALL sum only that user's `share_amount` per month.
5. WHEN a user is selected THEN the **person breakdown** SHALL show that single user (or MAY be hidden), consistent with the filtered scope.
6. WHEN a user is selected THEN category **limits/percent-used** SHALL remain the plan-total limit (unchanged) — the user's spend is shown against the full limit for now (flagged for Round 2).
7. WHEN the dashboard aggregates THEN it SHALL use `share_amount` grouped by participant, and no transaction SHALL be dropped due to a missing participation (see AGG-03 / invariant).

**Independent Test**: With a known 50/50 split rent, load the dashboard filtered to A and confirm A's expense total and that category show exactly half; unfiltered totals match the pre-change dashboard.

---

### P1: User-aware search ⭐ MVP

**User Story**: As a plan member, I want the search bar to find transactions by a person's name, so searching "Ana" surfaces the transactions Ana participates in.

**Why P1**: Directly reported as broken; low cost once the participant join exists.

**Acceptance Criteria**:

1. WHEN the user types text in the search bar THEN the system SHALL match transactions whose **description** contains the text (current behavior, preserved).
2. WHEN the search text matches a participant member's **name** THEN the matching transactions SHALL also be returned (participant-name join, case-insensitive, substring).
3. WHEN a transaction matches on either description OR participant name THEN it SHALL appear exactly once (no duplicate rows from the join).
4. WHEN search is combined with the user filter or other filters THEN all SHALL apply together (AND across filters; description-vs-name is an OR *within* the search term).

**Independent Test**: Type a member's name with no matching description; confirm their transactions appear and there are no duplicates.

> **Design note (resolve in Design)**: search-matches-name (SRCH) and the explicit user filter (FILT) overlap. If the explicit filter is deemed sufficient, the team MAY scope search to description-only and rely on the filter for people — but the user explicitly reported search-by-user as broken, so the default is to make search name-aware. Confirm in design.

---

### P1: Correct column sorting ⭐ MVP

**User Story**: As a plan member, I want column sorting to actually sort by the column I clicked and match the arrow shown, including category and attributed-to.

**Why P1**: Existing defect (indicator/ordering mismatch) + the requested new sortable columns.

**Acceptance Criteria**:

1. WHEN the user clicks a sortable column header THEN the applied server sort SHALL match the column whose arrow is shown (no `sorting[0]`-only mismatch when a second column is clicked).
2. WHEN a new sortable column is clicked THEN it SHALL **replace** the prior sort (single active sort key), and only that column SHALL display a sort arrow.
3. WHEN the user clicks the **Category** header THEN the table SHALL sort by category name (ascending/descending), with uncategorized rows ordered consistently (nulls last).
4. WHEN the user clicks the **Attributed to** header THEN the table SHALL sort by the **largest-share participant's name** for each transaction (personal rows sort by their single participant).
5. WHEN the user cycles a header THEN it SHALL go ascending → descending → unsorted (default order restored) as today.
6. WHEN sorting is applied THEN it SHALL be server-side and paginate correctly across pages.
7. WHEN `endDate` can be exposed trivially THEN a sortable affordance MAY be added; if not trivial it is deferred (non-blocking).

**Independent Test**: Click Category, then Attributed-to; verify each time only the clicked column shows an arrow and the row order matches that column across a page boundary.

---

## Edge Cases

- WHEN a transaction has multiple participants and the table is sorted by Attributed-to THEN ordering SHALL use the largest-share participant; ties (equal shares) SHALL break deterministically (e.g. by name) so paging is stable.
- WHEN a transaction is uncategorized and sorted by Category THEN it SHALL sort consistently (nulls last) without error.
- WHEN the search term matches both a description and a participant name on the same row THEN the row SHALL appear once.
- WHEN the user filter references a member who was removed from the plan THEN the system SHALL handle it gracefully (empty/……filtered), not error.
- WHEN the SPLIT-01 invariant is violated in live data (a transaction with zero participations, or shares not summing to amount) THEN AGG-03 SHALL detect it before the aggregation switch ships (data-integrity gate), because such a row would otherwise be dropped or mis-summed.
- WHEN filtering the dashboard by user with an empty range or a user with no activity THEN widgets SHALL render zeros gracefully.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FILT-01 | P1: Table user filter (picker + member list) | Done | Verified |
| FILT-02 | P1: Table user filter (participant-scoped rows, full amount) | Done | Verified |
| FILT-03 | P1: Table user filter composes with other filters | Done | Verified |
| DASH-01 | P1: Dashboard user picker (single-select, plan members) | Done | Verified |
| DASH-02 | P1: Filtered summary cards on `share_amount` | Done | Verified |
| DASH-03 | P1: Filtered category breakdown on `share_amount` | Done | Verified |
| DASH-04 | P1: Filtered monthly trend on `share_amount` | Done | Verified |
| DASH-05 | P1: Person breakdown under filter; limits stay plan-total | Done | Verified |
| AGG-01 | P1: All dashboard queries aggregate `share_amount` via participant join | Done | Verified |
| AGG-02 | P1: Unfiltered totals unchanged (regression-preserving) | Done | Verified |
| AGG-03 | P1: Verify SPLIT-01 invariant on live data before switch (integrity gate) | Done | Verified |
| SRCH-01 | P1: Search matches participant member name (no duplicates) | Done | Verified |
| SORT-01 | P1: Fix indicator/ordering mismatch — single active sort key | Done | Verified |
| SORT-02 | P1: Category column sortable (nulls last) | Done | Verified |
| SORT-03 | P1: Attributed-to sortable by largest-share participant | Done | Verified |
| SORT-04 | P1: `endDate` reachable if trivial (non-blocking) | Deferred | Not done (no FE endDate column; non-blocking, Round 2) |

**ID format:** `[CATEGORY]-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 16 total — 15 Verified (E2E 2026-07-16), SORT-04 deferred (non-blocking).

---

## Success Criteria

- [ ] A single-select user filter works end-to-end on both the transactions table and the dashboard, using participant semantics.
- [ ] Dashboard filtered to user A shows A's share across summary, category, and trend; unfiltered numbers are byte-for-byte the pre-change values for the same range (regression).
- [ ] Searching a member's name returns their transactions with no duplicate rows.
- [ ] Clicking any sortable header (including Category and Attributed-to) sorts by that column, and the shown arrow always matches the applied order across pages.
- [ ] The SPLIT-01 invariant is confirmed on live data (zero orphan/mismatched transactions) prior to the aggregation switch.
