# Transaction Line Items — Tasks

**Design**: `./design.md`
**Spec**: `./spec.md`
**Status**: Draft (awaiting approval → execute in a fresh session)

> **Migration numbering (re-verify at Execute — see STATE L-004).** Design assumes `V7__add_transaction_items.sql`
> (last on `main` at planning time = `V6`). Before T1, `ls finsight-backend/src/main/resources/db/migration/`
> and renumber to the next free version if anything landed in the interim; record a `SPEC_DEVIATION` note here.

> **Testing note (inherited from TESTING.md + Splitting precedent).** No integration/E2E infra; even the
> `@SpringBootTest` stub needs a DB. Project rule: **pure logic gets real unit tests**; all DB/HTTP-bound code is
> **compile-gated** + verified in the final runtime E2E (both apps up). Gates:
> - Backend compile: `cd finsight-backend && ./mvnw -q -DskipTests package` (compiles without a DB)
> - Backend unit: `./mvnw test -Dtest=<TestName>`
> - Frontend: `cd finsight-frontend && npm run lint && npm run build` (respect the pre-existing lint baseline — don't regress)
> - Boot/migration verify: start the app with Flyway against a **copy** of the dev DB (`SERVER_PORT=3099`); Hibernate `validate` must pass

> **Tools note.** MCP: NONE throughout (matches Splitting). Skills assigned per FE task following the established
> pattern (`api-integration`, `form-creation`, `component-creation`). Adjust at approval if desired.

---

## Execution Plan

### Phase 1 — Data foundation (Sequential)
```
T1 → T2
```

### Phase 2 — Building blocks (Parallel after T2)
```
        ┌→ T3 [P]  request DTO (ItemInputDto)
        ├→ T4 [P]  response DTO (ItemDto)
T2 ─────┼→ T6 [P]  repo queries A/B/I (build)
        └→ T7 [P]  pure breakdown assembler + UNIT TESTS
```

### Phase 3 — Backend integration (Parallel, compile serializes)
```
{T2,T3} → T5   applyItems in create/update
{T6,T7} → T8   wire item-aware breakdown into DashboardService
```

### Phase 4 — Frontend P1 (Sequential)
```
T4 → T9 → T10
```

### Phase 5 — P2 (after P1 lands)
```
{T3,T4,T9,T10} → T11  quantity
T9 → T12              table itemized indicator
```

### Phase 6 — P3
```
T5 → T13  series items replication + generator unit tests
```

### Phase 7 — Verify (Sequential)
```
{T5,T8,T10 (+T11,T12,T13 if done)} → T14  full-stack E2E
```

---

## Task Breakdown

### T1: Migration V7 — `transaction_items` table
**What**: Additive Flyway migration creating `transaction_items` (FK→transactions ON DELETE CASCADE, nullable FK→categories, description, amount, quantity, positive checks, indexes). **No backfill** (zero items = today's behavior).
**Where**: `finsight-backend/src/main/resources/db/migration/V7__add_transaction_items.sql`
**Depends on**: None
**Reuses**: DDL style of V2/V6 migrations
**Requirement**: ITEM-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Creates `transaction_items {id, transaction_id FK→financial_transactions ON DELETE CASCADE NOT NULL, category_id FK→financial_transaction_categories NULL, description VARCHAR(255) NOT NULL, amount NUMERIC(19,2) NOT NULL, quantity INTEGER NOT NULL DEFAULT 1}`
- [ ] `CHECK (amount > 0)` and `CHECK (quantity > 0)`; indexes `idx_txn_items_txn`, `idx_txn_items_category`
- [ ] No backfill, no destructive statement; version number re-verified against the migration dir
**Tests**: none · **Gate**: build (boot-verify in T2)
**Commit**: `feat(items): V7 migration for transaction_items table`

---

### T2: `TransactionItem` entity + `items` collection on `FinancialTransaction`
**What**: New `TransactionItem` entity mapping T1's table; add `@OneToMany(cascade=ALL, orphanRemoval=true) List<TransactionItem> items` (getter-only, in-place) to `FinancialTransaction`. Boot-verify against a dev-DB copy.
**Where**: `models/TransactionItem.java` (new), `models/FinancialTransaction.java` (modify)
**Depends on**: T1
**Reuses**: `TransactionParticipant` mapping + the `participants` collection as the exact template; FK style of `FinancialTransaction.category`/`plan`
**Requirement**: ITEM-01, ITEM-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `TransactionItem {transaction @ManyToOne(optional=false), category @ManyToOne(nullable), description, amount, quantity}` with getters/setters
- [ ] `quantity` field **initialized to `1`** in the entity (avoids a NOT-NULL insert violation, since Hibernate emits the mapped column)
- [ ] `FinancialTransaction` gains `items` (`@OneToMany`, cascade+orphanRemoval, getter-only); `amount`/`category`/`type`/`participants` untouched
- [ ] **Boot-verify**: app boots with Flyway applying V7 and Hibernate `validate` passes against a dev-DB copy (`SERVER_PORT=3099`)
**Tests**: none · **Gate**: build + boot-verify
**Commit**: `feat(items): TransactionItem entity + items collection on FinancialTransaction`

---

### T3: Request DTO accepts `items` [P]
**What**: New `ItemInputDto {description, amount, categoryId?, quantity?}`; add `@Valid List<ItemInputDto> items` to `FinancialTransactionRequestDto`. (Series request DTO deferred to T13/P3.)
**Where**: `dtos/request/ItemInputDto.java` (new), `dtos/request/FinancialTransactionRequestDto.java` (modify)
**Depends on**: None
**Reuses**: Bean Validation idiom (`@NotBlank`/`@NotNull`/`@Positive`) already in the request DTOs; `ParticipantInputDto` as shape template
**Requirement**: ITEM-01, ITEM-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `ItemInputDto`: `description @NotBlank`, `amount @NotNull @Positive`, `categoryId` optional, `quantity` optional `@Positive`
- [ ] `FinancialTransactionRequestDto` exposes `items` (optional, `@Valid`) with getter
**Tests**: none · **Gate**: build
**Commit**: `feat(items): request DTO accepts line items`

---

### T4: Response DTO exposes `items` [P]
**What**: Nested `ItemDto {id, description, amount, quantity, category}`; add `List<ItemDto> items` to `FinancialTransactionResponseDto`, built from `transaction.getItems()`.
**Where**: `dtos/response/FinancialTransactionResponseDto.java` (modify)
**Depends on**: T2
**Reuses**: Nested `ParticipantDto`/`CreatedByDto` pattern; `FinancialTransactionCategoryResponseDto` for the item's `category`
**Requirement**: ITEM-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `ItemDto` nested class (category null when uncategorized), constructed from each `TransactionItem`
- [ ] `items` field on the response with getter
**Tests**: none · **Gate**: build
**Commit**: `feat(items): response DTO exposes line items`

---

### T5: `applyItems` in create/update
**What**: Helper `applyItems(txn, items, ctx)` — per-item validation (amount>0, description not blank, category in-plan + `category.type == txn.type`), enforce `Σamount ≤ txn.amount`, then **full-replace** the collection (clear + add; orphanRemoval deletes old). Wired into `create` and `update`. **No new authz gate** (reuse existing modify/create guards).
**Where**: `services/FinancialTransactionService.java` (modify)
**Depends on**: T2, T3
**Reuses**: `applyParticipants` as the structural blueprint; `financialTransactionCategoryService` (resolve/validate category in plan); `ctx.getPlan()/getUser()`
**Requirement**: ITEM-01, ITEM-02, ITEM-04, ITEM-05, ITEM-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Null/empty `items` ⇒ collection cleared (valid, no error)
- [ ] Each item: `amount > 0`, `description` not blank; if `categoryId` set ⇒ category resolved in `ctx.getPlan()` and `category.type == txn.getType()` (else `IllegalArgumentException` → 400)
- [ ] `Σ item.amount > txn.amount` ⇒ `IllegalArgumentException` → 400
- [ ] `create` and `update` call the helper; `update` replaces items via orphanRemoval; `created_by`/`plan` untouched
- [ ] No change to authorization (existing `requireCanCreate/ModifyTransaction` cover it)
**Tests**: none (DB-bound → E2E in T14) · **Gate**: build
**Commit**: `feat(items): validate and persist line items on create/update`

---

### T6: Repository queries A / B / I for the item-aware breakdown [P]
**What**: Extend `findCategoryBreakdown` to also select `category.id` (stable key = query **A**); add **B** (categorized item sums grouped by *parent* category) and **I** (categorized item sums grouped by *item* category, carrying description+limit).
**Where**: `repositories/FinancialTransactionRepository.java` (modify)
**Depends on**: T2
**Reuses**: Existing `findCategoryBreakdown` JPQL as the base for A; `findPersonBreakdown`'s `JOIN ft.<collection>` idiom for B/I
**Requirement**: ITEM-07
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] **A**: existing query returns `[category.id, description, spendingLimit, SUM(ft.amount)]` grouped by `ft.category` (filtered `ft.category IS NOT NULL`, `ft.type`, date range)
- [ ] **B**: `SELECT ft.category.id, COALESCE(SUM(it.amount),0) FROM FinancialTransaction ft JOIN ft.items it WHERE ft.plan=:plan AND ft.type=:type AND ft.category IS NOT NULL AND it.category IS NOT NULL AND ft.startDate BETWEEN :s AND :e GROUP BY ft.category.id`
- [ ] **I**: `SELECT it.category.id, it.category.description, it.category.spendingLimit, COALESCE(SUM(it.amount),0) FROM FinancialTransaction ft JOIN ft.items it WHERE ft.plan=:plan AND ft.type=:type AND it.category IS NOT NULL AND ft.startDate BETWEEN :s AND :e GROUP BY it.category.id, it.category.description, it.category.spendingLimit`
**Tests**: none (DB-bound → E2E in T14) · **Gate**: build
**Commit**: `feat(items): repository queries for item-aware category breakdown`

---

### T7: Pure breakdown assembler + unit tests [P]
**What**: A **pure** component that takes the A/B/I row-lists (+ the plan's limit-bearing categories for the zero-spend back-fill) and returns `List<CategoryBreakdownDto>` computing `spent[C] = A[C] − B[C] + I[C]`, sorted by spent desc. This is the one place a silent mis-attribution bug could hide — so it gets **real unit tests**.
**Where**: `services/CategoryBreakdownAssembler.java` (new, pure) + `src/test/java/.../CategoryBreakdownAssemblerTest.java`
**Depends on**: None (operates on plain rows + existing `CategoryBreakdownDto`)
**Reuses**: `CategoryBreakdownDto` constructor (limit math unchanged); `BigDecimal`/`HALF_UP` idiom; test style of `SplitResolverTest`
**Requirement**: ITEM-07, ITEM-08
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `assemble(rowsA, rowsB, rowsI, limitCategories)` → `List<CategoryBreakdownDto>` with `spent = A−B+I` per category (union of A and I keys)
- [ ] Zero-limit back-fill: categories with a `spendingLimit` but no spend appear with `spent = 0` (existing behavior preserved)
- [ ] Unit tests cover: **worked example** (grocery 150 → Groceries 20 / Food 90 / Cleaning 40), non-itemized txn (`spent==amount`), item-only category (appears via I with no A), fully-itemized (remainder 0 ⇒ parent contributes 0), two items same category (summed), zero-limit back-fill row
- [ ] Gate: `./mvnw test -Dtest=CategoryBreakdownAssemblerTest` — all green
**Tests**: unit · **Gate**: `./mvnw test -Dtest=CategoryBreakdownAssemblerTest`
**Commit**: `feat(items): pure category-breakdown assembler (A−B+I) + unit tests`

---

### T8: Wire item-aware breakdown into `DashboardService`
**What**: Rewrite `buildCategoryBreakdown` to call the three T6 queries and delegate to the T7 assembler (passing `findAllByPlan` limit categories for back-fill). Totals / monthly trend / person breakdown untouched.
**Where**: `services/DashboardService.java` (modify)
**Depends on**: T6, T7
**Reuses**: T6 queries, T7 assembler, existing `financialTransactionCategoryRepository.findAllByPlan`
**Requirement**: ITEM-07, ITEM-08, ITEM-09
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `buildCategoryBreakdown` fetches A/B/I + limit categories and returns `assembler.assemble(...)`
- [ ] Totals (`sumByPlanAndTypeAndDateRange`), monthly trend, person breakdown **unchanged** (verify by diff — no edits to those methods)
**Tests**: none (DB-bound → E2E in T14) · **Gate**: build
**Commit**: `refactor(items): category breakdown becomes item-aware (PLAN-07/08)`

---

### T9: FE types + service payload
**What**: `TransactionItem`/`ItemInput` types; add `items` to the `FinancialTransaction` type and to the create/update request body.
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts`, `src/api/services/useFinancialTransactionService.ts` (modify)
**Depends on**: T4
**Reuses**: Skill `api-integration`; existing DTO/service patterns (participants added the same way)
**Requirement**: ITEM-01
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] `TransactionItem {id, description, amount, quantity, category?}` + `ItemInput {description, amount, categoryId?, quantity?}`
- [ ] `FinancialTransaction` gains `items: TransactionItem[]`; create/update body accepts `items?: ItemInput[]`
- [ ] Gate: `npm run lint && npm run build`
**Tests**: none · **Gate**: build
**Commit**: `feat(items): frontend types + service payload for line items`

---

### T10: Items section in `TransactionFormDrawer` (P1)
**What**: A repeatable "Items" field group (`useFieldArray`) — rows of {description, amount, category (reuse `CategoryCombobox`, filtered to the form's current type)}, add/remove, a live **remainder** (`amount − Σitems`), and a zod refinement blocking submit when `Σitems > amount`. Pre-load items in edit mode; wire into the submit payload.
**Where**: `finsight-frontend/src/features/home/components/transactions/TransactionFormDrawer.tsx` (+ a sub-component for the item rows)
**Depends on**: T9
**Reuses**: Skills `form-creation` + `component-creation`; `CategoryCombobox`; the split-selector `superRefine` (T12 of Splitting) as the sum-validation template
**Requirement**: ITEM-02, ITEM-10, ITEM-11
**Tools**: MCP: NONE · Skill: `form-creation`, `component-creation`
**Done when**:
- [ ] Add/remove item rows; each row has description, amount, category picker (type-filtered)
- [ ] Live remainder shown; zod `superRefine` blocks submit when `Σitems > amount` (mirrors server rule)
- [ ] Edit mode pre-loads existing items; payload sends `items`
- [ ] Section available on both DEBIT and CREDIT transactions
- [ ] Gate: `npm run lint && npm run build`
**Tests**: none (FE precedent: build gate) · **Gate**: build
**Commit**: `feat(items): line-items section in the transaction form`

---

### T11: Quantity per item (P2)
**What**: Wire `quantity` end-to-end — add to `ItemInputDto`/`ItemDto` (backend), the FE types, and a per-row quantity input (default 1). Amount stays the line total (no auto-multiply).
**Where**: `dtos/request/ItemInputDto.java`, `dtos/response/FinancialTransactionResponseDto.java`, `financialTransaction.ts`, `TransactionFormDrawer.tsx` (modify)
**Depends on**: T3, T4, T9, T10
**Reuses**: The item plumbing from T3/T4/T9/T10
**Requirement**: ITEM-12
**Tools**: MCP: NONE · Skill: `form-creation`
**Done when**:
- [ ] `quantity` optional in request (default 1, `@Positive`), present in response + FE types
- [ ] Per-row quantity input; `applyItems` persists it (already mapped on the entity from T2)
- [ ] Gate: backend build + `npm run lint && npm run build`
**Tests**: none · **Gate**: build
**Commit**: `feat(items): optional quantity per line item`

---

### T12: Itemized indicator in the transactions table (P2)
**What**: Show an indicator (item count) on itemized rows and let the user view the items (expand/detail).
**Where**: `finsight-frontend/src/features/home/components/transactions/transactionColumns.tsx` (+ sub-component)
**Depends on**: T9
**Reuses**: Skill `component-creation`; the `ParticipantsCell` pattern (native `title` tooltip, avoiding new Base UI primitives — see L-002)
**Requirement**: ITEM-13
**Tools**: MCP: NONE · Skill: `component-creation`
**Done when**:
- [ ] Rows with `items.length > 0` show a count indicator; items are viewable (expand or popover/detail)
- [ ] No new runtime-context primitive introduced without its required wrapper (L-002)
- [ ] Gate: `npm run lint && npm run build`
**Tests**: none · **Gate**: build
**Commit**: `feat(items): itemized indicator + item view in transactions table`

---

### T13: Items replicated across a generated series (P3)
**What**: Add `items` to the series request DTO; `RecurringTransactionGenerator` stamps a copy of the items into each occurrence (mirrors participant stamping). Extend generator unit tests.
**Where**: `dtos/request/FinancialTransactionSeriesRequestDto.java`, `services/FinancialTransactionService.java` (`createSeries`), `services/RecurringTransactionGenerator.java` (modify) + `RecurringTransactionGeneratorTest`
**Depends on**: T5
**Reuses**: Participant-stamping precedent (Splitting T7); existing generator loop; `applyItems` validation
**Requirement**: ITEM-14
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Series request accepts `items`; each generated occurrence carries a copy (same items per occurrence)
- [ ] `Σitems ≤ amount` validated once against the per-occurrence amount
- [ ] Generator tests cover item replication (INSTALLMENT + RECURRING) — count ≥ existing + new, no silent deletions
- [ ] Gate: `./mvnw test -Dtest=RecurringTransactionGeneratorTest`
**Tests**: unit · **Gate**: `./mvnw test -Dtest=RecurringTransactionGeneratorTest`
**Commit**: `feat(items): stamp line items on each generated series occurrence`

---

### T14: Full-stack E2E — final verification
**What**: Boot backend + frontend and exercise every AC against the real API, plus verify the item-aware breakdown numerically and the "totals unchanged" invariant.
**Where**: N/A (verification)
**Depends on**: T5, T8, T10 (+ T11, T12, T13 if implemented)
**Reuses**: Splitting T13 E2E method (API-driven, throwaway data, cleanup + baseline re-verify at the end)
**Requirement**: ITEM-01..14
**Tools**: MCP: NONE · Skill: NONE
**Done when** (each confirmed by HTTP status/response or a `psql`/dashboard read):
- [ ] **Create + read**: transaction 150 with items food 90 (Food) / cleaning 40 (Cleaning) persists; GET returns both items
- [ ] **Breakdown**: dashboard shows Food +90, Cleaning +40, parent-category +20 (remainder); **expense total still 150** (unchanged)
- [ ] **No items**: a plain transaction still counts full amount under its category (regression check)
- [ ] **Loose/overflow**: `Σitems > amount` ⇒ **400**; item `amount ≤ 0` / blank description ⇒ 400
- [ ] **Category rules**: item category not in plan ⇒ 400; item category type ≠ transaction type ⇒ 400
- [ ] **Update reconcile**: removing/adding items on update replaces the set (orphanRemoval); inline-editing amount below Σitems ⇒ 400
- [ ] **Authz**: whoever can edit the transaction can edit its items; no new denial path
- [ ] **Uncategorized-parent**: a categorized item on a category-less transaction still shows under its item category; the remainder stays out of the breakdown (design decision)
- [ ] **(if T13) Series**: each occurrence carries the items
- [ ] **FE**: form add/remove items + live remainder + submit works (flag for human visual pass, per L-002)
- [ ] Gates: backend `./mvnw -q -DskipTests package`; frontend `npm run lint && npm run build`
- [ ] Throwaway data cleaned; pre-existing real data unchanged (verify via `psql` against the baseline)
**Tests**: none (E2E manual/API) · **Gate**: full (both apps up)
**Commit**: (no code commit — update this tasks.md with the E2E results)

---

## Parallel Execution Map
```
Phase 1 (seq):   T1 ──→ T2
Phase 2 (par):   T2 ──┬─→ T3 [P] (build)
                      ├─→ T4 [P] (build)
                      ├─→ T6 [P] (build)
                      └─→ T7 [P] (UNIT)      # pure, no dep on T6 — assembler tested on sample rows
Phase 3 (par*):  {T2,T3} ─→ T5 (build)
                 {T6,T7} ─→ T8 (build)       # *compile serializes; disjoint files
Phase 4 (seq):   T4 ──→ T9 ──→ T10
Phase 5 (P2):    {T3,T4,T9,T10} ─→ T11 ;  T9 ─→ T12
Phase 6 (P3):    T5 ──→ T13 (UNIT)
Phase 7 (seq):   {T5,T8,T10 (+T11,T12,T13)} ──→ T14
```
> **Parallelism note**: T7 and T13 are unit-gated pure logic (parallel-safe). T3/T4/T5/T6/T8 are build-gated backend
> on disjoint files — develop concurrently via sub-agents, but the compile gate serializes (`mvnw package` one at a
> time), as in Shared Plans / Splitting.

---

## Pre-Approval Validation

### Check 1 — Task Granularity
| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 migration | ✅ |
| T2 | 1 entity + 1 collection mapping (cohesive: model) | ✅ |
| T3 | 1 DTO + 1 nested input DTO (cohesive) | ✅ |
| T4 | 1 response DTO | ✅ |
| T5 | 1 helper + create/update wiring | ✅ |
| T6 | 3 repo queries (cohesive: breakdown inputs) | ✅ |
| T7 | 1 pure class + unit tests | ✅ |
| T8 | 1 method rewrite | ✅ |
| T9 | FE types + payload (cohesive) | ✅ |
| T10 | 1 form section | ✅ |
| T11 | quantity plumbing (thin, cross-layer but one concept) | ✅ |
| T12 | 1 column/component | ✅ |
| T13 | series DTO + generator (cohesive) | ✅ |
| T14 | verification | ✅ |

### Check 2 — Diagram ↔ Definition Cross-Check
| Task | Depends on (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | root | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | None (grouped Phase 2) | T2→T3 | ✅ (note in body) |
| T4 | T2 | T2→T4 | ✅ |
| T5 | T2, T3 | {T2,T3}→T5 | ✅ |
| T6 | T2 | T2→T6 | ✅ |
| T7 | None (grouped Phase 2) | T2→T7 | ✅ (note in body/map) |
| T8 | T6, T7 | {T6,T7}→T8 | ✅ |
| T9 | T4 | T4→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | T3,T4,T9,T10 | {…}→T11 | ✅ |
| T12 | T9 | T9→T12 | ✅ |
| T13 | T5 | T5→T13 | ✅ |
| T14 | T5,T8,T10(+T11,T12,T13) | →T14 | ✅ |

### Check 3 — Test Co-location Validation
| Task | Layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | migration | none | none | ✅ |
| T2 | model (JPA) | none (gap) | none+boot | ✅ |
| T3 | DTO | none | none | ✅ |
| T4 | DTO | none | none | ✅ |
| T5 | service (DB-bound) | none (gap) → E2E | none | ✅ |
| T6 | repository query | none (gap) → E2E | none | ✅ |
| T7 | **pure logic** | unit (precedent) | **unit** | ✅ |
| T8 | service (DB-bound) | none (gap) → E2E | none | ✅ |
| T9 | FE api/service | none (build) | none | ✅ |
| T10 | FE form | build (precedent) | none | ✅ |
| T11 | FE form + DTO | build/none | none | ✅ |
| T12 | FE component | build (precedent) | none | ✅ |
| T13 | generator (pure) | unit (precedent) | **unit** | ✅ |
| T14 | E2E | full | none/E2E | ✅ |

> DB/HTTP-bound layers are "none (gap)" in the matrix → verified in the runtime E2E (T14), per the Splitting
> precedent. The breakdown assembler (T7) and generator (T13) are pure logic and get **real unit tests** — T7 is the
> critical one (the only place a silent mis-attribution bug could live).

---

## Progress Log

**2026-07-15 — P1 (T1–T10) executed, backend E2E passed, FE visual pass pending.**

- Migration re-verify (L-004): `V7` was still free (`V6` was the last on disk) — no renumbering needed, no SPEC_DEVIATION.
- T1–T10 all implemented, gated (backend `./mvnw -q -DskipTests package` green throughout; T7 unit tests: `CategoryBreakdownAssemblerTest`, 6/6 green; frontend `npm run lint && npm run build` green), and committed as separate atomic commits on `main` (both repos):
  - Backend: `2edf5ee` (T1) · `c69df50` (T2) · `7f0b76d` (T3) · `4309f41` (T4) · `5b27a92` (T6) · `98c5b7b` (T7) · `2a4188f` (T5) · `e475680` (T8)
  - Frontend: `a2bfaf1` (T9) · `301ae87` (T10)
  - T3/T4/T6/T7 were built in parallel via sub-agents (disjoint files); T2's boot-verify and the full compile after the parallel batch both passed against a **copy** of the dev DB (`dev_finsight_verify`), never the real `dev_finsight`.
- **T14 (P1-scoped E2E) — backend half PASSED (24/24 checks), API-driven, against the throwaway copy DB** (safer than the Splitting/Shared-Plans precedent of testing against the live dev DB — same API/schema, zero blast radius, no real-data cleanup needed). Script: itemized create+read, breakdown math (Groceries 20 / Food 90 / Cleaning 40, expense total unchanged at 150), non-itemized regression, overflow/negative-amount/blank-description guards (400), item category not-in-plan (**404** — matches the pre-existing category-resolution convention reused unchanged from the parent transaction's own `categoryId`, not a deviation), category-type-mismatch guard (400), update full-replace + inline-lower-below-Σitems guard (400), and the uncategorized-parent case (categorized item still surfaces under its own category; parent remainder unaffected). Authz: not separately tested with a second plan member — no new gate was added (T5 reuses `requireCanCreate/ModifyTransaction` unchanged), so this is verified by construction from the diff, not by a live two-user run.
- **FE visual pass — HANDED TO USER for manual validation (2026-07-15).** Agent-driven headless-Chromium attempts reached login/register but the Postgres SSH tunnel dropped twice mid-run. User opted to validate the items-form interaction (add/remove rows, live remainder, submit) manually themselves rather than have the agent keep retrying against the flaky tunnel. Backend logic is already proven correct via the 24/24 API-driven E2E above; this is purely a rendering/interaction check of T10's form. **T14 is considered closed for this pass** — no further agent action needed unless the user reports an issue.
- **Leftover**: the throwaway copy DB `dev_finsight_verify` may still exist (harmless, fully disposable — drop it whenever convenient). An **unrelated, pre-existing uncommitted change** to `applyParticipants` in `FinancialTransactionService.java` (reconcile-by-key instead of clear+re-add) was found already sitting in the working tree at the start of this session (predates Expense Items work) — deliberately left uncommitted and untouched throughout; still needs the user's own decision on what to do with it.

**Next**: P2 (T11 quantity, T12 table indicator) and P3 (T13 series items) remain deferred to a follow-up pass, per the original plan.
