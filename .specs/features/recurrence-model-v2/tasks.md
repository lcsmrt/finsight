# Recurrence Model v2 Tasks

**Design**: `.specs/features/recurrence-model-v2/design.md`
**Spec**: `.specs/features/recurrence-model-v2/spec.md`
**Status**: Approved 2026-07-24 — ready for Execute (one commit per task)

> **Repo-state re-verified 2026-07-24** (design was written 2026-07-19; per STATE.md L-004 numbering/line refs are re-checked at Tasks time):
> - Highest Flyway migration on disk is **V8** → this feature's migration is **V9** ✅
> - `frequency` is confined to exactly these main-source sites (no hidden usages): entity `FinancialTransaction.java:40,124-129`; `FinancialTransactionRequestDto.java:28,59-60`; `FinancialTransactionResponseDto.java:21,39,175-176`; `RecurringTransactionGenerator.java:51,71`; `SeriesRegenerator.java:41,122`; `FinancialTransactionService.java:168,198`; migration `V1__baseline.sql:60` (column origin); frontend `financialTransaction.ts:27`.
> - `createSeries` at `FinancialTransactionService.java:332`, the RECURRING-requires-endDate throw at **:348**; `editSeries` at **:494**.
> - `DashboardService.getSummary` at **:40** (`@Transactional(readOnly=true)` at :39).
> - `RecurrenceDefinitionRepository` currently has only `findByPlanAndSeriesId` — the locked due-query is net-new.
> - **No `Clock` bean exists** anywhere in the backend — the injected time source (design's `today` anchor) is net-new.
> - `RecurrenceDefinition` already has `endDate` (nullable, :61) and `generatedThrough` (:68) — no schema change beyond the DROP.
> - FE zod schema (`TransactionFormDrawer.tsx`) requires endDate for RECURRING in **two** spots: seriesEdit path :155 and create path :206-217; `toPayload`/request type already treat `endDate` as optional.

---

## Execution Plan

### Phase 1 — Retire `frequency` (P1) + time foundation

Pure debt removal (RMV2-01..03) plus the injected `Clock` both parts need. All three touch disjoint files.

```
T1 [P]  (backend: remove frequency + V9 DROP COLUMN)
T2 [P]  (frontend: remove dead frequency field)
T3 [P]  (backend: Clock bean)
```

### Phase 2 — Open-ended generation core (P2/P3)

```
        ┌→ T5 [P] (createSeries: endDate optional + set generatedThrough) ─┐
T4 ─────┤                                                                  ├─→ T8 [P] (dashboard on-read top-up)
(gen)   └→ T7 [P] (OpenEndedSeriesTopUpService + locked repo query) ───────┘
                                                                            └─→ T9 [P] (editSeries: bound/unbound P3)
```

- T4 depends on T1 (same generator file) + T3 (Clock).
- T5 and T7 both depend on T4; disjoint files → parallel.
- T8 depends on T7; T9 depends on T5 (same service file) + T4.

### Phase 3 — Frontend + full-stack verification

```
T10 [P] (FE: endDate optional for RECURRING + ongoing indicator)   ← depends T2
T11     (full-stack E2E against a throwaway copy DB)               ← depends T1,T5,T7,T8,T9,T10
```

---

## Task Breakdown

### T1: Retire the `frequency` field across the backend + V9 DROP COLUMN [P]

**What**: Remove the vestigial free-text `frequency` field from the entire backend and drop its column, with zero behavior change.
**Where** (all under `finsight-backend/src/main/`):
- `java/.../models/FinancialTransaction.java` — remove field (:40) + getter/setter (:124-129)
- `java/.../dtos/request/FinancialTransactionRequestDto.java` — remove field (:28) + getter (:59-60)
- `java/.../dtos/response/FinancialTransactionResponseDto.java` — remove field (:21), constructor assignment (:39), getter (:175-176)
- `java/.../services/RecurringTransactionGenerator.java` — remove both `setFrequency(...)` calls (:51, :71)
- `java/.../services/SeriesRegenerator.java` — remove `frequency` from the `TargetOccurrence` record (:41) + the `tx.setFrequency(slot.frequency())` stamp (:122)
- `java/.../services/FinancialTransactionService.java` — remove `setFrequency(dto.getFrequency())` at single-tx create (:168) + update (:198)
- `resources/db/migration/V9__drop_frequency_column.sql` (new) — `ALTER TABLE financial_transactions DROP COLUMN frequency;`
**Depends on**: None
**Reuses**: N/A (deletion)
**Requirement**: RMV2-01, RMV2-02, RMV2-03

**Tools**:
- MCP: NONE (filesystem)
- Skill: NONE

**Done when**:
- [ ] No reference to `frequency` remains in `finsight-backend/src/main` (`grep -rn frequency finsight-backend/src/main` returns nothing)
- [ ] `V9__drop_frequency_column.sql` created; `MigrationsIT` applies the full V1→V9 chain clean
- [ ] `ddl-auto=validate` passes after the entity field is gone (entity ↔ schema consistent)
- [ ] Existing `TransactionCrudIT` / `SeriesEditIT` / `DashboardPartitionIT` pass **unchanged** (proves no behavior change)
- [ ] Gate check passes: `cd backend && ./mvnw verify` (DB tunnel up; empties `dev_finsight`)
- [ ] Test count: unchanged from baseline (55 unit + ~59 integration), all green — no silent deletions

**Tests**: integration (touches entity/DTO/service/migration — highest required type wins)
**Gate**: full

**Verify**: `./mvnw verify` green; `grep -rn frequency finsight-backend/src/main` empty; MigrationsIT green.

**Commit**: `refactor(backend): retire vestigial frequency field (V9 drop column) — closes B-001`

---

### T2: Remove the dead `frequency` field from the frontend transaction type [P]

**What**: Delete the unused `frequency?: string` from the transaction wire type.
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts` (remove :27)
**Depends on**: None
**Reuses**: N/A (deletion)
**Requirement**: RMV2-02

**Tools**:
- MCP: NONE (filesystem)
- Skill: NONE

**Done when**:
- [ ] No `frequency` reference anywhere in `finsight-frontend/src` (`grep -rn frequency finsight-frontend/src` empty)
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`
- [ ] Existing FE unit tests still green (`npm run test`) — no test touched frequency, count unchanged

**Tests**: none (dead-field removal on a type; matrix has no test requirement for wire DTOs)
**Gate**: build

**Verify**: `npm run build` green; grep empty.

**Commit**: `refactor(frontend): remove dead frequency field from transaction DTO`

---

### T3: Add an injected `Clock` bean as the server "today" source [P]

**What**: Register a single `Clock` bean so generation/top-up read "today" from an injectable source (makes RMV2-06 rolling top-up unit/IT-testable by advancing simulated time).
**Where**: `finsight-backend/src/main/java/.../config/` — add a `@Bean Clock clock()` returning `Clock.systemDefaultZone()` (place in an existing `@Configuration` class or a small new `TimeConfig`).
**Depends on**: None
**Reuses**: Existing `@Configuration` conventions
**Requirement**: RMV2-05, RMV2-06 (enabler)

**Tools**:
- MCP: NONE (filesystem)
- Skill: NONE

**Done when**:
- [ ] A `Clock` bean is injectable (`Clock.systemDefaultZone()`)
- [ ] App context still loads (`FinSightApplicationTests` green)
- [ ] Gate check passes: `cd finsight-backend && ./mvnw test`
- [ ] Test count: unit baseline unchanged, all green

**Tests**: none (config bean, no branching logic; exercised by T4/T7 tests)
**Gate**: quick

**Verify**: `./mvnw test` green; grep confirms one `@Bean Clock`.

**Commit**: `feat(backend): add injectable Clock bean for time-based generation`

---

### T4: Make `RecurringTransactionGenerator` open-ended aware

**What**: Teach the generator to (a) treat a null `endDate` on a RECURRING series as "generate to the rolling horizon" and (b) expose a definition-driven forward-window generator for top-up.
**Where**: `finsight-backend/src/main/java/.../services/RecurringTransactionGenerator.java` (modify) + `src/test/.../services/RecurringTransactionGeneratorTest.java` (extend)
**Depends on**: T1 (same file — frequency stamps removed first), T3 (Clock)
**Reuses**: existing `baseTransaction` stamping shape; `MAX_OCCURRENCES = 120` per-pass backstop
**Requirement**: RMV2-04, RMV2-05, RMV2-06

**Tools**:
- MCP: NONE (filesystem)
- Skill: NONE

**Done when**:
- [ ] RECURRING loop uses `effectiveEnd = dto.getEndDate() != null ? dto.getEndDate() : today.plusMonths(12)` (H=12, `today` from injected `Clock`)
- [ ] New `generateForwardWindow(RecurrenceDefinition def, LocalDate afterExclusive, LocalDate throughInclusive, <shares>)` returns unsaved occurrences for months strictly after the watermark, honoring `MAX_OCCURRENCES` per pass
- [ ] INSTALLMENT path unchanged (still bounded by parcel count `N`)
- [ ] Bounded RECURRING (endDate present) produces byte-identical output to before
- [ ] Unit tests cover: open-ended → 12 months from start; bounded → unchanged; start-so-old-that span > 120 → `MAX_OCCURRENCES` guard; forward-window idempotent boundary (afterExclusive respected)
- [ ] Gate check passes: `cd finsight-backend && ./mvnw test`
- [ ] Test count: `RecurringTransactionGeneratorTest` gains ≥4 tests, all green

**Tests**: unit (pure generator logic — matrix "Backend pure logic → unit")
**Gate**: quick

**Verify**: `./mvnw test`; new generator tests green; bounded-series golden output unchanged.

**Commit**: `feat(backend): open-ended horizon + forward-window generation in RecurringTransactionGenerator`

---

### T5: `createSeries` accepts open-ended RECURRING + sets `generatedThrough` [P]

**What**: Allow a RECURRING series to be created with no end date, and record how far we've materialized.
**Where**: `finsight-backend/src/main/java/.../services/FinancialTransactionService.java` — `createSeries` (:332); remove the RECURRING requires-endDate throw (:348); after generation set `definition.generatedThrough = last occurrence's startDate`. Keep INSTALLMENT-requires-parcels + RECURRING-requires-interval guards. + `src/test/.../services/` IT (extend `SeriesEditIT` or a focused `OpenEndedSeriesIT`).
**Depends on**: T4
**Reuses**: `RecurringTransactionGenerator` (T4), existing `RecurrenceDefinition` persistence
**Requirement**: RMV2-04, RMV2-05, RMV2-07

**Tools**:
- MCP: NONE (filesystem)
- Skill: `/backend-endpoint` (service-layer conventions)

**Done when**:
- [ ] POST series RECURRING with `endDate` omitted → 201/persisted, definition `endDate = null`, 12 occurrences from start, `generatedThrough` = last occurrence date
- [ ] POST series RECURRING **with** endDate → behavior unchanged (bounded), `generatedThrough` ≈ endDate
- [ ] POST series INSTALLMENT with no parcelsNumber → still 400 (guard intact)
- [ ] Open-ended occurrences appear in the dashboard look-ahead (assert via existing dashboard read)
- [ ] Gate check passes: `cd backend && ./mvnw verify` (DB tunnel up; empties `dev_finsight`)
- [ ] Test count: IT suite gains ≥3 tests, all green

**Tests**: integration (service + DB + HTTP)
**Gate**: full

**Verify**: `./mvnw verify`; create-open-ended IT shows 12 rows + watermark; bounded-create IT unchanged.

**Commit**: `feat(backend): allow open-ended recurring series in createSeries`

---

### T7: `OpenEndedSeriesTopUpService` + locked due-query (rolling top-up) [P]

**What**: A service that lazily materializes missing future months for open-ended RECURRING series up to the horizon, idempotently, plus the pessimistic-locked repository query that feeds it.
**Where**:
- `finsight-backend/src/main/java/.../services/OpenEndedSeriesTopUpService.java` (new) — `@Transactional(propagation = REQUIRES_NEW) void topUp(Plan plan, LocalDate today)`
- `finsight-backend/src/main/java/.../repositories/RecurrenceDefinitionRepository.java` — add `findOpenEndedDue(plan, horizonCap)` with `@Lock(PESSIMISTIC_WRITE)` selecting `mode = RECURRING AND endDate IS NULL AND (generatedThrough IS NULL OR generatedThrough < horizonCap)`
- `src/test/.../services/OpenEndedTopUpIT.java` (new)
**Depends on**: T4 (forward-window generator), T3 (Clock)
**Reuses**: `RecurringTransactionGenerator.generateForwardWindow` (T4), definition `participants` for shares, `FinancialTransactionRepository.saveAll`
**Requirement**: RMV2-06

**Tools**:
- MCP: NONE (filesystem)
- Skill: `/backend-endpoint` (service + repository query conventions)

**Done when**:
- [ ] For each due open-ended definition (locked), materializes months in `(generatedThrough, today+12]`, saves, advances `generatedThrough` to the last generated occurrence's date
- [ ] No-op when nothing is due (`generatedThrough >= today+12`)
- [ ] **Idempotent**: firing top-up twice (or setting `generatedThrough` back then firing) produces no duplicate occurrences — proven by an IT that fires it twice and asserts stable row count
- [ ] New occurrences reflect the definition's **current** amount/category/split (consistent with series-edit "all")
- [ ] Bounded series (`endDate NOT NULL`) are never selected/touched (no backfill needed)
- [ ] Time advanced via injected `Clock` in the IT (not `LocalDate.now()`)
- [ ] Gate check passes: `cd backend && ./mvnw verify` (DB tunnel up; empties `dev_finsight`)
- [ ] Test count: IT suite gains ≥3 tests, all green

**Tests**: integration (service + locked query + DB writes)
**Gate**: full

**Verify**: `./mvnw verify`; advance Clock +N months → top-up adds exactly the missing months; second fire adds zero.

**Commit**: `feat(backend): lazy rolling-window top-up for open-ended recurring series`

---

### T8: Trigger top-up on the dashboard read [P]

**What**: Wire the on-read (D1) trigger: `DashboardService.getSummary` tops up due open-ended series before running its read queries.
**Where**: `finsight-backend/src/main/java/.../services/DashboardService.java` — `getSummary` (:40); inject `OpenEndedSeriesTopUpService`; call `topUp(ctx.getPlan(), LocalDate.now(clock))` as the first statement. `getSummary` stays `@Transactional(readOnly=true)`; the top-up's `REQUIRES_NEW` tx does the writes. + extend `DashboardPartitionIT` (or `OpenEndedTopUpIT`).
**Depends on**: T7
**Reuses**: `OpenEndedSeriesTopUpService.topUp` (T7); existing dashboard read queries unchanged
**Requirement**: RMV2-06, RMV2-07

**Tools**:
- MCP: NONE (filesystem)
- Skill: NONE

**Done when**:
- [ ] `getSummary` calls `topUp` first, remains `readOnly=true` (writes isolated to the `REQUIRES_NEW` tx)
- [ ] IT: an open-ended series with a stale `generatedThrough` → a dashboard GET refreshes the look-ahead (new future rows present in the response)
- [ ] IT: the dashboard **partition invariant** (test-foundation `DashboardPartitionIT`) still holds after top-up
- [ ] Gate check passes: `cd backend && ./mvnw verify` (DB tunnel up; empties `dev_finsight`)
- [ ] Test count: IT suite gains ≥1 test; partition invariant tests unchanged & green

**Tests**: integration (HTTP read path + write side-effect)
**Gate**: full

**Verify**: `./mvnw verify`; GET /dashboard after a stale watermark returns the refreshed horizon; partition invariant green.

**Commit**: `feat(backend): top up open-ended series on dashboard read`

---

### T9: Bound/stop an open-ended series via `editSeries` (P3) [P]

**What**: Setting an endDate on an open-ended series bounds it (deletes not-yet-passed occurrences after the new end, caps `generatedThrough` so top-up stops); clearing it re-opens (full-replace semantics).
**Where**: `finsight-backend/src/main/java/.../services/FinancialTransactionService.java` — `editSeries` (:494); on effective endDate **null → set**: existing reconcile already deletes rows beyond endDate, additionally set `generatedThrough = endDate`; on **set → null**: extend to horizon + set `generatedThrough` (open-ended). + extend `SeriesEditIT`.
**Depends on**: T5 (same file; open-ended create semantics), T4 (generator)
**Reuses**: existing `editSeries` → `SeriesRegenerator.reconcile` delete/extend path (no new endpoint)
**Requirement**: RMV2-09

**Tools**:
- MCP: NONE (filesystem)
- Skill: `/backend-endpoint`

**Done when**:
- [ ] Edit an open-ended series → set endDate: occurrences after the new end are deleted, `generatedThrough = endDate`, subsequent dashboard reads do **not** top it up
- [ ] Edit a bounded series → clear endDate (RECURRING): becomes open-ended, extends to horizon, `generatedThrough` set (full-replace: null = open-ended, not "no change")
- [ ] Delete an open-ended series → all occurrences + its `RecurrenceDefinition` removed (unchanged delete behavior)
- [ ] Existing `SeriesEditIT` THIS_ONE/THIS_AND_FOLLOWING/ALL cases still green
- [ ] Gate check passes: `cd backend && ./mvnw verify` (DB tunnel up; empties `dev_finsight`)
- [ ] Test count: `SeriesEditIT` gains ≥2 tests, all green

**Tests**: integration
**Gate**: full

**Verify**: `./mvnw verify`; bound-then-read shows no top-up past endDate; unbound-then-read tops up to horizon.

**Commit**: `feat(backend): bound/reopen open-ended series via editSeries (P3)`

---

### T10: Frontend — allow "no end date" for RECURRING + ongoing indicator [P]

**What**: Make the series form accept an empty end date in RECURRING mode and clearly show the series is ongoing; installments stay bounded.
**Where**: `finsight-frontend/src/features/home/components/transactions/TransactionFormDrawer.tsx` — relax the two zod `superRefine` endDate-required checks for RECURRING (create path :206-217 and seriesEdit path :155-159) so an empty endDate is valid for RECURRING; add an "ongoing / no end date" affordance + helper text; keep the `endDate < date` guard only when an endDate is provided. `toPayload` already emits optional endDate — confirm it sends `endDate: undefined` when empty. + update `TransactionFormDrawer.series.test.ts`.
**Depends on**: T2
**Reuses**: existing form conventions (react-hook-form + zod), existing `toPayload`
**Requirement**: RMV2-08

**Tools**:
- MCP: NONE (filesystem)
- Skill: `/form-creation`, `/component-creation`

**Done when**:
- [ ] RECURRING mode with empty endDate passes zod validation (both create and seriesEdit paths); INSTALLMENT still requires its parcel count
- [ ] When endDate is provided, the `endDate < date` guard still fires
- [ ] The form renders an "ongoing / no end date" indicator when RECURRING + empty endDate
- [ ] `toPayload` omits `endDate` (sends `undefined`) for an open-ended RECURRING series
- [ ] Unit tests: RECURRING + empty endDate → valid; INSTALLMENT + empty → still invalid; provided endDate < date → invalid; payload omits endDate when open-ended
- [ ] Gate check passes: `cd finsight-frontend && npm run test && npm run lint && npm run build`
- [ ] Test count: `TransactionFormDrawer.series.test.ts` gains ≥3 tests, all green

**Tests**: unit (form schema/defaults/payload — matrix "Frontend forms → unit")
**Gate**: quick (FE) + build

**Verify**: `npm run test` green; open-ended series submits without an end date; ongoing indicator visible.

**Commit**: `feat(frontend): support open-ended recurring series (no end date) in the series form`

---

### T11: Full-stack E2E verification against a throwaway copy DB

**What**: Runtime proof of the whole feature end-to-end (build-green ≠ runtime-correct, STATE.md L-002), against a **copy** of the dev DB — never the real `dev_finsight`.
**Where**: no code; a verification pass (see `.specs/features/*/tasks.md` prior "V" tasks + memory `e2e-plan-auth-trick`).
**Depends on**: T1, T5, T7, T8, T9, T10
**Reuses**: the copy-DB E2E procedure used by every prior feature
**Requirement**: All (RMV2-01..09) — Success Criteria

**Tools**:
- MCP: NONE
- Skill: `/verify`

**Done when**:
- [ ] **Pre-flight (L-007)**: check `flyway_schema_history` on the REAL `dev_finsight` first (catch an auto-applied V9 from a concurrently-running dev instance) before assuming a clean baseline; make the copy DB `dev_finsight_verify`; drop it after
- [ ] V9 applies clean on the copy; `ddl-auto=validate` passes; no `frequency` column remains
- [ ] Create an open-ended recurring series via the running frontend (no end date) → 12 months of look-ahead visible in the dashboard; `generatedThrough` set
- [ ] Simulate time passing (advance the injected Clock / set `generatedThrough` back) → a dashboard read refreshes the horizon with **no duplicate** occurrences on a second read
- [ ] Bound the open-ended series with an end date (P3) → occurrences past the end removed, no further top-up
- [ ] Top-line totals (income/expense/net) and the category **partition invariant** unaffected by the frequency removal
- [ ] Copy DB dropped; real `dev_finsight` untouched (byte-for-byte baseline check)

**Tests**: integration + runtime E2E
**Gate**: full (both stacks) + runtime

**Verify**: documented E2E checklist all green in the Progress Log; copy DB dropped.

**Commit**: none (verification pass; `.specs/` root is unversioned).

---

## Pre-Approval Validation

### Check 1 — Task Granularity

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Retire frequency backend + V9 | 1 cohesive refactor (one field, compiles only as a whole — split would leave non-compiling states; merged per skill's compile-dependency rule) | ✅ Atomic |
| T2: Remove FE frequency field | 1 line, 1 file | ✅ Atomic |
| T3: Clock bean | 1 bean | ✅ Atomic |
| T4: Generator open-ended | 1 class + its unit tests | ✅ Atomic |
| T5: createSeries open-ended | 1 method + IT | ✅ Atomic |
| T7: TopUp service + locked query | 1 service + 1 repo method (its sole consumer) + IT | ✅ Cohesive |
| T8: Dashboard trigger | 1 method + IT | ✅ Atomic |
| T9: editSeries bound/unbound | 1 method + IT | ✅ Atomic |
| T10: FE form open-ended | 1 form (schema + indicator) + unit tests | ✅ Atomic |
| T11: E2E verify | 1 verification pass | ✅ Atomic |

### Check 2 — Diagram–Definition Cross-Check

| Task | Depends On (body) | Diagram arrows | Status |
| ---- | ----------------- | -------------- | ------ |
| T1 | None | (Phase 1 root) | ✅ |
| T2 | None | (Phase 1 root) | ✅ |
| T3 | None | (Phase 1 root) | ✅ |
| T4 | T1, T3 | T1→T4, T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T7 | T4, T3 | T4→T7, T3→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T5, T4 | T5→T9, T4→T9 | ✅ |
| T10 | T2 | T2→T10 | ✅ |
| T11 | T1, T5, T7, T8, T9, T10 | all→T11 | ✅ |

Parallel groups have no intra-group deps: {T1,T2,T3} disjoint ✅; {T5,T7} both depend only on T4, disjoint files ✅; {T8,T9} depend on T7 / T5 respectively, disjoint files ✅. **Note:** the committed IT suite is single-fork (not parallel). **Superseded 2026-07-25:** the old rationale here — that each `[P]` sub-agent gets its own JVM+Testcontainer and is therefore dev-parallel-safe — no longer holds; Testcontainers is gone and all runs share `dev_finsight`. `[P]` still applies to writing the code, but `mvn verify` must be serialized.

### Check 3 — Test Co-location Validation

| Task | Code layer created/modified | Matrix requires | Task says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | entity + DTO + service + migration | integration | integration | ✅ |
| T2 | FE wire DTO (type only) | none | none | ✅ |
| T3 | config bean (no logic) | none | none | ✅ |
| T4 | backend pure logic (generator) | unit | unit | ✅ |
| T5 | backend service + HTTP/DB | integration | integration | ✅ |
| T7 | backend service + repo + DB | integration | integration | ✅ |
| T8 | backend HTTP read + write side-effect | integration | integration | ✅ |
| T9 | backend service + DB | integration | integration | ✅ |
| T10 | FE form (schema/payload) | unit | unit | ✅ |
| T11 | cross-stack runtime | integration + E2E | integration + E2E | ✅ |

All three checks pass — no restructuring needed.

---

## Requirement Coverage

| Requirement | Task(s) |
| ----------- | ------- |
| RMV2-01 (retire frequency: entity + V9) | T1 |
| RMV2-02 (retire frequency: BE + FE DTOs) | T1, T2 |
| RMV2-03 (retire frequency: generator/service/regenerator sites) | T1 |
| RMV2-04 (endDate optional for RECURRING) | T4, T5 |
| RMV2-05 (initial materialization + generatedThrough) | T4, T5 |
| RMV2-06 (rolling top-up, idempotent) | T4, T7, T8 |
| RMV2-07 (open-ended appears in dashboard look-ahead) | T5, T8 |
| RMV2-08 (FE form: no end date + ongoing indicator) | T10 |
| RMV2-09 (bound/stop via series-edit) | T9 |

**Coverage:** 9/9 requirements mapped to tasks. Runtime proof consolidated in T11.

---

## Progress Log

_(Execute session appends here: task status, commit hashes, gate results, SPEC_DEVIATION markers.)_

### 2026-07-24/25 Execute session — T1–T10 done, T11 deferred

All Phase 1 + Phase 2 + Phase 3 code tasks executed via parallel sub-agents (per `handoff-execute.md` execution order), each gated on its own `mvnw`/`npm` run. **T11 (full-stack E2E) deferred** — no reachable Postgres this session (no local instance, no SSH tunnel); user chose to skip rather than start Postgres/reconnect a tunnel. All code-level gates are green; only the runtime cross-stack proof is outstanding.

| Task | Commit (repo) | Gate result |
| ---- | -------------- | ----------- |
| T1 — retire `frequency` + V9 drop column | `78d9959` (finsight-backend) | `mvnw verify` green — 55 unit + 59 integration unchanged; `MigrationsIT` proves V1→V9 clean |
| T2 — remove FE dead `frequency` field | `0cceb64` (finsight-frontend) | `npm run lint && build && test` green — 37 tests |
| T3 — injectable `Clock` bean | `3bad56a` (finsight-backend) | `mvnw test` green — 55/55 |
| T4 — generator open-ended + `generateForwardWindow` | `6445f9e` (finsight-backend) | `mvnw test` green — 61/61 (`RecurringTransactionGeneratorTest` +6) |
| T5 — `createSeries` open-ended + `generatedThrough` | `5729f84` (finsight-backend) | `mvnw verify` green — 124 total (new `OpenEndedSeriesIT` +4) |
| T7 — `OpenEndedSeriesTopUpService` + locked due-query | `aa082da` (finsight-backend) | `mvnw verify` green — 61 unit + 68 integration (new `OpenEndedTopUpIT` +5) |
| T8 — dashboard on-read top-up trigger | `4a8c30d` (finsight-backend) | `mvnw verify` green — 62 unit + 71 integration (`DashboardPartitionIT` +1) |
| T9 — `editSeries` bound/reopen (P3) | `8b96b74` (finsight-backend) | `mvnw verify` green — **62 unit + 72 integration, final backend count** (`SeriesEditIT` +3) |
| T10 — FE open-ended form + ongoing indicator | `3981af8` (finsight-frontend) | `npm run test && lint && build` green — **42 tests, final frontend count** (`TransactionFormDrawer.series.test.ts` +7) |
| T11 — full-stack E2E vs `dev_finsight` over SSH tunnel | API-driven runtime verification (2026-08-01) | **PASSED** — open-ended RECURRING series generated 13 occurrences (today through today+12mo), transaction list showed 13 rows, dashboard `totalExpenses` = 1300.00, bound via `editSeries` to `endDate=today+3mo` reduced to 4 rows. Rolling top-up idempotency over simulated time was not re-tested at runtime (no direct DB access); remains covered by `OpenEndedSeriesIT` + `OpenEndedTopUpIT`.

**Bugs found and fixed during T10** (not pre-existing, introduced by making endDate optional, caught before commit): a `format(values.endDate!, ...)` non-null assertion in `toSeriesCreatePayload` would have thrown at runtime on an open-ended submit; both end-date `DatePicker`s discarded the clear action (`onChange` ignored `undefined`), making "ongoing" unreachable through the UI. Both fixed within T10's commit.

**Close-out** (2026-08-01): STATE.md updated (Current Work → roadmap enrichment; B-001 → fixed; Recurrence Model v2 + open-ended recurrence deferred items → done). ROADMAP.md updated (M3 → complete, Recurrence Model v2 → shipped).
