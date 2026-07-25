# Recurring & Installment Transactions Tasks

**Design**: `.specs/features/recurring-transactions/design.md`
**Status**: **All tasks (T1–T17) complete, gated, and E2E-verified as of 2026-07-16.** Core (T1–T11) + T12 runtime E2E, and Refinement RECUR-10 (T13–T16) + T17 runtime E2E all passed.

> **Execution decisions (2026-07-05):** No git/atomic commits for now (user versions later). Frontend tasks (T8–T11) follow the project convention command files in `.claude/commands/` (api-integration, form-creation, component-creation).

## Execution Results (2026-07-05)

| Task | Status | Gate result |
| ---- | ------ | ----------- |
| T1 entity `seriesId` + index | ✅ Done | `mvnw compile` OK |
| T2 enums | ✅ Done | `mvnw compile` OK |
| T3 series request DTO | ✅ Done | `mvnw compile` OK |
| T4 response DTOs (+seriesId) | ✅ Done | `mvnw compile` OK |
| T5 `RecurringTransactionGenerator` + unit test | ✅ Done | **4/4 tests pass, no DB** |
| T6 service `createSeries`/`deleteSeries` + repo | ✅ Done | `mvnw compile` OK |
| T7 controller `POST/DELETE /series` | ✅ Done | `mvnw compile` OK |
| T8 frontend DTOs | ✅ Done | `tsc` clean |
| T9 series service hooks | ✅ Done | `tsc` clean |
| T10 form recurrence section | ✅ Done | `tsc` + `build` OK |
| T11 series badge + delete | ✅ Done | `tsc` + `build` OK |
| T12 runtime E2E | ✅ Done (2026-07-16) | API-driven, throwaway copy DB, see below |

Final integrated gates (whole feature): backend `./mvnw -q -DskipTests compile` → exit 0; `./mvnw test -Dtest=RecurringTransactionGeneratorTest` → 4/4; frontend `npx tsc --noEmit` → clean; `npm run build` → ✓.

## T12 + T17 Runtime E2E Results (2026-07-16)

Run API-driven against a **throwaway copy** of the dev DB (`dev_finsight_verify`, dropped afterward — real data never touched), backend on `:3099`. **21/21 checks passed, zero bugs found.**

- Installment series (Notebook R$300, 12 parcelas, no `currentParcel`): 12 rows created, labelled `1/12`..`12/12`.
- Recurring series (Salario R$5000, mensal, 6 months ahead): correct occurrence count; dashboard on the far future month correctly includes the occurrence (income = 5000).
- Delete series: all rows for that `seriesId` gone.
- Delete a single occurrence: only that row removed, the rest of the series intact.
- In-progress installment (RECUR-10, N=12, k=5): exactly 8 rows generated (`5/12`..`12/12`), first occurrence dated the current month — parcels `1/12`..`4/12` correctly absent.
- `k=1` (explicit): reproduces the original 12-row behavior — regression confirmed.
- `k > N`: rejected with 400.

## Refinement Execution Results (2026-07-11) — RECUR-10

| Task | Status | Gate result |
| ---- | ------ | ----------- |
| T13 DTO `currentParcel` + `@Min(1)` | ✅ Done | `mvnw compile` OK |
| T14 generator `k..N` + service `1≤k≤N` guard + tests | ✅ Done | **8/8 tests pass, no DB** |
| T15 frontend DTO `currentParcel?` | ✅ Done | build OK |
| T16 form current-parcel input + read-only computed end | ✅ Done | `tsc -b` + `vite build` OK |
| T17 runtime E2E | ✅ Done (2026-07-16) | API-driven, throwaway copy DB, see T12+T17 results above |

**Gate note:** frontend `npm run lint` currently exits 1 due to **pre-existing** repo-wide errors (Storybook `no-renderer-packages`/`no-uninstalled-addons`, `@typescript-eslint/no-explicit-any`) in files unrelated to this change; the two edited frontend files (`financialTransaction.ts`, `TransactionFormDrawer.tsx`) are lint-clean, and `tsc -b` + `vite build` pass. Type-safety was gated via `npm run build`.

**Runtime note:** the new `series_id` column + `(user_id, series_id)` index are created automatically by Hibernate `ddl-auto=update` on the next backend boot against Postgres — no manual migration (no migration tool yet; see CONCERNS.md).

> **Gate note:** the backend's `@SpringBootTest` needs a live Postgres (no H2/test profile — see CONCERNS.md B-blocker). So backend code tasks gate on **compile** (`./mvnw -q -DskipTests compile`), not the DB-bound test run. The one exception is T5's generator unit test, which is a **pure POJO** test and runs with **no DB**.

---

## Execution Plan

### Phase 1: Foundation (Parallel)

Independent starting points — backend entity, backend enums, frontend types.

```
T1 [P]   (entity: series_id)
T2 [P]   (enums)
T8 [P]   (frontend DTOs)
```

### Phase 2: Contracts + Core (two concurrent chains)

```
Backend chain:
  T2 → T3 ┐
  T1 → T4 ┤
  T1,T2,T3 → T5 → (T3,T4,) → T6 → (T4) → T7

  detailed:  T3 ─┐
             T4 ─┤
             T5 ─┴→ T6 → T7
             (T5 needs T1,T2,T3; T6 needs T3,T5; T7 needs T4,T6)

Frontend chain (concurrent with backend):
  T8 → T9 → ┌ T10 [P]
            └ T11 [P]
```

### Phase 3: Integration (Sequential)

```
T7, T10, T11 → T12  (end-to-end verification)
```

---

## Task Breakdown

### T1: Add `seriesId` field to `FinancialTransaction` [P]

**What**: Add a nullable `String seriesId` column (getter/setter) + index `(user_id, series_id)`.
**Where**: `finsight-backend/.../models/FinancialTransaction.java`
**Depends on**: None
**Reuses**: existing `@Table` index style on the entity
**Requirement**: RECUR-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `seriesId` field + getter/setter added; `@Column(name="series_id")`; index added to `@Table`
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

---

### T2: Add `RecurrenceMode` and `RecurrenceInterval` enums [P]

**What**: Two enums — `RecurrenceMode {INSTALLMENT, RECURRING}`, `RecurrenceInterval {MONTHLY}`.
**Where**: `finsight-backend/.../models/RecurrenceMode.java`, `.../models/RecurrenceInterval.java`
**Depends on**: None
**Reuses**: `FinancialTransactionType` enum style
**Requirement**: RECUR-01, RECUR-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Both enums created with the specified values
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

---

### T3: Create `FinancialTransactionSeriesRequestDto`

**What**: Request DTO with the series fields + bean-validation annotations (per design).
**Where**: `finsight-backend/.../dtos/request/FinancialTransactionSeriesRequestDto.java`
**Depends on**: T2
**Reuses**: `FinancialTransactionRequestDto` style (plain class, getters)
**Requirement**: RECUR-01, RECUR-02, RECUR-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Fields + `@NotNull/@NotBlank/@Positive/@Min/@Max` annotations present per design
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

---

### T4: Add `seriesId` to response DTO + create series response DTO

**What**: Add `String seriesId` to `FinancialTransactionResponseDto` (mapped from entity); create `FinancialTransactionSeriesResponseDto {seriesId, count, occurrences}`.
**Where**: `finsight-backend/.../dtos/response/FinancialTransactionResponseDto.java` (modify), `.../dtos/response/FinancialTransactionSeriesResponseDto.java` (new)
**Depends on**: T1
**Reuses**: `FinancialTransactionResponseDto(entity)` constructor mapping
**Requirement**: RECUR-03, RECUR-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `seriesId` exposed on the response DTO; series response DTO built from a `List<FinancialTransaction>`
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

---

### T5: Create `RecurringTransactionGenerator` (pure) + unit test

**What**: Pure `@Component` that expands a series request into occurrence entities; JUnit unit test covering installment count/dates/numbering, recurring stepping, month-overflow, and cap.
**Where**: `finsight-backend/.../services/RecurringTransactionGenerator.java` (new), `finsight-backend/src/test/java/com/lcs/finsight/services/RecurringTransactionGeneratorTest.java` (new)
**Depends on**: T1, T2, T3
**Reuses**: field-setting mirrors `FinancialTransactionService.create`; `LocalDate.plusMonths`
**Requirement**: RECUR-01, RECUR-02, RECUR-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `generate(dto, user, category, seriesId)` implements installment + recurring per design; enforces `MAX_OCCURRENCES=120` (throws `IllegalArgumentException`)
- [ ] Unit test: 12× installment → 12 rows with correct months + `(i/12)` descriptions; monthly recurring Jan–Dec → 12 rows; day-31 start → clamps; over-cap → throws
- [ ] Gate check passes: `cd finsight-backend && ./mvnw test -Dtest=RecurringTransactionGeneratorTest`
- [ ] Test count: ≥4 tests pass (no silent deletions)

**Tests**: unit · **Gate**: quick

---

### T6: Add repository lookup + `createSeries`/`deleteSeries` to the service

**What**: Add `findAllByUserAndSeriesId` to the repository; add `createSeries` (validate → resolve category → generate → `saveAll`) and `deleteSeries` (fetch by user+seriesId, 404 if empty, `deleteAll`) to the service.
**Where**: `finsight-backend/.../repositories/FinancialTransactionRepository.java` (modify), `.../services/FinancialTransactionService.java` (modify)
**Depends on**: T3, T5
**Reuses**: category lookup + type guard + `findById` ownership pattern; `UUID.randomUUID()`; `DateUtils`
**Requirement**: RECUR-01, RECUR-02, RECUR-05, RECUR-07, RECUR-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `createSeries` validates mode-conditional fields + start≤end + cap, sets a shared `seriesId`, saves all occurrences
- [ ] `deleteSeries` removes all of a user's rows for a `seriesId`, 404 when none
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

---

### T7: Add `POST /series` and `DELETE /series/{seriesId}` endpoints

**What**: Two controller methods wiring the service, mirroring the existing auth pattern.
**Where**: `finsight-backend/.../controllers/FinancialTransactionController.java` (modify)
**Depends on**: T4, T6
**Reuses**: `@AuthenticationPrincipal UserDetails` → `userService.findByEmail`; inline `"/series"` path style
**Requirement**: RECUR-01, RECUR-02, RECUR-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `POST /series` → 201 with `FinancialTransactionSeriesResponseDto`; `DELETE /series/{seriesId}` → 204
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

**Commit**: `feat(transactions): generate recurring/installment transaction series (backend)`

---

### T8: Extend frontend transaction DTOs [P]

**What**: Add `RecurrenceMode`, `RecurrenceInterval`, `CreateFinancialTransactionSeriesRequest`, `FinancialTransactionSeriesResponse`, and `seriesId?` on `FinancialTransaction`.
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts`
**Depends on**: None (contract fixed by design)
**Reuses**: existing DTO shapes in the same file; barrel `dtos/index.ts`
**Requirement**: RECUR-01, RECUR-04

**Tools**: MCP: NONE · Skill: `api-integration`

**Done when**:
- [ ] Types added and exported; `seriesId?: string` on the read type
- [ ] Gate check passes: `cd finsight-frontend && npm run lint`

**Tests**: none · **Gate**: quick

---

### T9: Add series service hooks

**What**: `createFinancialTransactionSeries` + `useCreateFinancialTransactionSeries` (POST `/financial-transaction/series`) and `deleteFinancialTransactionSeries` + `useDeleteFinancialTransactionSeries` (DELETE `/financial-transaction/series/{seriesId}`), invalidating `["financialTransactions"]`.
**Where**: `finsight-frontend/src/api/services/useFinancialTransactionService.ts`
**Depends on**: T8
**Reuses**: `buildMutationOptions`, existing create/delete hooks, `finsightApi`
**Requirement**: RECUR-01, RECUR-07

**Tools**: MCP: NONE · Skill: `api-integration`

**Done when**:
- [ ] Both hooks added following the existing pattern with success toasts + invalidation
- [ ] Gate check passes: `cd finsight-frontend && npm run lint`

**Tests**: none · **Gate**: quick

---

### T10: Add recurrence section to `TransactionFormDrawer` [P]

**What**: Extend the zod schema + form with a create-mode-only "Repetir/Parcelar" toggle → mode (Parcelado/Recorrente) → parcels count OR end date; branch `onSubmit` to the series hook.
**Where**: `finsight-frontend/src/features/home/components/transactions/TransactionFormDrawer.tsx`
**Depends on**: T8, T9
**Reuses**: existing Sheet/RHF/zod, `DatePicker`, `Field*`, `TransactionTypeToggle`, `maskCurrency`
**Requirement**: RECUR-01, RECUR-02, RECUR-05

**Tools**: MCP: NONE · Skill: `form-creation`

**Done when**:
- [ ] Toggle + conditional fields render only in create mode; schema requires parcels (installment) or endDate (recurring); submit routes to `createSeries`
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`

**Tests**: none · **Gate**: full

---

### T11: Series badge + "delete series" action [P]

**What**: Show a `Badge` on series rows (`i/N` or repeat icon) in the columns; add a create/tab-level "Excluir série" confirm action that calls `deleteSeries(seriesId)`; keep single-occurrence delete intact.
**Where**: `finsight-frontend/src/features/home/components/transactions/transactionColumns.tsx` (modify), `.../TransactionsTab.tsx` (modify)
**Depends on**: T8, T9
**Reuses**: `Badge`, `useConfirm` destructive dialog, existing row-actions cell
**Requirement**: RECUR-06, RECUR-07, RECUR-08

**Tools**: MCP: NONE · Skill: `component-creation`

**Done when**:
- [ ] Series rows are visually identifiable; deleting a series removes all its rows via one confirm; single delete still removes one row
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`

**Tests**: none · **Gate**: full

---

### T12: End-to-end verification

**What**: Manually verify the vertical slice against real running apps + DB.
**Where**: whole feature (no file deliverable)
**Depends on**: T7, T10, T11
**Reuses**: `finsight-backend/docker-compose.yml` for Postgres
**Requirement**: RECUR-01..08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] With DB up + both apps running: create "Notebook R$300, 12 parcelas" → 12 debit rows in the right months with `1/12..12/12`
- [ ] Create "Salário R$5000, mensal, 12 meses" → 12 credit rows; dashboard on a future month includes them
- [ ] Delete the series → all its rows gone; a single occurrence delete removes only one
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile` and `cd finsight-frontend && npm run lint && npm run build`

**Tests**: none (manual E2E) · **Gate**: full

**Commit**: `feat(transactions): recurrence UI + series delete (frontend)`

---

## Refinement — RECUR-10: In-progress installments (current parcel k → generate k..N)

**Goal:** Let a user register an installment they are already partway through — total `N` + current parcel `k` (default 1) — so only `k..N` are generated, labelled with real parcel numbers, without recreating parcels already imported from the CSV. `k = 1` must be byte-for-byte the current behaviour.

> **Locked decisions (2026-07-11):** input = total `N` + **current parcel `k`** (not "next"/"already paid"); generate `k..N` **inclusive**; `startDate` = month of parcel `k`; implied end shown **read-only** (no separate end input); installments only (recurring untouched). See STATE.md AD-003.

### Refinement plan

```
T13 [P] (backend DTO: currentParcel)     T15 [P] (frontend DTO: currentParcel?)
T13 → T14 (generator k..N + service      T15 → T16 (form: current-parcel input
          validation + unit tests)                 + read-only computed end)
T14, T16 → T17 (runtime E2E)
```

Backend (T13→T14) and frontend (T15→T16) chains run concurrently.

### T13: Add `currentParcel` to `FinancialTransactionSeriesRequestDto` [P]

**What**: Add nullable `Integer currentParcel` with `@Min(1, message="Current parcel must be at least 1.")` + getter. Semantics: the first parcel to generate (default 1). `startDate` doc-comment updated to "month of the current parcel".
**Where**: `finsight-backend/.../dtos/request/FinancialTransactionSeriesRequestDto.java`
**Depends on**: None
**Reuses**: existing annotation style in the same DTO (`@Min`/`@Max` on `parcelsNumber`)
**Requirement**: RECUR-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `currentParcel` field + `@Min(1)` + getter present; `startDate` comment clarified
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile`

**Tests**: none · **Gate**: build

---

### T14: Generator generates `k..N` + service validates `k ≤ N` + extend unit tests

**What**: In `RecurringTransactionGenerator.generateInstallments`, let `k = dto.getCurrentParcel()` (default 1 when null), `N = dto.getParcelsNumber()`; loop `p = k..N`, date `startDate.plusMonths(p - k)`, description `"(" + p + "/" + N + ")"`, `parcelsNumber = N`; apply the cap to the generated count `N - k + 1`. In `FinancialTransactionService.createSeries`, add a cross-field guard: when `currentParcel != null`, require `1 ≤ currentParcel ≤ parcelsNumber` else `IllegalArgumentException`. Extend `RecurringTransactionGeneratorTest`: (a) `N=12, k=5` → 8 rows dated month0..7, labelled `5/12..12/12`; (b) `k=1`/null → unchanged `1/12..12/12`; (c) `k=N` → single `N/N` row at startDate; (d) cap applies to generated count.
**Where**: `finsight-backend/.../services/RecurringTransactionGenerator.java` (modify), `.../services/FinancialTransactionService.java` (modify), `.../test/java/com/lcs/finsight/services/RecurringTransactionGeneratorTest.java` (modify)
**Depends on**: T13
**Reuses**: existing `generateInstallments` loop + `ensureWithinCap`; existing `createSeries` validation block; `LocalDate.plusMonths`
**Requirement**: RECUR-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `generateInstallments` uses `k..N` with `plusMonths(p - k)`; default k=1 path identical to before
- [ ] `createSeries` rejects `k < 1` or `k > N` with `IllegalArgumentException` (→ 400)
- [ ] New unit tests (a)–(d) added and pass alongside the existing 4
- [ ] Gate check passes: `cd finsight-backend && ./mvnw test -Dtest=RecurringTransactionGeneratorTest` (≥8 tests pass)

**Tests**: unit · **Gate**: quick

**Commit**: `feat(transactions): in-progress installments — generate current parcel k..N (backend)`

---

### T15: Add `currentParcel?` to the frontend series request DTO [P]

**What**: Add `currentParcel?: number` to `CreateFinancialTransactionSeriesRequest["body"]` and clarify the `startDate` comment (month of the current parcel).
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts`
**Depends on**: None (contract fixed above)
**Reuses**: the existing series request type in the same file
**Requirement**: RECUR-10

**Tools**: MCP: NONE · Skill: `api-integration`

**Done when**:
- [ ] `currentParcel?: number` added to the series request body type
- [ ] Gate check passes: `cd finsight-frontend && npm run lint`

**Tests**: none · **Gate**: quick

---

### T16: Current-parcel input + read-only computed end in `TransactionFormDrawer`

**What**: In Parcelado (installment) mode, add an optional "parcela atual" input (`currentParcel`, default 1) beside total parcels; zod: integer, `≥ 1`, `≤ parcelsNumber` (refine). Show a read-only derived line "última: `N/N` — `<month>`" where `month = startDate + (N − currentParcel)`. Label the date field as the current parcel's month. On submit, omit `currentParcel` from the payload when it is 1 (keep the wire identical to today for the common case).
**Where**: `finsight-frontend/src/features/home/components/transactions/TransactionFormDrawer.tsx`
**Depends on**: T15
**Reuses**: existing zod schema + RHF fields, `Field*`, `Input`, the month-formatting util used elsewhere in the drawer
**Requirement**: RECUR-10

**Tools**: MCP: NONE · Skill: `form-creation`

**Done when**:
- [ ] Optional current-parcel input renders only in create + Parcelado mode; schema enforces `1 ≤ k ≤ N`
- [ ] Read-only "última: N/N — month" updates live with N, k, and the date
- [ ] Payload omits `currentParcel` when 1
- [ ] Gate check passes: `cd finsight-frontend && npm run lint && npm run build`

**Tests**: none · **Gate**: full

**Commit**: `feat(transactions): in-progress installment UI — current parcel + implied end (frontend)`

---

### T17: End-to-end verification (in-progress installment)

**What**: With DB up + both apps running: register "Notebook R$300, 12 parcelas total, atual = 5, este mês" → exactly 8 debit rows dated this month onward, labelled `5/12..12/12`; parcels `1/12..4/12` absent. Register the same with no current parcel → 12 rows `1/12..12/12` (regression check). Reject `k > N` with a 400/inline error.
**Where**: whole refinement (no file deliverable)
**Depends on**: T14, T16
**Reuses**: `finsight-backend/docker-compose.yml` for Postgres
**Requirement**: RECUR-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] In-progress case generates `k..N` only, correct months + labels
- [ ] `k = 1` / omitted reproduces the original 12-row behaviour
- [ ] `k > N` rejected
- [ ] Gate check passes: `cd finsight-backend && ./mvnw -q -DskipTests compile` and `cd finsight-frontend && npm run lint && npm run build`

**Tests**: none (manual E2E) · **Gate**: full

---

## Parallel Execution Map

```
Phase 1 (parallel):
  ├── T1 [P]  (entity)
  ├── T2 [P]  (enums)
  └── T8 [P]  (frontend DTOs)

Phase 2:
  Backend:                         Frontend:
    T2 → T3 ─┐                        T8 → T9 ─┬── T10 [P]
    T1 → T4 ─┤                                 └── T11 [P]
    T1,T2,T3 → T5 ─┤
             T3,T5 → T6 → T7
                    (T7 also needs T4)

Phase 3 (sequential):
  T7, T10, T11 → T12
```

Backend and frontend chains run concurrently (different files, no shared state). Within the frontend chain, T10 and T11 are `[P]` — different files, both depend only on T8+T9.

---

## Validation Tables

### 1. Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: entity field + index | 1 file | ✅ Granular |
| T2: two small enums | 2 tiny files, one concept | ✅ Granular |
| T3: one request DTO | 1 file | ✅ Granular |
| T4: response DTO field + one new DTO | 2 files, one concept (response mapping) | ✅ Granular |
| T5: generator + its unit test | 1 component + co-located test | ✅ Granular |
| T6: repo method + 2 service methods | 2 files, one concept (series persistence) | ✅ Cohesive |
| T7: 2 endpoints | 1 file | ✅ Granular |
| T8: DTO types | 1 file | ✅ Granular |
| T9: 2 service hooks | 1 file | ✅ Granular |
| T10: form recurrence section | 1 file | ✅ Granular |
| T11: badge + delete-series | 2 files, one concept (series UI) | ✅ Cohesive |
| T12: manual verification | no file | ✅ (verification task) |

### 2. Diagram ↔ Definition Cross-Check

| Task | Depends on (body) | Diagram shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (root) | ✅ Match |
| T2 | None | (root) | ✅ Match |
| T8 | None | (root) | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T1 | T1→T4 | ✅ Match |
| T5 | T1, T2, T3 | T1→T5, T2→T5, T3→T5 | ✅ Match |
| T6 | T3, T5 | T3→T6, T5→T6 | ✅ Match |
| T7 | T4, T6 | T4→T7, T6→T7 | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T8, T9 | T8→T9→T10 (T8 via T9) | ✅ Match |
| T11 | T8, T9 | T8→T9→T11 (T8 via T9) | ✅ Match |
| T12 | T7, T10, T11 | T7/T10/T11→T12 | ✅ Match |

No `[P]` pair depends on each other: (T1,T2,T8) mutually independent ✅; (T10,T11) both depend on T8,T9 but not each other ✅.

### 3. Test Co-location Validation

| Task | Layer created/modified | Matrix requires | Task says | Status |
| ---- | ---------------------- | --------------- | --------- | ------ |
| T1 | entity (model) | none | none | ✅ OK |
| T2 | enums | none | none | ✅ OK |
| T3 | request DTO | none | none | ✅ OK |
| T4 | response DTO | none | none | ✅ OK |
| T5 | generator (pure logic) | none | **unit** | ✅ OK (stricter than floor — plants first backend unit test) |
| T6 | service + repository | none | none | ✅ OK |
| T7 | controller | none | none | ✅ OK |
| T8 | frontend dtos | none | none | ✅ OK |
| T9 | frontend service | none | none | ✅ OK |
| T10 | frontend feature | none | none | ✅ OK |
| T11 | frontend feature | none | none | ✅ OK |

All backend layers are "none" in the coverage matrix (no test harness — CONCERNS.md). T5 intentionally adds a DB-free unit test; no `Tests: none` here is a deferral of required coverage, so there are **no violations**.

---

## Coverage vs. Spec

9 requirements (RECUR-01..09). RECUR-01..08 mapped to tasks T1–T12. **RECUR-09 (P3: edit series) is intentionally not in this task set** — deferred per spec (Out of Scope for v1).
