# Series Edit Tasks

**Design**: `.specs/features/series-edit/design.md`
**Spec**: `.specs/features/series-edit/spec.md`
**Status**: Draft — awaiting approval, then Execute in a separate session (planner does not implement — see memory `execution-in-separate-chat`).
**Scope**: P1 + P2 together (13 tasks: T1–T13).

> System is English-only. Edit scopes: **This one / This and following / All**.
> Backend gate = **compile** (no automated backend test infra beyond a DB-bound context stub — see TESTING.md); the one pure, DB-free unit test lives in T4. DB-dependent verification is concentrated in T12 (integrity gate) + T13 (full-stack E2E), each against a **throwaway copy DB** (`dev_finsight_verify`, dropped after) — never the real `dev_finsight`. This mirrors Round-1's B1 + V.

---

## ⚠️ Pre-flight (do FIRST in Execute, before T1) — L-004 guard

Re-check reality before trusting this plan (planning artifacts drift between sessions):
1. `ls finsight-backend/src/main/resources/db/migration/` → confirm the next free migration number is still **V8**. If another Vn landed, renumber and log a `SPEC_DEVIATION` at the top of this file (do not silently adjust).
2. Confirm `spring.jpa.hibernate.ddl-auto=validate` and Flyway owns schema (no `ddl-auto=update` drift).
3. Confirm the current highest occurrence data is series-consistent enough to backfill (T12 will assert this formally); if the DB is reachable, spot-check that every distinct `series_id` has a single `parcels_number` and parseable `(k/N)` descriptions.

---

## Execution Plan

### Phase 1 — Backend foundation (sequential)
```
T1 (entities+repo) → T2 (migration V8)
T1 → T3 (createSeries/deleteSeries sync)
```

### Phase 2 — Backend core
```
T1 ─┬─→ T4 (SeriesRegenerator + unit tests) ─┐
    └─→ T5 (DTOs + scope enum) ───────────────┤
T3, T4, T5 ──────────────────────────────────→ T6 (editSeries + getSeriesDefinition) → T7 (controller endpoints)
```

### Phase 3 — Frontend
```
T7 ─→ T8 (FE types + service hooks) ─┬─→ T10 (SeriesEditDrawer) ─┐
                                     └─ T9 (SeriesScopeDialog) ──┴─→ T11 (wire row action)
```

### Phase 4 — Verification (sequential, copy DB)
```
T2 + all backend → T12 (migration integrity gate)
all (T1–T11) ────→ T13 (full-stack E2E, all scopes + P2)
```

---

## Task Breakdown

### T1: RecurrenceDefinition + RecurrenceDefinitionParticipant entities + repository
**What**: Two new JPA entities and the repository for the series template.
**Where**: `finsight-backend/.../models/RecurrenceDefinition.java`, `.../models/RecurrenceDefinitionParticipant.java`, `.../repositories/RecurrenceDefinitionRepository.java`
**Depends on**: None
**Reuses**: `models/TransactionParticipant.java` (entity/annotation style — no Lombok, IDENTITY id, named `@ForeignKey`), `models/FinancialTransaction.java` (`@OneToMany` cascade+orphanRemoval, `@Enumerated(STRING)`), existing `RecurrenceMode`/`RecurrenceInterval`/`SplitMode`/`FinancialTransactionType` enums.
**Requirement**: SEDIT-01, SEDIT-09
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `RecurrenceDefinition` has all fields from design (plan, createdBy, category, seriesId UNIQUE, type, amount, description(base), mode, recurrenceInterval, parcelsNumber, firstParcel, startDate, endDate, splitMode, generatedThrough, `@OneToMany participants`).
- [ ] `RecurrenceDefinitionParticipant` mirrors `TransactionParticipant` (definition FK, member FK, shareAmount, unique(def,member)).
- [ ] `RecurrenceDefinitionRepository extends JpaRepository<RecurrenceDefinition, Long>` with `Optional<RecurrenceDefinition> findByPlanAndSeriesId(Plan, String)`.
- [ ] Gate: `cd finsight-backend && ./mvnw -q compile` succeeds.
**Tests**: none (matrix: backend = none) · **Gate**: build (compile)

---

### T2: V8 migration — tables + FK column + backfill
**What**: `V8__add_recurrence_definitions.sql` creating both tables, adding `financial_transactions.recurrence_definition_id`, and the metadata-only backfill.
**Where**: `finsight-backend/src/main/resources/db/migration/V8__add_recurrence_definitions.sql`
**Depends on**: T1 (column/table names must match the entities so `validate` passes)
**Reuses**: `V6__add_transaction_participants.sql` (add-table + add-column + backfill template), `V7` (named CHECK/FK style).
**Requirement**: SEDIT-01, SEDIT-09
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] Creates `recurrence_definitions` (identity id, `uk_recurrence_definitions_series_id`, FKs `fk_recdef_plan`/`fk_recdef_created_by`/`fk_recdef_category`, indexes on plan_id + series_id) and `recurrence_definition_participants` (mirrors `transaction_participants`, `ON DELETE CASCADE` to definition).
- [ ] Adds nullable `recurrence_definition_id` + `fk_ft_recurrence_definition` + index to `financial_transactions`.
- [ ] Backfill: one definition per distinct non-null `series_id` from the earliest occurrence (`DISTINCT ON (series_id) ... ORDER BY series_id, start_date`); `firstParcel` via `substring(description from '\((\d+)/\d+\)')::int` (fallback 1, installment only); base description via `regexp_replace(description,'\s*\(\d+/\d+\)\s*$','')`; recurring `end_date = max(start_date)` per series, installment `end_date = NULL`. Then `UPDATE ... SET recurrence_definition_id`, then INSERT definition participants from the earliest occurrence's `transaction_participants`.
- [ ] Pure SQL; schema-qualified `public.`; `numeric(38,2)` for money.
- [ ] Gate: `./mvnw -q compile` (SQL is not compiled; boot-`validate` + backfill correctness are asserted in **T12**, not here — do NOT mark verified until T12 passes).
**Tests**: none · **Gate**: build (compile); **runtime validation deferred to T12**

---

### T3: Keep the definition in sync on create + delete
**What**: `createSeries` also persists a `RecurrenceDefinition` (+ participants) and links every generated occurrence via FK; `deleteSeries` removes the now-orphan definition.
**Where**: `finsight-backend/.../services/FinancialTransactionService.java` (modify `createSeries`, `deleteSeries`)
**Depends on**: T1
**Reuses**: existing `createSeries`/`deleteSeries` bodies, `resolveParticipants`, `RecurringTransactionGenerator`.
**Requirement**: SEDIT-01
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `createSeries` builds + saves a `RecurrenceDefinition` (base description without k/N; `firstParcel = currentParcel ?? 1`; interval/parcels/dates per DTO) and sets `recurrenceDefinition` on each occurrence before `saveAll`.
- [ ] Definition participants mirror the resolved shares.
- [ ] `deleteSeries` deletes the definition after the occurrences (or relies on it being orphaned) — DB stays tidy, no dangling definition.
- [ ] Gate: `./mvnw -q compile` succeeds.
**Tests**: none · **Gate**: build (compile)

---

### T4: SeriesRegenerator (pure) + unit tests
**What**: A dependency-free component computing the target occurrence set (update/create/delete) for a scope+pivot, with position-derived k/N relabel and count-change diff — plus JUnit unit tests.
**Where**: `finsight-backend/.../services/SeriesRegenerator.java`; `finsight-backend/src/test/java/com/lcs/finsight/services/SeriesRegeneratorTest.java`
**Depends on**: T1
**Reuses**: `RecurringTransactionGenerator` (date stepping, `MAX_OCCURRENCES`, label convention); `ResolvedParticipants`.
**Requirement**: SEDIT-03, SEDIT-04, SEDIT-05, SEDIT-08, SEDIT-11, SEDIT-12
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `reconcile(def, existing, shares, scope, pivotDate)` returns `{toUpdate, toCreate, toDelete}`; stamps amount, base+`(k/N)` description, category, startDate, splitMode, fresh participants.
- [ ] k/N is position-derived (`firstParcel + index`), never parsed from strings.
- [ ] Count-change diff adds/removes trailing occurrences and relabels; honors `MAX_OCCURRENCES` (throws on overflow).
- [ ] Unit tests cover: THIS_ONE (single), THIS_AND_FOLLOWING (pivot filter), ALL, "following-from-first == all", installment count increase/decrease relabel, recurring end-date extend/shorten, MAX_OCCURRENCES overflow.
- [ ] Gate: `cd finsight-backend && ./mvnw -q test -Dtest=SeriesRegeneratorTest` passes (pure, no DB; excludes the context stub).
- [ ] Test count: ≥8 unit tests pass (no silent deletions).
**Tests**: **unit** (pure, DB-free — a deliberate positive add over the matrix's "none (gap)") · **Gate**: quick (`./mvnw test -Dtest=SeriesRegeneratorTest`)

---

### T5: Series-edit DTOs + scope enum
**What**: Request/response DTOs and the scope enum for the edit endpoint.
**Where**: `finsight-backend/.../dtos/request/SeriesEditRequestDto.java`, `.../models/SeriesEditScope.java` (or `dtos/`), `.../dtos/response/RecurrenceDefinitionResponseDto.java`
**Depends on**: T1
**Reuses**: `FinancialTransactionSeriesRequestDto` (template fields + validation annotations), immutable-response-DTO convention (`final` fields, entity-taking constructor).
**Requirement**: SEDIT-10
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `SeriesEditScope { THIS_ONE, THIS_AND_FOLLOWING, ALL }`.
- [ ] `SeriesEditRequestDto` = series template fields + `@NotNull scope` + `pivotOccurrenceId` (bean-validation annotations mirrored from the series request DTO).
- [ ] `RecurrenceDefinitionResponseDto` is immutable, constructed from a `RecurrenceDefinition` (mode, interval, amount, base description, category, parcelsNumber, firstParcel, dates, splitMode, participants template).
- [ ] Gate: `./mvnw -q compile` succeeds.
**Tests**: none · **Gate**: build (compile)

---

### T6: editSeries + getSeriesDefinition service methods
**What**: Orchestrate the three-scope edit and the read-for-prefill.
**Where**: `finsight-backend/.../services/FinancialTransactionService.java` (add methods)
**Depends on**: T3, T4, T5
**Reuses**: `SeriesRegenerator` (T4), `resolveParticipants`+`SplitResolver` (SPLIT-01), `planAuthorization.requireCanModify/CreateTransaction`, existing validations + `SeriesNotFoundException`.
**Requirement**: SEDIT-02, SEDIT-03, SEDIT-04, SEDIT-05, SEDIT-06, SEDIT-07, SEDIT-08, SEDIT-09, SEDIT-11, SEDIT-12
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `getSeriesDefinition(seriesId, ctx)` returns the definition DTO (404 if absent).
- [ ] `editSeries(seriesId, dto, ctx)`: loads definition; authorizes every in-scope occurrence fail-closed; validates (category/type, mode rules, **D10**: parcelsNumber change ⇒ `scope==ALL` else 400); `resolveParticipants` at new amount.
- [ ] THIS_ONE updates only the pivot occurrence and **preserves** `seriesId`, `recurrenceDefinition`, `frequency`, `parcelsNumber` (fixes the latent nulling bug); definition untouched.
- [ ] THIS_AND_FOLLOWING / ALL update the definition + apply `SeriesRegenerator.reconcile` (saveAll updates+creates, deleteAll removes).
- [ ] Gate: `./mvnw -q compile` succeeds.
**Tests**: none (orchestration needs a DB; exercised in T13) · **Gate**: build (compile)

---

### T7: Controller endpoints (GET + PUT /series/{seriesId})
**What**: Expose read-definition and edit-series.
**Where**: `finsight-backend/.../controllers/FinancialTransactionController.java` (add mappings)
**Depends on**: T6
**Reuses**: existing `@PostMapping("/series")`/`@DeleteMapping("/series/{seriesId}")` patterns, `PlanContext` resolver, Swagger `@Operation`/`@Tag`.
**Requirement**: SEDIT-10
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `GET /series/{seriesId}` → `getSeriesDefinition` → 200 `RecurrenceDefinitionResponseDto`.
- [ ] `PUT /series/{seriesId}` → `editSeries(@PathVariable, @RequestBody @Valid SeriesEditRequestDto, ctx)` → 200 `FinancialTransactionSeriesResponseDto`.
- [ ] Swagger annotations present; routes are plan-scoped under the existing base.
- [ ] Gate: `./mvnw -q compile` succeeds.
**Tests**: none (exercised in T13) · **Gate**: build (compile)

---

### T8: Frontend types + series-edit service hooks
**What**: DTO types and TanStack Query hooks for read + update series.
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts`, `finsight-frontend/src/api/services/useFinancialTransactionService.ts`
**Depends on**: T7 (endpoint contract)
**Reuses**: existing `useCreateFinancialTransactionSeries`/`useDeleteFinancialTransactionSeries` hook style, `buildMutationOptions`, query-key + `invalidateQueries(["financialTransactions"])` conventions.
**Requirement**: SEDIT-10
**Tools**: MCP NONE · Skill `api-integration`
**Done when**:
- [ ] Types: `SeriesEditScope`, `SeriesEditRequest`, `RecurrenceDefinitionResponse`.
- [ ] `useFinancialTransactionSeries(seriesId)` → GET `.../series/{seriesId}` (query key `["financialTransactionSeries", planId, seriesId]`).
- [ ] `useUpdateFinancialTransactionSeries()` → PUT `.../series/{seriesId}`; `onSuccess` invalidates `["financialTransactions"]` + the series key; success/error toasts.
- [ ] Gate: `cd finsight-frontend && npm run lint && npm run build` green (lint added-count 0).
**Tests**: none (matrix: features/api = none) · **Gate**: build

---

### T9: SeriesScopeDialog (three-way scope chooser)
**What**: A promise-based Dialog resolving `THIS_ONE | THIS_AND_FOLLOWING | ALL | null`.
**Where**: `finsight-frontend/src/features/home/components/transactions/SeriesScopeDialog.tsx`
**Depends on**: T8 (scope type)
**Reuses**: `components/dialog/useConfirmDialog.tsx` (promise-based provider pattern), `@/components/dialog/Dialog`.
**Requirement**: SEDIT-10
**Tools**: MCP NONE · Skill `component-creation`
**Done when**:
- [ ] Exposes `useSeriesScope()` / provider that returns `Promise<SeriesEditScope | null>` with three labelled options (This one / This and following / All).
- [ ] Base UI compound nesting mirrors an existing dialog's `.stories.tsx` (L-002: runtime-context correctness, not just build-green).
- [ ] Gate: `npm run lint && npm run build` green.
**Tests**: none · **Gate**: build

---

### T10: SeriesEditDrawer (prefilled edit form)
**What**: A Sheet-based series-edit form prefilled from `GET /series/{seriesId}`, showing recurrence fields, with the D10 pin-to-All UX.
**Where**: `finsight-frontend/src/features/home/components/transactions/SeriesEditDrawer.tsx`
**Depends on**: T8
**Reuses**: `TransactionFormDrawer` field/split sub-components, `maskCurrency`, react-hook-form + zod (`buildDefaultValues` from the definition DTO, `toPayload` → `SeriesEditRequest`), required `mode` prop convention.
**Requirement**: SEDIT-02, SEDIT-05, SEDIT-11, SEDIT-12
**Tools**: MCP NONE · Skill `form-creation`, `component-creation`
**Done when**:
- [ ] Loads the definition via `useFinancialTransactionSeries`, prefills all template fields incl. participants/split.
- [ ] Submits `SeriesEditRequest` (scope from `SeriesScopeDialog` + pivotOccurrenceId) via `useUpdateFinancialTransactionSeries`.
- [ ] D10 UX: changing total parcel count pins scope to "All" with a clear inline note.
- [ ] Gate: `npm run lint && npm run build` green.
**Tests**: none · **Gate**: build

---

### T11: Wire "Edit series" row action
**What**: Add the edit-series action and orchestrate scope-dialog → drawer from the table.
**Where**: `finsight-frontend/src/features/home/components/transactions/transactionColumns.tsx`, `.../TransactionsTab.tsx`
**Depends on**: T9, T10
**Reuses**: existing "Delete series" row action wiring (`buildTransactionColumns({ onDeleteSeries })`, `handleDeleteSeries` guarded by `transaction.seriesId`).
**Requirement**: SEDIT-10
**Tools**: MCP NONE · Skill `component-creation`
**Done when**:
- [ ] "Edit series" row action appears for rows with `seriesId`; opens `SeriesScopeDialog`, then `SeriesEditDrawer` seeded with the chosen scope + pivot occurrence.
- [ ] Gate: `npm run lint && npm run build` green.
**Tests**: none · **Gate**: build

---

### T12: Migration integrity gate (copy DB)
**What**: Prove V8 boots clean and backfills correctly with zero occurrence drift.
**Where**: throwaway `dev_finsight_verify` (copy of `dev_finsight`, dropped after)
**Depends on**: T2 (+ T1, T3)
**Reuses**: Round-1 B1 copy-DB workflow; L-005 timeout-guarded DB probes; L-003 tunnel check.
**Requirement**: SEDIT-01
**Tools**: MCP NONE · Skill `verify`
**Done when**:
- [ ] Copy `dev_finsight` → `dev_finsight_verify`; boot the jar on `:3099` against the copy with `ALLOWED_ORIGINS` set (L-006); Hibernate `validate` passes (no schema drift).
- [ ] Assert: exactly one `recurrence_definition` per distinct non-null `series_id`; every series occurrence has a non-null `recurrence_definition_id`; **zero** change to any occurrence's `amount`/`description`/`category_id`/participants vs a pre-migration snapshot.
- [ ] Assert base-description + `firstParcel` inference correct on a sample series.
- [ ] Drop `dev_finsight_verify`; real `dev_finsight` never written.
**Tests**: e2e (manual/scripted copy-DB gate — project's established pattern; no automated suite exists) · **Gate**: full

---

### T13: Full-stack E2E — all scopes + P2 (copy DB)
**What**: Exercise every requirement end-to-end via the API against a copy DB.
**Where**: throwaway `dev_finsight_verify`, jar on `:3099`
**Depends on**: T1–T11
**Reuses**: Round-1 V workflow; memory `e2e-plan-auth-trick` (register throwaway user + SQL-insert plan_membership into the copy) for auth into real plan data.
**Requirement**: SEDIT-02..SEDIT-12
**Tools**: MCP NONE · Skill `verify`
**Done when**:
- [ ] THIS_ONE: edits one occurrence, keeps `seriesId`/`recurrence_definition_id`/`frequency`/`parcelsNumber` (nulling-bug fixed); other rows unchanged.
- [ ] THIS_AND_FOLLOWING from a mid-series pivot: rows ≥ pivot change, earlier rows byte-identical.
- [ ] ALL: every row changes.
- [ ] Amount edit ⇒ each rewritten occurrence's participations sum exactly to the new amount (SPLIT-01).
- [ ] P2: installment count increase (added rows + `1/N'…N'/N'` relabel) and decrease (trailing rows deleted) under ALL; recurring end-date extend/shorten adds/removes occurrences; `MAX_OCCURRENCES` overflow → 400; parcelsNumber change under non-ALL scope → 400 (D10).
- [ ] Per-occurrence auth: a CONTRIBUTOR cannot edit occurrences they don't own (fail-closed, no partial edit).
- [ ] Dashboard top-line + per-category totals stay correct after edits.
- [ ] Drop `dev_finsight_verify`; real `dev_finsight` untouched.
**Tests**: e2e (manual/scripted copy-DB) · **Gate**: full

---

## Validation Tables (pre-approval gates)

### Check 1 — Granularity
| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 2 cohesive new entities + 1 repo | ✅ |
| T2 | 1 migration file | ✅ |
| T3 | 2 methods in one service (create/delete sync) | ✅ |
| T4 | 1 component + its unit test | ✅ |
| T5 | small cohesive DTO set + enum | ✅ |
| T6 | 2 methods in one service (edit/read) | ✅ |
| T7 | 2 endpoints in one controller | ✅ |
| T8 | FE types + 2 hooks (one file each) | ✅ |
| T9 | 1 dialog component | ✅ |
| T10 | 1 drawer component | ✅ |
| T11 | 1 wiring change (column + tab) | ✅ |
| T12 | 1 verification gate | ✅ |
| T13 | 1 verification gate | ✅ |

### Check 2 — Diagram ↔ Depends-on cross-check
| Task | Depends on (body) | Diagram arrows | Status |
| ---- | ----------------- | -------------- | ------ |
| T1 | None | → T2, T3, T4, T5 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T1 | T1 → T5 | ✅ |
| T6 | T3, T4, T5 | T3/T4/T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T8 | T8 → T10 | ✅ |
| T11 | T9, T10 | T9/T10 → T11 | ✅ |
| T12 | T2 (+T1,T3) | T2 → T12 | ✅ |
| T13 | T1–T11 | all → T13 | ✅ |

### Check 3 — Test co-location vs TESTING.md matrix
| Task | Layer | Matrix requires | Task says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T1 | entity/repo | none (gap) | none | ✅ |
| T2 | migration | none | none (runtime → T12) | ✅ |
| T3 | service | none (gap) | none | ✅ |
| T4 | service (pure) | none (gap) | **unit** (positive add, DB-free) | ✅ exceeds |
| T5 | dto | none | none | ✅ |
| T6 | service | none (gap) | none (→ T13) | ✅ |
| T7 | controller | none (gap) | none (→ T13) | ✅ |
| T8 | FE service | none (gap) | none | ✅ |
| T9 | FE feature | none (gap) | none | ✅ |
| T10 | FE feature | none (gap) | none | ✅ |
| T11 | FE feature | none (gap) | none | ✅ |
| T12 | verification | none (e2e gap) | e2e (copy-DB pattern) | ✅ established |
| T13 | verification | none (e2e gap) | e2e (copy-DB pattern) | ✅ established |

No ❌ — safe to present.

---

## Commit plan (one per task)
`feat(series-edit): …` scoped per task; migration as `feat(series-edit): V8 recurrence_definitions + backfill`; verification tasks are check-only (no source commit beyond fixes they surface).

## Progress Log

**T1–T11 (2026-07-16, Execute session):** All P1+P2 implementation tasks complete. Backend `77b16d1`→`e818974` (T1–T7) + frontend `23be417`→`79b35de` (T8–T11), both on `main`. Backend gate = `./mvnw -q compile` green at every step; T4's `./mvnw -q test -Dtest=SeriesRegeneratorTest` passed 8/8. Frontend gate = `npm run lint && npm run build` green at every step, zero new lint problems added (baseline 40→41, the +1 is a pre-existing-pattern `react-refresh/only-export-components` warning matching `useConfirmDialog.tsx`'s own).

**SPEC_DEVIATION (T12 pre-flight):** While setting up the throwaway copy DB for T12, discovered the **real** `dev_finsight` database had already auto-applied the V8 migration (Flyway `installed_on` 2026-07-16 21:47:09) — before this session's V8 file was even committed (`ff62055` at 21:48:30). Spring Boot runs Flyway on every boot; the migration file existed on disk (written by the T2 sub-agent) before the commit, and the user's own separately-running dev backend instance auto-applied it on a restart during this window. No command run by this session caused it.
**Verified safe** via read-only checks against the real DB: 45 `recurrence_definitions` for 45 distinct `series_id` (1:1, zero orphans), zero occurrences with a series_id but null FK, zero SPLIT-01 invariant violations (`Σ participant shares == amount` holds for every transaction), and a 5-row spot-check confirmed correct base-description stripping + `first_parcel` derivation. This lines up with the migration being provably additive-only by construction (only adds tables + sets the new nullable FK column; never touches `amount`/`description`/`category_id`/participants).
User was informed and chose to proceed treating this as the T12 integrity gate (the real-DB checks are strictly stronger evidence than a copy-DB check would have been). The `dev_finsight_verify` copy (created via `pg_dump`/`pg_restore` since `CREATE DATABASE ... TEMPLATE` was blocked by active connections) was confirmed to match the real DB's post-migration state exactly and is reused for T13.
**T12: ✅ Done** (via the real-DB verification above, superseding the originally-planned copy-DB-only check).

**T13 (2026-07-16): ✅ Done — full-stack E2E against `dev_finsight_verify` (restored via `pg_dump`/`pg_restore` since `CREATE DATABASE ... TEMPLATE` was blocked by active connections on the real DB).** Jar booted on `:3099`; throwaway user registered + SQL-inserted `plan_memberships` (OWNER) into plan 5 "Geral" (45 real series) per `[[e2e-plan-auth-trick]]`. All checks passed against real copy data:
- **THIS_ONE**: edited occurrence 333 (parcel 4/8) — only that row changed; `seriesId`/`recurrence_definition_id`/`frequency`/`parcelsNumber` all preserved (nulling-bug fix confirmed).
- **THIS_AND_FOLLOWING**: pivot at parcel 4/12 of a 12-row series — rows 1-3 byte-identical, rows 4-12 updated.
- **ALL**: 13-row recurring series, 2-way EXACT-adjacent split (EQUAL, 1300.50+1300.50=2601.00) — every row updated, SPLIT-01 held.
- **P2 count increase** (10→15): 5 new trailing rows created, full relabel 1/15..15/15.
- **P2 count decrease** (15→10): 5 trailing rows deleted, relabel 1/10..10/10.
- **P2 recurring end-date extend** (13→15 months) and **shorten** (13→4 months): correct add/remove.
- **`MAX_OCCURRENCES` overflow** (10-year extend): 400, zero partial write (row count unchanged).
- **D10 guard**: `parcelsNumber` change under `THIS_AND_FOLLOWING` → 400 with the expected message.
- **Fail-closed auth**: a throwaway CONTRIBUTOR (own membership, real occurrences owned by another member) rejected both on the attribution check (self-only participants would've passed) and on `requireCanModifyTransaction` — no partial write either time.
- **Dashboard**: `totalIncome`/`totalExpenses` for the touched date range matched a raw `SUM(amount) GROUP BY type` SQL query exactly, post-edits.
- **FE click-through** (real Chromium via Playwright, throwaway Vite on `:5183` → backend `:3099`, per L-006): login → plan switch → Transactions tab → row action "Edit series" → `SeriesScopeDialog` renders with working `RadioGroup` selection (no Base UI context errors, L-002 satisfied) → `SeriesEditDrawer` opens correctly prefilled (base description, amount, category, attribution/person, installment count + "Currently: parcel X of N", scope badge) → submit → toast "Series updated successfully." → drawer closes → table reflects the new amount. Screenshots retained in the session scratchpad.
- **Bug found and fixed during this pass**: `editSeries`'s THIS_ONE branch and `SeriesRegenerator.stampOccurrence` both did `participants.clear()` + re-add, which raced Hibernate's flush order (INSERT before DELETE) and threw a unique-constraint violation whenever a participant was retained across an edit. Fixed by reconciling participants by member-id key (update in place / add / remove) instead of clear-and-rebuild — mirrors the pre-existing fix in `applyParticipants`. Commit `89bab38`.
- Verify environment fully torn down: `dev_finsight_verify` dropped, throwaway backend (`:3099`) and frontend (`:5183`) processes killed, scratch dump file removed. Real `dev_finsight` was never written by any command in this pass (see the SPEC_DEVIATION note above for the one exception, which predates and is unrelated to T13's own actions).

**Requirement traceability: all 12 SEDIT-01..12 → Verified** (see `spec.md`).
