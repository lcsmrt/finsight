# Handoff — Execute: Filters, Sorting & Split-Correctness (Round 1)

**Date:** 2026-07-16
**Feature:** `.specs/features/filters-sorting-split/`
**Status:** **Planning complete (spec + tasks approved; Design skipped — no new pattern). Not started. Execute in a fresh session.**
**Planner did NOT implement** — per the SDD split (planner hands off, a fresh executor picks this up).

## What this is

A **user lens** over the transactions table and dashboard: a single-select user filter (attributed-to /
participant semantics) on both surfaces, every dashboard widget made participant-aware so a filtered view shows
exactly that user's slice, search that also matches a participant's name, and a set of sorting fixes
(single-active-sort, plus Category and Attributed-to columns). Round 2 (month nav, projections, dedicated
per-user-per-category widget) is explicitly out of scope.

Read in order: `spec.md` → `tasks.md`. This file is the executor's entry point.

## The one idea to internalize first

**The SPLIT-01 invariant is load-bearing.** Every `financial_transaction` already has ≥1 participation and
`SUM(share_amount) = amount` (backfilled + defaulted by the Expense Splitting feature). Therefore switching the
dashboard aggregation from `SUM(ft.amount)` to `SUM(tp.share_amount)` via a participant join produces **identical
unfiltered totals** — it does not change today's numbers. Its entire payoff is enabling a **correct per-user
filter** (`memberId`) across every widget. So this is safe *if and only if the invariant actually holds in the
live data* — which is exactly why **B1 is a gate that runs before B6**.

## Scope for THIS execution pass

**All 14 tasks — B1 through V** (the complete round: backend filter/search/sort/aggregation → frontend pickers
and sort wiring → full-stack E2E). There is no P2/P3 to defer this round.

**Optional early ship:** F4 (single-active-sort fix) is fully independent and fixes a live bug on its own — if a
quick win is wanted, it can be committed first, before anything else. Not required.

## Execution order

```
B1                          (integrity gate — MUST pass before B6)
B2 → B3                     (memberId param → participant filter + name-aware search)
B4 [P] , B5 [P]            (category sort ; attributed-to largest-share sort)
B1 → B6 → B7               (participant-based aggregation ; dashboard memberId plumbing)
{B2,B3} → F1 → F2          (table filter data ; member picker in popover)
{B4,B5} → F3               (enable category + attributed-to column sorting)
F4                          (single-active-sort fix — independent, can go first)
B7 → F5 → F6               (dashboard filter data ; member picker on overview)
{B3,B5,B6,B7,F2,F3,F4,F6} → V   (full-stack E2E)
```

> `[P]` = no *code* dependency. The backend compile gate and the FE build gate each cover a whole module, so run
> same-repo tasks one at a time in a single session; `[P]` only frees the ordering.

## Critical notes for the executor

1. **B1 IS A HARD GATE — run it first, before B6.** Two read-only queries against a **copy** of the dev DB
   (never the real `dev_finsight`):
   - orphans: `SELECT ft.id FROM financial_transactions ft LEFT JOIN transaction_participants tp ON tp.transaction_id = ft.id WHERE tp.id IS NULL` → must be **0 rows**.
   - sum mismatch: `... JOIN ... GROUP BY ft.id, ft.amount HAVING SUM(tp.share_amount) <> ft.amount` → must be **0 rows**.
   If **either** returns rows, **STOP**: those transactions would silently vanish from the participant-based
   numbers. Backfill missing participations (100%-to-`created_by`, mirroring the SPLIT-01 migration) as a
   remediation task first, then proceed. Record the counts in tasks.md Progress Log.

2. **B5 is the one genuinely tricky task** (⚠️ highest risk). "Sort by largest-share participant" is a per-row
   aggregate, not a property path. Preferred approach: a **correlated subquery injected into the Specification's
   `query.orderBy(...)`** (Criteria `Subquery`), stripping the Pageable sort for that key so the specification
   owns the order — this keeps it composable with the dynamic filters + pagination. If that fights Spring Data,
   the documented fallback is a **dedicated native/JPQL finder for this sort key only**; record a
   `SPEC_DEVIATION` in tasks.md describing what you chose. Ties (equal shares) must break deterministically
   (by name) so paging is stable.

3. **B3 — watch the join/distinct/pagination interaction.** Adding a `JOIN transaction_participants` for the
   `memberId` filter and the name-search OR will **inflate the row count** unless de-duplicated (distinct or a
   grouped/exists form). The paginated total count must stay correct — verify against a known split transaction
   in V. Prefer an `EXISTS` subquery for the `memberId` filter and the name-match where possible (no row
   multiplication) over a plain join + distinct.

4. **B6 must preserve unfiltered totals (AGG-02 regression).** Rewrite all four queries
   (`sumByPlanAndTypeAndDateRange`, `findCategoryBreakdown`, `findMonthlyTrend`, `findPersonBreakdown`) to sum
   `tp.share_amount` with an **optional `memberId`** (null → whole plan). Under the invariant the unfiltered
   numbers must equal the pre-change values — V records before/after for the same date range. Use the existing
   `findPersonBreakdown` participant join as the template.

5. **NO migration this round.** `transaction_participants` / `share_amount` shipped in V6. Every change is
   query/param/UI. If any task appears to need a new column, the approach is wrong — STOP and re-read.

6. **Category limits stay plan-total when filtered** (user decision 2026-07-16, "simpler for now"). Do NOT add
   per-user limit logic. When the dashboard is filtered to a member, the category chart shows that member's
   spend against the unchanged plan-total limit denominator (percent-used will read low — that's expected,
   flagged for Round 2). The client-side `monthCount` limit-scaling in `OverviewTab` (the existing
   `SPEC_DEVIATION`) is untouched.

7. **Table filter = single-select, row shows full amount.** Selecting a member filters to transactions where
   they're a participant, but each row still displays the transaction's full amount (the "Attributed to" column
   already shows shares). Do not switch the amount column to the member's share.

8. **Search stays name-aware, not filter-only** (decided). The reported bug is "search doesn't find users" — so
   B3 widens the search predicate to `description OR participant member.name`. The explicit `memberId` filter is
   the precise tool; search is the fuzzy one. Both exist by design — don't collapse one into the other.

9. **Member identity** across the stack = `member_user_id` = `User.id` = the frontend `PlanMember.userId` from
   `useGetPlanMembers`. The `memberId` request param is this value.

10. **F4 touches the shared `TableHeader`.** The fix is to make `toggleSort` **replace** the active sort
    (single column) instead of appending to a multi-element array — that's the root of the indicator/ordering
    mismatch (backend only ever reads `sorting[0]`). Confirm no other table relies on multi-column sort before
    changing shared behavior; if one does, scope accordingly.

## Gates & environment

- Backend compile: `cd finsight-backend && ./mvnw -q -DskipTests package`
- Backend unit: `cd finsight-backend && ./mvnw test -Dtest=<TestName>` (none required this round — no pure logic;
  B5's largest-share selection is in SQL, so it's DB-bound and proven in V)
- Frontend: `cd finsight-frontend && npm run lint && npm run build` (respect the pre-existing lint baseline —
  don't regress)
- Boot/aggregation verify (V): boot backend with `SERVER_PORT=3099` against a **copy** of the dev DB; Hibernate
  `validate` must pass (there should be NO schema drift — no migration). If boot fails "Connection refused",
  check for the SSH tunnel first (`ss -tlnp | grep 5432`) before assuming the DB is down (STATE L-003).
- Tools: MCP NONE throughout; FE skills `api-integration` (F1, F5), `component-creation` (F2, F6).

## Definition of done (this pass)

All requirements green in V:
- **AGG-02** unfiltered dashboard numbers = pre-change values (regression recorded).
- **DASH-02/03/04** dashboard filtered to a user shows their share in summary + category + trend (verified with
  a known 50/50 split).
- **FILT-01/02** table filtered to a member shows only their participated transactions at full amount, composes
  with other filters, empty-member is graceful.
- **SRCH-01** searching a member's name returns their transactions, **no duplicate rows**, correct total count.
- **SORT-01** second-column click moves arrow and actual order together (no mismatch).
- **SORT-02/03** Category sorts by name (nulls last); Attributed-to sorts by largest-share participant, stable
  across a page boundary.
- Backend boots with Hibernate `validate` (no drift). Throwaway/copy data cleaned; real dev data untouched.
- Flag the FE pickers + sort UI for a human visual pass (build-green ≠ runtime-correct for Base UI).

## To resume

Say **"resume work"** in a fresh session → it reads STATE.md + this handoff. Start at **Critical Note #1 (run the
B1 integrity gate)** before anything else, then B2.
