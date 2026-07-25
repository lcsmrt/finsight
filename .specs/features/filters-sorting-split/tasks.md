# Filters, Sorting & Split-Correctness (Round 1) — Tasks

**Spec**: `./spec.md`
**Design**: none (skipped — no new pattern; all changes extend existing filter/sort/aggregation mechanisms; confirmed with user 2026-07-16)
**Status**: Approved (2026-07-16) → execute in a fresh session (see `./handoff-execute.md`)

> **No migration this round.** `transaction_participants` (V6) and `share_amount` already exist. Every change is a query/param/UI edit — no Flyway version, no schema change. If any task thinks it needs a column, STOP: the design is wrong.

> **Testing convention (inherited from TESTING.md + Splitting/Items precedent).** Pure logic → real unit tests. All DB/HTTP-bound code → **compile-gated** + verified in the final runtime E2E (both apps up). Almost everything here is DB/HTTP-bound. Gates:
> - Backend compile: `cd finsight-backend && ./mvnw -q -DskipTests package`
> - Backend unit: `cd finsight-backend && ./mvnw test -Dtest=<TestName>`
> - Frontend: `cd finsight-frontend && npm run lint && npm run build` (respect the pre-existing lint baseline — don't regress)
> - Boot/aggregation verify: start backend with `SERVER_PORT=3099` against a **copy** of the dev DB (never the real `dev_finsight`); Hibernate `validate` must pass; exercise the dashboard endpoint.

> **Tools note.** MCP: NONE throughout. FE skills follow the established pattern (`api-integration` for data-layer, `component-creation` for UI). Adjust at approval if desired.

> **Member identity.** "User"/"member" filter value = `member_user_id` = `User.id` (a plan member's `userId`). The frontend already has `useGetPlanMembers` (`usePlanService.ts`) returning `{userId, name, ...}`.

---

## Execution Plan

### Phase 1 — Integrity gate (Sequential, BLOCKS aggregation switch)
```
B1
```

### Phase 2 — Backend filter / search / sort (compile-gate serializes within the module)
```
B2 → B3
B4 [P]
B5 [P]
```

### Phase 3 — Backend participant-based aggregation (needs B1 green)
```
B1 ─→ B6 → B7
```

### Phase 4 — Frontend (build-gate serializes within the app; deps are backend contracts)
```
{B2,B3} → F1 → F2
{B4,B5} → F3
F4                      (independent shared-table fix)
B7 ─────→ F5 → F6
```

### Phase 5 — Verify (Sequential)
```
{B3,B5,B6,B7,F2,F3,F4,F6} → V
```

> **Serialization caveat.** `[P]` marks the absence of a *code* dependency. The backend compile gate and the frontend build gate each cover a whole module, so a single Execute session should still run same-repo tasks one at a time; `[P]` only means order among them is free.

---

## Task Breakdown

### B1: Verify the SPLIT-01 invariant on live data (integrity gate) — AGG-03
**What**: Read-only check that every `financial_transaction` has ≥1 participation and `SUM(share_amount) = amount` per transaction. Produces a pass/fail with counts of any offenders. **No code, no writes.**
**Where**: run against a **copy** of the dev DB (or read-only against live) — SQL only; record the result in this file's Progress Log.
**Depends on**: None
**Reuses**: schema from V6 (`transaction_participants`)
**Requirement**: AGG-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Query 1 (orphans): `SELECT ft.id FROM financial_transactions ft LEFT JOIN transaction_participants tp ON tp.transaction_id = ft.id WHERE tp.id IS NULL` returns **0 rows**.
- [ ] Query 2 (sum mismatch): `SELECT ft.id, ft.amount, SUM(tp.share_amount) s FROM financial_transactions ft JOIN transaction_participants tp ON tp.transaction_id = ft.id GROUP BY ft.id, ft.amount HAVING SUM(tp.share_amount) <> ft.amount` returns **0 rows**.
- [ ] Result (counts) recorded in the Progress Log.
**If offenders exist**: STOP and escalate — do NOT proceed to B6. Decide a remediation (backfill missing participations to 100%-creator) as a follow-up task before switching aggregation.
**Tests**: none (this task *is* a verification) · **Gate**: n/a
**Commit**: none (no code)

---

### B2: Add `memberId` to the transaction paged-filter DTO + controller — FILT-02
**What**: Add an optional `memberId` (Long) to the backend transaction filter DTO and accept it as a request param on the list endpoint; pass it into the specification builder.
**Where**: `finsight-backend/.../dto/FinancialTransactionFilterDto.java` (add field), `controllers/FinancialTransactionController.java` (bind param), `services/FinancialTransactionService.java` (`findAllByPlanPaged` → pass to spec)
**Depends on**: None
**Reuses**: the existing `categoryId`/`type` optional-param plumbing as the exact template
**Requirement**: FILT-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `memberId` optional field added to the filter DTO; endpoint accepts it (nullable, no default)
- [ ] Threaded into the specification call (used by B3)
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests package`
**Tests**: none (compile-gated; DB-bound, verified in V) · **Gate**: build
**Commit**: `feat(transactions): accept memberId filter param`

---

### B3: Extend `FinancialTransactionSpecification` — participant `memberId` filter + name-aware search — FILT-02, SRCH-01
**What**: Add a participant join so (a) `memberId` restricts rows to transactions where that user is a participant, and (b) the search term matches EITHER `description` OR a participant `member.name` (case-insensitive substring). Ensure **no duplicate rows** (distinct) from the join.
**Where**: `finsight-backend/.../specifications/FinancialTransactionSpecification.java` (modify `descriptionContains` → widen to description-OR-participant-name; add `hasParticipant(memberId)`)
**Depends on**: B2
**Reuses**: existing `descriptionContains` LIKE pattern; `TransactionParticipant.member` association; `PlanMembership`/`User` join style
**Requirement**: FILT-02, SRCH-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `memberId` present → only transactions with a matching participant returned
- [ ] Search term matches description OR participant `member.name` (`lower(...) LIKE %term%`)
- [ ] A row matching on both description and name appears **once** (distinct / grouped so pagination count is correct)
- [ ] All filters compose with AND; description-vs-name is an OR *within* the search predicate
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests package`
**Tests**: none (compile-gated; DB-bound, verified in V) · **Gate**: build
**Commit**: `feat(transactions): filter by participant and search by participant name`
**Risk note**: watch the distinct/pagination interaction — a `JOIN participants` inflates the count unless de-duplicated. Verify total count against a known split transaction in V.

---

### B4: Backend sort — make `category` sortable — SORT-02
**What**: Allow `sortBy=category` mapped to the `category.name` association path, **nulls last** for both directions (uncategorized rows ordered consistently).
**Where**: `finsight-backend/.../services/FinancialTransactionService.java` (`SORTABLE_FIELDS` set) + `dto/PaginatedFilterDto.java` (`toPageable` — map `category` → `category.name`, apply `Sort.NullHandling.NULLS_LAST`)
**Depends on**: None
**Reuses**: existing `SORTABLE_FIELDS` whitelist + `toPageable` mapping
**Requirement**: SORT-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `category` accepted as a sort key; maps to `category.name` (auto left join)
- [ ] Uncategorized (null category) rows sort last in both asc and desc (`NULLS_LAST`)
- [ ] Unknown sort keys still rejected (existing validation intact)
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests package`
**Tests**: none (compile-gated; DB-bound, verified in V) · **Gate**: build
**Commit**: `feat(transactions): sort by category name (nulls last)`

---

### B5: Backend sort — make `attributed-to` sortable by largest-share participant — SORT-03  ⚠️ highest risk
**What**: Allow `sortBy=attributedTo`, ordering each transaction by the **name of its largest-share participant** (ties broken deterministically by name). Because this is a per-transaction aggregate (not a simple property path), implement the ordering in the Specification via a **correlated subquery** in `query.orderBy(...)`, and strip the Pageable's sort for this key so the specification owns the order.
**Where**: `finsight-backend/.../services/FinancialTransactionService.java` (recognize `attributedTo`, route to spec-owned ordering) + `specifications/FinancialTransactionSpecification.java` (add order-by via Criteria subquery) + `dto/PaginatedFilterDto.java` (allow the key, avoid double-ordering)
**Depends on**: None
**Reuses**: the participant join added in B3; Criteria `Subquery`/`orderBy` API
**Requirement**: SORT-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `attributedTo` accepted as a sort key
- [ ] Rows ordered by the largest-`share_amount` participant's `member.name`; personal (single-participant) rows order by that one name
- [ ] Ties (equal shares) break deterministically (e.g. by name) so paging is stable across page boundaries
- [ ] Ascending/descending both work; no duplicate rows introduced by the ordering join
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests package`
**Fallback (if the correlated-subquery order proves impractical with dynamic Specifications)**: implement via a dedicated native/JPQL finder for this sort key only, keeping the other filters — record a `SPEC_DEVIATION` here describing the chosen mechanism. Preferred approach remains subquery-in-Specification so it composes with the dynamic filters.
**Tests**: none (compile-gated; DB-bound, verified in V) · **Gate**: build
**Commit**: `feat(transactions): sort by largest-share participant`

---

### B6: Repository — participant-based aggregation across all dashboard queries + optional `memberId` — AGG-01, AGG-02, DASH-02, DASH-03, DASH-04, DASH-05
**What**: Rewrite the four dashboard aggregation queries to sum `tp.share_amount` via a participant join, each accepting an **optional `memberId`** that restricts to that member's shares. Under the SPLIT-01 invariant these produce identical unfiltered totals to today (AGG-02 regression).
**Where**: `finsight-backend/.../repositories/FinancialTransactionRepository.java` — `sumByPlanAndTypeAndDateRange`, `findCategoryBreakdown`, `findMonthlyTrend`, `findPersonBreakdown`
**Depends on**: B1 (invariant must be green first)
**Reuses**: the existing `findPersonBreakdown` participant join as the template for the other three
**Requirement**: AGG-01, AGG-02, DASH-02, DASH-03, DASH-04, DASH-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Totals, category breakdown, and monthly trend all sum `tp.share_amount` joined via participants
- [ ] Each accepts an optional `memberId`; when null → whole plan, when set → only that member's shares
- [ ] `findPersonBreakdown` also honors the optional `memberId` (filtered → single person) and remains consistent
- [ ] Join semantics chosen so no transaction is dropped in the unfiltered case (invariant guarantees ≥1 participation)
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests package`
**Tests**: none (compile-gated; DB-bound — regression + filter both verified in V) · **Gate**: build (+ boot/aggregation verify in V)
**Commit**: `feat(dashboard): participant-based aggregation with optional member filter`
**Critical**: AGG-02 regression — in V, confirm unfiltered dashboard numbers equal the pre-change values for the same date range.

---

### B7: Dashboard `memberId` plumbing — DTO + controller + service — DASH-01 (backend)
**What**: Add optional `memberId` to the dashboard filter DTO and endpoint; thread it from `DashboardController` → `DashboardService.getSummary` → the B6 repository methods.
**Where**: `finsight-backend/.../dto/DashboardFilterDto.java` (add field), `controllers/DashboardController.java` (bind param), `services/DashboardService.java` (`getSummary` → pass `memberId` to repo)
**Depends on**: B6
**Reuses**: existing `startDate`/`endDate` param plumbing on the dashboard endpoint
**Requirement**: DASH-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `memberId` optional param accepted on the dashboard endpoint (nullable)
- [ ] Passed through the service into all four aggregations
- [ ] Absent `memberId` → unchanged plan-wide summary
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests package`
**Tests**: none (compile-gated; DB-bound, verified in V) · **Gate**: build
**Commit**: `feat(dashboard): accept memberId filter param`

---

### F1: Transaction filter data-layer — `memberId` in DTO, query builder, and filter hook — FILT-01, FILT-03
**What**: Add `memberId` to the paged-transactions filter type + query string, and hold it in the filter hook state so it composes with the other filters.
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts` (`PagedFinancialTransactionsFilter` + sort union if needed), `src/api/utils/buildPagedQuery.ts` (emit `memberId`), `src/features/home/hooks/useTransactionFilters.ts` (state + inject into `filter`)
**Depends on**: B2, B3 (contract)
**Reuses**: existing `categoryId` filter wiring as the template; TanStack Query key already includes the filter
**Requirement**: FILT-01, FILT-03
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] `memberId?: number` on the filter type; emitted by `buildPagedQuery` when set
- [ ] Filter hook holds `memberId`, injects it into `filter`, and clears it independently
- [ ] Query key changes on `memberId` change (natural refetch)
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (no FE unit infra per TESTING.md; verified in V) · **Gate**: build
**Commit**: `feat(transactions): wire memberId into transaction filters`

---

### F2: Transaction filter UI — single-select member picker in the filter popover — FILT-01
**What**: Add a single-select "Attributed to" member picker to the transaction filter popover, backed by `useGetPlanMembers`; hide/collapse when the plan has ≤1 member (consistent with the existing "Attributed to" column rule).
**Where**: `finsight-frontend/src/features/home/components/transactions/TransactionFilterPopover.tsx` (+ wherever the popover reads/writes filter state, i.e. props from `TransactionsTab.tsx`/`useTransactionFilters`)
**Depends on**: F1
**Reuses**: `useGetPlanMembers` (`usePlanService.ts`); the existing select/category-picker control in the same popover
**Requirement**: FILT-01
**Tools**: MCP: NONE · Skill: `component-creation`
**Done when**:
- [ ] Single-select member picker present; selecting sets `memberId`, clearing resets it
- [ ] Members sourced from `useGetPlanMembers` for the active plan
- [ ] Picker hidden (or shows the lone member) when `members.length <= 1`
- [ ] Selecting a member filters the table to that participant at full row amount
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (verified in V) · **Gate**: build
**Commit**: `feat(transactions): member filter picker in filter popover`

---

### F3: Enable Category + Attributed-to column sorting (frontend) — SORT-02, SORT-03 (FE)
**What**: Turn on `enableSorting` for the Category and Attributed-to columns, add their sort keys (`category`, `attributedTo`) to the frontend `SORTABLE_FIELDS` whitelist and the `FinancialTransactionSortBy` union so the headers become clickable and send the right key.
**Where**: `finsight-frontend/src/features/home/components/transactions/transactionColumns.tsx` (enableSorting on the two columns), `src/features/home/hooks/useTransactionFilters.ts` (`SORTABLE_FIELDS`), `src/api/dtos/financialTransaction.ts` (`FinancialTransactionSortBy` union)
**Depends on**: B4, B5 (backend must accept the keys)
**Reuses**: existing sortable columns (`description`/`amount`/`startDate`) as the template
**Requirement**: SORT-02, SORT-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Category and Attributed-to headers are clickable and cycle asc → desc → off
- [ ] They send `sortBy=category` / `sortBy=attributedTo` respectively
- [ ] Non-sortable columns (actions) remain non-sortable
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (verified in V) · **Gate**: build
**Commit**: `feat(transactions): enable category and attributed-to sorting`

---

### F4: Fix the sort indicator/ordering mismatch — enforce a single active sort key — SORT-01
**What**: Change the shared table header sort toggle so clicking a column **replaces** the active sort (single-column) instead of appending to a multi-column array; the shown arrow then always matches what the server orders by (backend only reads `sorting[0]`).
**Where**: `finsight-frontend/src/components/table/components/TableHeader.tsx` (`toggleSort`) — and confirm no other table depends on multi-sort; if one does, scope the single-sort behavior appropriately.
**Depends on**: None
**Reuses**: existing `toggleSort` cycle logic
**Requirement**: SORT-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Clicking a sortable header replaces the prior sort; only the clicked column shows an arrow
- [ ] The applied server sort always matches the column whose arrow is shown (no `sorting[0]`-only mismatch)
- [ ] asc → desc → unsorted cycle preserved
- [ ] No regression to other tables using `TableHeader`
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (verified in V) · **Gate**: build
**Commit**: `fix(table): single active sort column matches indicator`

---

### F5: Dashboard filter data-layer — `memberId` in DTO + dashboard hook — DASH-01 (FE data)
**What**: Add `memberId` to the dashboard filter DTO and the dashboard service hook, so the dashboard query can scope to a member (query key includes it).
**Where**: `finsight-frontend/src/api/dtos/dashboard.ts` (`DashboardFilter`), `src/api/services/useDashboardService.ts` (`useGetDashboardSummary` — send `memberId`, include in key)
**Depends on**: B7 (contract)
**Reuses**: existing `startDate`/`endDate` handling in the same hook
**Requirement**: DASH-01
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] `memberId?: number` on `DashboardFilter`; sent when set; in the query key
- [ ] Absent → unchanged plan-wide request
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (verified in V) · **Gate**: build
**Commit**: `feat(dashboard): wire memberId into dashboard filter`

---

### F6: Dashboard filter UI — single-select member picker on the overview — DASH-01, DASH-05
**What**: Add a single-select member picker to the dashboard overview alongside the period selector; selecting a member re-scopes every widget (summary/category/trend/person) to that user's share via the F5 param. Category limits remain plan-total (unchanged — see spec DASH-06 decision).
**Where**: `finsight-frontend/src/features/home/components/overview/OverviewTab.tsx` (add picker + pass `memberId` to `useGetDashboardSummary`); person-breakdown widget shows the single filtered user (or is hidden) — `PersonBreakdownList.tsx` if a tweak is needed
**Depends on**: F5
**Reuses**: `useGetPlanMembers`; the existing period-selector layout in `OverviewTab`
**Requirement**: DASH-01, DASH-05
**Tools**: MCP: NONE · Skill: `component-creation`
**Done when**:
- [ ] Single-select member picker on the overview; hidden/lone when `members.length <= 1`
- [ ] Selecting a member re-scopes summary cards, category chart, and monthly trend to that user's share
- [ ] Person breakdown reflects the filtered scope (single user or hidden)
- [ ] Category limit bars unchanged (plan-total) when filtered — no error, just full-limit denominator
- [ ] Clearing returns to the whole-plan view
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (verified in V) · **Gate**: build
**Commit**: `feat(dashboard): member filter picker on overview`

---

### V: Full-stack E2E verification — all requirements
**What**: Boot both apps against a **copy** of the dev DB and exercise every requirement end-to-end. Backend `SERVER_PORT=3099`. Never touch the real `dev_finsight`.
**Where**: runtime, both apps
**Depends on**: B3, B5, B6, B7, F2, F3, F4, F6
**Reuses**: the E2E approach from Splitting/Items (API-driven backend checks + FE visual pass)
**Requirement**: ALL (FILT-01..03, DASH-01..05, AGG-01..03, SRCH-01, SORT-01..04)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] **AGG-02 regression**: unfiltered dashboard numbers equal the pre-change values for the same date range (record before/after)
- [ ] **DASH-02/03/04**: with a known split (e.g. 50/50), dashboard filtered to user A shows A's half in summary, category, and trend
- [ ] **FILT-01/02**: table filtered to a member shows only their participated transactions, at full amount; composes with other filters; empty member → graceful empty
- [ ] **SRCH-01**: searching a member's name returns their transactions with no duplicate rows and correct total count
- [ ] **SORT-01**: clicking a second sortable column moves the arrow and the actual order together (no mismatch)
- [ ] **SORT-02/03**: Category sorts by name (nulls last); Attributed-to sorts by largest-share participant, stable across a page boundary
- [ ] Backend boots with Hibernate `validate` (no schema drift — there shouldn't be any)
- [ ] Results recorded in the Progress Log
**Tests**: e2e (runtime) · **Gate**: full (boot/aggregation verify + FE visual)
**Commit**: none (verification) — or `test:` note if any fixture added

---

## Validation Tables (pre-approval gates)

### Check 1 — Granularity
| Task | Scope | Status |
| --- | --- | --- |
| B1 | 2 read-only queries | ✅ |
| B2 | 1 param through 3 touch-points (DTO/controller/service), one concept | ✅ |
| B3 | 1 specification file, one cohesive join (filter+search) | ✅ |
| B4 | 1 sort key mapping | ✅ |
| B5 | 1 sort key (subquery order) | ✅ |
| B6 | 4 sibling queries, one pattern, one file | ⚠️ cohesive (same rewrite × 4) — kept together intentionally |
| B7 | 1 param plumbing | ✅ |
| F1 | data-layer wiring (3 files, one concept) | ✅ |
| F2 | 1 UI control | ✅ |
| F3 | enable-sorting toggle (2 columns + keys) | ✅ |
| F4 | 1 function fix | ✅ |
| F5 | data-layer wiring (2 files, one concept) | ✅ |
| F6 | 1 UI control | ✅ |
| V | verification | ✅ |

> B6 is deliberately one task: the four queries are the identical transform in one file; splitting them would fragment a single cohesive change and multiply compile cycles. If the executor finds them diverging, split B6a (totals+category+trend) / B6b (person breakdown).

### Check 2 — Diagram ↔ Definition cross-check
| Task | Depends on (body) | Diagram | Status |
| --- | --- | --- | --- |
| B1 | none | none | ✅ |
| B2 | none | none | ✅ |
| B3 | B2 | B2→B3 | ✅ |
| B4 | none | [P] | ✅ |
| B5 | none | [P] | ✅ |
| B6 | B1 | B1→B6 | ✅ |
| B7 | B6 | B6→B7 | ✅ |
| F1 | B2,B3 | {B2,B3}→F1 | ✅ |
| F2 | F1 | F1→F2 | ✅ |
| F3 | B4,B5 | {B4,B5}→F3 | ✅ |
| F4 | none | independent | ✅ |
| F5 | B7 | B7→F5 | ✅ |
| F6 | F5 | F5→F6 | ✅ |
| V | B3,B5,B6,B7,F2,F3,F4,F6 | all→V | ✅ |

### Check 3 — Test co-location
Per TESTING.md convention (pure logic → unit; DB/HTTP-bound → compile-gate + final E2E; no FE unit infra), **no task in this round creates pure business logic** — the only candidate (largest-share selection, B5) is implemented in SQL, not Java, so it's DB-bound and verified in V. All tasks are therefore compile/build-gated with E2E in V. No `Tests: none` hides a deferral of a required unit test.
| Task | Layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| B2,B3,B4,B5,B6,B7 | DB/HTTP-bound backend | compile + E2E | none + build → E2E in V | ✅ |
| F1–F6 | FE (no unit infra) | build + E2E | none + build → E2E in V | ✅ |
| B1, V | verification | none | none | ✅ |

---

## Progress Log

### 2026-07-16 — Execute session (fresh, per handoff-execute.md)

**B1 — SPLIT-01 integrity gate: ✅ PASSED (read-only against live `dev_finsight` via SSH tunnel).**
- Total transactions: **258**
- Q1 orphans (tx with no participation): **0 rows**
- Q2 sum-mismatch (`SUM(share_amount) <> amount`): **0 rows**
- Invariant holds on live data → B6 participant-based aggregation is safe to ship. No backfill/remediation needed.

**Backend (B2–B7) — implemented, compile-gated green (`./mvnw -q -DskipTests package`), committed on `finsight-backend` main:**
- **B2** `ae689b2` — `memberId` on `FinancialTransactionFilterDto` (bound automatically via `@ModelAttribute`).
- **B3+B4+B5** `6182246` — committed together (all three co-modify `findAllByPlanPaged` + the specification file):
  - B3: `hasParticipant(memberId)` + `matchesSearchTerm` (description OR participant name) both via **EXISTS subquery** → no row multiplication, no distinct needed, paginated count stays correct.
  - B4: `category` sortable → `orderByCategoryName` uses an explicit **LEFT JOIN** + null-rank order key so uncategorized rows always sort **last** in both directions. NOTE: sorts by `category.description` (the actual display field), **not** `category.name` as the task text said — the model has no `name` field; corrected to match reality.
  - B5: `attributedTo` sortable → `orderByLargestShareParticipant` via a **correlated subquery** (`least(member.name)` among participants whose `shareAmount = MAX(shareAmount)` for the tx) → largest-share participant, ties broken by name. Spec owns the ORDER BY; Pageable left unsorted for these two keys. Count-query guard (`resultType == Long`) skips the ordering during pagination counts. Preferred subquery-in-Specification approach held — **no SPEC_DEVIATION / native fallback needed** (pending runtime confirmation in V).
- **B6** `dbfd978` — four dashboard queries (`sumByPlanAndTypeAndDateRange`, `findCategoryBreakdown`, `findMonthlyTrend`, `findPersonBreakdown`) rewritten to `SUM(tp.shareAmount)` via `JOIN ft.participants tp` + optional `memberId` (`:memberId IS NULL OR tp.member.id = :memberId`). Item-sum queries (B/I) left plan-total — the item×member-filter interaction is a documented Round-2 gap, **inert today (0 live items)** and cannot move the unfiltered numbers.
- **B7** `342a8b6` — `memberId` on `DashboardFilterDto` + controller bind + threaded through `DashboardService.getSummary` into all four aggregations.
- **Data prevalence (informs V):** 258 tx, **0** with items, **17** with >1 participant, **0** with both items and a split.

**Frontend (F1–F6) — implemented, gated green (`npm run build` = tsc+vite clean; `npm run lint` baseline unchanged at 23 errors/17 warnings, all pre-existing in untouched files, **0** added), committed on `finsight-frontend` main:**
- **F1+F2** `f9c3357` — committed together (share the `AppliedFilters` shape): `memberId` on `PagedFinancialTransactionsFilter` (emitted automatically by the generic `buildPagedQuery`); `useTransactionFilters` holds `memberForDisplay`, member chip clears independently; single-select "Attributed to" picker in the filter popover (hidden when `members<=1`).
- **F4** `1863d25` — `TableHeader.toggleSort` now **replaces** the active sort (single key) instead of appending; only `TransactionsTab` consumes it (no multi-sort regression).
- **F3** `8295eb6` (+ the sort-union/`SORTABLE_FIELDS` edits rode along in `f9c3357` since they share files) — `enableSorting` on Category + Attributed-to; column ids map `category`→`category`, `participants`→`attributedTo`.
- **F5+F6** `486ef45` — `memberId` on `DashboardFilter` (sent + in query key via existing params flow); overview toolbar member picker (hidden when `members<=1`) re-scoping every widget; category-limit bars stay plan-total (Round-2).
- **Impl note:** `StandardCombobox` requires items with an `id`; `PlanMember` keys on `userId`, so both pickers adapt members to a lightweight `{id,name}` option (`toMemberOption` / `memberOptions`).

**V — Full-stack E2E: ✅ ALL PASS.** Booted the built jar (`SERVER_PORT=3099`) against a **copy** DB (`dev_finsight_verify`, TEMPLATE of `dev_finsight`, 258 tx) reached via the SSH tunnel; Hibernate `validate` passed (no schema drift — no migration this round, as designed). Authenticated as a throwaway OWNER of plan 5 (registered `verify_bot@t.com` in the copy, granted membership by SQL — copy only). Results:
- **AGG-02 regression (SQL + endpoint):** unfiltered income **85067.68** / expense **31741.30** identical between old `SUM(ft.amount)` and new `SUM(tp.share_amount)` forms — for totals, category breakdown, and monthly trend (byte-for-byte, zero mismatched rows). Endpoint dashboard returned the same numbers.
- **DASH-02/03/04/05 (partition holds):** filtered expense Lucas **17020.24** + Livia **14721.06** = **31741.30** unfiltered; income 52967.68+32100.00=85067.68; net sums too. Category breakdown partitions across all **15** categories (unfiltered spent == Lucas+Livia per category). Monthly trend member-scoped. Person breakdown filtered → single user (Lucas only).
- **FILT-01/02 + compose:** `memberId=1`→146, `memberId=2`→129, all→258, `memberId=3` (non-member)→0 empty/graceful; `memberId=2 & type=DEBIT` composes (110).
- **SRCH-01 (no dupes):** `description=livia` → 129 = SQL distinct count (EXISTS ⇒ no row multiplication, paginated `totalElements` correct); `description=passagens` → 5; full page returned 100 unique ids.
- **SORT-02 (category, nulls last):** executes both directions; the single uncategorized tx lands **last** on the final page (asc).
- **SORT-03 (attributed-to, largest-share):** the correlated-subquery ORDER BY (highest-risk item) **executes HTTP 200** both directions; largest-share names sorted correctly (asc→Livia…, desc→Lucas…) and **monotonic across the page-0/page-1 boundary** (stable paging). No native-query fallback needed.
- **SORT-01 (single-active-sort):** FE-only `TableHeader` fix (no backend surface) — covered by build + code; flag for the visual pass.
- **Teardown:** java stopped, copy DB dropped, real `dev_finsight` **never written by me** (verify_bot absent from real; all `created_by ∈ {1,2,3}`). NOTE: real `dev_finsight` grew 258→266 during the session from the **user's own app activity** (tx 421–428, all `created_by=1` "DAS MEI"/"Mercado") — unrelated to this work.
- **Still pending:** human **visual pass** of the FE pickers + sort UI (build-green ≠ runtime-correct for Base UI / StandardCombobox — see STATE L-002).
