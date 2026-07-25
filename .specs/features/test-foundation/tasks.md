# Test Foundation Tasks

**Design**: `.specs/features/test-foundation/design.md`
**Spec**: `.specs/features/test-foundation/spec.md`
**Status**: Draft (pending approval → Execute in a separate session)

> **Nature of this feature:** most deliverables *are* tests. The co-location rule is inverted here — a task's `Tests` field names the kind of test it produces, and its gate is that the suite goes green. The harness tasks (T1–T5) are **test-infrastructure**, not application code (they cannot break production); their runtime proof is the smoke IT in **T6** (merge-forward per the tasks.md compilation-dependency rule).

---

## Execution Plan

### Phase 1 — Harness foundation (Sequential)
```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2 — Critical-invariant tests (Parallel)
```
        ┌→ T7  [P]
T6 ─────┼→ T8  [P]
        └→ T9  [P]
```

### Phase 3 — Coverage gate + FE harness (Parallel)
```
T7,T8,T9 → T10        (JaCoCo floor needs the critical tests to exist)
(none)   → T11 [P]    (FE harness — independent of backend)
```

### Phase 4 — P2 high-risk (Parallel)
```
T6  → T12 [P]   T6 → T13 [P]   T6 → T14 [P]   T6 → T15 [P]
T11 → T16 [P]
```

### Phase 5 — P3 medium (Parallel)
```
T6  → T17 [P]   T6 → T18 [P]   T11 → T19 [P]   T11 → T20 [P]
```

### Phase 6 — Docs (Sequential)
```
(all) → T21
```

---

## Task Breakdown

### T1: Add Testcontainers + JaCoCo + failsafe to pom
**What**: Add test-scope Testcontainers deps, the JaCoCo plugin, and bind maven-failsafe so `*IT` runs on `verify`.
**Where**: `finsight-backend/pom.xml`
**Depends on**: None
**Reuses**: Spring Boot 3.5.3 BOM (Testcontainers versions managed); failsafe config from parent
**Requirement**: TEST-01, TEST-06
**Tools**: MCP: context7 (verify current jacoco-maven-plugin version + failsafe binding); Skill: NONE
**Done when**:
- [ ] `spring-boot-testcontainers`, `org.testcontainers:junit-jupiter`, `org.testcontainers:postgresql` added (test scope, no explicit versions)
- [ ] `jacoco-maven-plugin` added with `prepare-agent` + `report` (pinned explicit version — verify latest stable via context7, do not guess)
- [ ] `maven-failsafe-plugin` bound to `integration-test` + `verify`
- [ ] `./mvnw test-compile` succeeds (deps resolve)
**Tests**: none (build config; proven at runtime by T6)
**Gate**: build — `cd finsight-backend && ./mvnw test-compile`
**Commit**: `build(test): add testcontainers, jacoco, failsafe`

---

### T2: Test profile properties
**What**: `application-test.properties` with a fixed `JWT_SECRET_KEY`, flyway enabled, `ddl-auto=validate`, devtools off — zero dependence on `.env`/tunnel.
**Where**: `finsight-backend/src/test/resources/application-test.properties`
**Depends on**: T1
**Reuses**: `application.properties` keys
**Requirement**: TEST-01
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Fixed test `JWT_SECRET_KEY` set (no env lookup)
- [ ] `spring.flyway.enabled=true`, `spring.jpa.hibernate.ddl-auto=validate`
- [ ] Datasource intentionally left to `@ServiceConnection` (no hardcoded URL)
- [ ] `./mvnw test-compile` succeeds
**Tests**: none (config; proven by T6)
**Gate**: build
**Commit**: `test: add test profile properties`

---

### T3: Singleton Testcontainers Postgres config
**What**: `@TestConfiguration` exposing a static singleton `PostgreSQLContainer` via `@ServiceConnection`.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/support/TestContainersConfig.java`
**Depends on**: T2
**Reuses**: —
**Requirement**: TEST-01
**Tools**: MCP: context7 (`@ServiceConnection` + singleton pattern for Boot 3.5); Skill: NONE
**Done when**:
- [ ] Static singleton container (started once, not `@Testcontainers` per-class restart)
- [ ] `@Bean @ServiceConnection` publishes connection to Spring
- [ ] Postgres image tag pinned (e.g. `postgres:16-alpine`)
- [ ] `./mvnw test-compile` succeeds
**Tests**: none (infra; proven by T6)
**Gate**: build
**Commit**: `test: singleton testcontainers postgres`

---

### T4: AbstractIntegrationTest base class
**What**: Base `@SpringBootTest(MOCK)` + `@AutoConfigureMockMvc` + `@ActiveProfiles("test")` importing T3, with a `truncateAll()` `@BeforeEach`.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/support/AbstractIntegrationTest.java`
**Depends on**: T3
**Reuses**: Application context, `MockMvc`
**Requirement**: TEST-01, TEST-02
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Imports `TestContainersConfig`, exposes `protected MockMvc mockMvc`
- [ ] `truncateAll()` runs `TRUNCATE ... RESTART IDENTITY CASCADE` on all app tables before each test (excludes `flyway_schema_history`)
- [ ] `./mvnw test-compile` succeeds
**Tests**: none (infra; proven by T6)
**Gate**: build
**Commit**: `test: abstract integration test base`

---

### T5: TestAuthHelper + Fixtures
**What**: Real-JWT auth helper (via `JwtService`) + data builders for plans/members/transactions.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/support/TestAuthHelper.java`, `.../support/Fixtures.java`
**Depends on**: T4
**Reuses**: `security/JwtService`, repositories, real entities
**Requirement**: TEST-02
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] `bearerFor(User)` / `asUser(User)` produce a real token via `JwtService`
- [ ] `Fixtures` builds a plan with members at a given `PlanRole`, and transactions with participants/items via repositories
- [ ] `./mvnw test-compile` succeeds
**Tests**: none (infra; proven by T6)
**Gate**: build
**Commit**: `test: auth helper + fixtures`

---

### T6: Harness smoke IT
**What**: One `*IT` that boots the container, applies Flyway, makes an **authenticated** MockMvc request, and confirms `truncateAll` isolation — proves T1–T5 end to end.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/support/HarnessSmokeIT.java`
**Depends on**: T5
**Reuses**: AbstractIntegrationTest, TestAuthHelper, Fixtures
**Requirement**: TEST-01, TEST-02
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Boots against Testcontainers Postgres with **no tunnel and no `dev_finsight`** connection
- [ ] Flyway V1..latest applies; `ddl-auto=validate` passes on boot
- [ ] An authenticated request returns 2xx; an unauthenticated one returns 401/403
- [ ] Gate passes: `cd finsight-backend && ./mvnw verify`
- [ ] Test count: ≥2 assertions pass
**Tests**: integration
**Gate**: full
**Commit**: `test: harness smoke integration test`

---

### T7: Split SPLIT-01 invariant IT [P]
**What**: Through-the-API assertion that split participations sum to `amount` and unfiltered dashboard totals are unchanged by a split.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../SplitInvariantIT.java`
**Depends on**: T6
**Reuses**: Harness, `SplitResolver` (asserted via API), Fixtures
**Requirement**: TEST-03
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Create split tx via API → persisted participations sum to `amount` (SPLIT-01)
- [ ] Unfiltered dashboard income/expense identical with vs without the split
- [ ] Per-user filter returns only that user's shares
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(split): SPLIT-01 invariant integration`

---

### T8: Dashboard partition A−B+I IT [P]
**What**: Through-the-endpoint assertion of `spent[C] = A[C] − B[C] + I[C]` for itemized + non-itemized tx, with top-line totals invariant.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../DashboardPartitionIT.java`
**Depends on**: T6
**Reuses**: Harness, `CategoryBreakdownAssembler`/`DashboardService` (via API), Fixtures
**Requirement**: TEST-04
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Itemized tx: breakdown attributes each item to its own category; remainder → parent category
- [ ] Non-itemized regression: breakdown unchanged
- [ ] income/expense/net identical regardless of itemization
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(dashboard): partition invariant integration`

---

### T9: Plan authorization matrix IT [P]
**What**: Real filter + `PlanContextArgumentResolver` + `PlanAuthorization` drive every role cell (OWNER/EDITOR/CONTRIBUTOR/VIEWER/non-member) to the correct 200/403/404, fail-closed with no partial write.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../PlanAuthorizationMatrixIT.java`
**Depends on**: T6
**Reuses**: Harness, real security chain, Fixtures (real JWT — no `@WithMockUser`)
**Requirement**: TEST-05
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Each role × (read/create/edit-own/edit-others/manage) cell asserts the correct status
- [ ] A denied write leaves the DB unchanged (fail-closed, no partial persistence)
- [ ] Non-member → 404 (no existence leak)
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(security): plan authorization matrix integration`

---

### T10: JaCoCo critical-package floor
**What**: Add a `jacoco:check` rule (class-scoped includes) failing the build below the branch floor on the three invariant classes; global report only.
**Where**: `finsight-backend/pom.xml`
**Depends on**: T7, T8, T9
**Reuses**: JaCoCo plugin from T1
**Requirement**: TEST-06
**Tools**: MCP: context7 (jacoco `check` rule includes syntax); Skill: NONE
**Done when**:
- [ ] `check` rule includes exactly `SplitResolver`, `CategoryBreakdownAssembler`, `PlanAuthorization` (branch ≥ agreed floor, e.g. 0.80)
- [ ] Global bundle reported, no minimum
- [ ] Temporarily weakening a critical assertion turns `./mvnw verify` red; a plumbing class does not
- [ ] Gate passes: `./mvnw verify`
**Tests**: none (build config; behavior proven by the red/green check above)
**Gate**: full
**Commit**: `build(test): jacoco floor on critical classes`

---

### T11: Frontend unit vitest project + scripts + first test [P]
**What**: Add a `unit` (jsdom) vitest project beside the `storybook` project, `test`/`test:coverage`/`test:watch` scripts, and a real schema+`toPayload` test.
**Where**: `finsight-frontend/vite.config.ts`, `finsight-frontend/package.json`, `finsight-frontend/src/features/**/<form>.schema.test.ts`
**Depends on**: None
**Reuses**: `@vitest/coverage-v8`, existing zod schema + `toPayload` mapper
**Requirement**: TEST-07
**Tools**: MCP: context7 (vitest multi-project config); Skill: NONE
**Done when**:
- [ ] `test.projects[1]` = `{ name:'unit', environment:'jsdom', include:['src/**/*.test.{ts,tsx}'] }`; `storybook` project intact
- [ ] `npm run test` + `npm run test:coverage` defined and run
- [ ] ≥1 real assertion test on a form's zod schema + `toPayload` passes
- [ ] Gate passes: `cd finsight-frontend && npm run test`
- [ ] Test count: ≥1 non-story test passes
**Tests**: unit
**Gate**: full
**Commit**: `test(fe): vitest unit project + first schema test`

---

### T12: Auth/JWT slice IT [P]
**What**: Register → login → token scoping → per-plan access through the real auth endpoints.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../AuthenticationIT.java`
**Depends on**: T6
**Reuses**: Harness, `AuthenticationController`/`AuthenticationService`
**Requirement**: TEST-08
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Register issues a usable token; login returns a valid JWT
- [ ] A token for user A cannot access user B's non-shared plan
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(auth): authentication slice integration`

---

### T13: Transaction CRUD full-replace IT [P]
**What**: Assert the PUT full-replace contract + item handling through the API.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../TransactionCrudIT.java`
**Depends on**: T6
**Reuses**: Harness, Fixtures; `transaction-update-contract` memory
**Requirement**: TEST-09
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] PUT with a full body replaces participants/items (no leftover child rows)
- [ ] Overflow / negative / blank / category-not-in-plan guards → 400
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(tx): transaction crud full-replace integration`

---

### T14: Series generate/edit + guards IT [P]
**What**: Installment k/N + recurring generation, all three edit scopes, `MAX_OCCURRENCES` + D10 guards → 400, regenerate against the DB.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../SeriesEditIT.java`
**Depends on**: T6
**Reuses**: Harness, `RecurringTransactionGenerator`, `SeriesRegenerator`, Fixtures
**Requirement**: TEST-10
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Installment k/N labels + recurring generation correct
- [ ] THIS_ONE / THIS_AND_FOLLOWING / ALL each produce the right occurrence set (incl. the L-007 participant-retention path)
- [ ] `MAX_OCCURRENCES` overflow and D10 count-change guard → 400
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(series): generate/edit + guards integration`

---

### T15: Migrations apply-clean IT [P]
**What**: Assert the full Flyway chain applies on an empty DB and `ddl-auto=validate` passes (whole chain, not a pinned version).
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../MigrationsIT.java`
**Depends on**: T6
**Reuses**: Harness (fresh container = empty DB), Flyway
**Requirement**: TEST-11
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Flyway history shows every migration V1..latest `Success` on the ephemeral DB
- [ ] Context loads with `ddl-auto=validate` (no drift)
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(db): migrations apply-clean integration`

---

### T16: Frontend form tests [P]
**What**: Test zod validation, `buildDefaultValues`, `toPayload`, and edit-mode reset for the transaction + series forms (adds `@testing-library/react` + jsdom).
**Where**: `finsight-frontend/src/features/**/<form>.test.tsx`, `package.json` (deps)
**Depends on**: T11
**Reuses**: FE harness, `react-hook-form` forms, existing schemas
**Requirement**: TEST-12
**Tools**: MCP: context7 (`@testing-library/react` `renderHook` with RHF); Skill: NONE
**Done when**:
- [ ] `@testing-library/react` + `jsdom` added
- [ ] Transaction + series forms: validation errors, defaults, `toPayload`, edit reset asserted
- [ ] Gate passes: `npm run test`; test count recorded
**Tests**: unit
**Gate**: full
**Commit**: `test(fe): form validation + mapping tests`

---

### T17: CSV import dedup IT [P]
**What**: Assert Nubank CSV import dedups on `externalId` (no double rows).
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../CsvImportIT.java`
**Depends on**: T6
**Reuses**: Harness, CSV import service, Fixtures
**Requirement**: TEST-13
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Importing the same `externalId` twice yields one row
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(import): csv externalId dedup integration`

---

### T18: Invitations lifecycle IT [P]
**What**: Accept idempotent, expiry → 410, revoke behavior through the API.
**Where**: `finsight-backend/src/test/java/com/lcs/finsight/.../InvitationLifecycleIT.java`
**Depends on**: T6
**Reuses**: Harness, `PlanInvitationController`, Fixtures
**Requirement**: TEST-14
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] Double-accept is idempotent; expired → 410; revoked → rejected
- [ ] Gate passes: `./mvnw verify`; test count recorded
**Tests**: integration
**Gate**: full
**Commit**: `test(invite): invitation lifecycle integration`

---

### T19: Frontend service-hook tests [P]
**What**: Assert plan-scoped URLs, query keys, and cache invalidation on mutation.
**Where**: `finsight-frontend/src/api/**/<hook>.test.ts`
**Depends on**: T11
**Reuses**: FE harness, TanStack Query test utils, service hooks
**Requirement**: TEST-15
**Tools**: MCP: context7 (TanStack Query testing utils); Skill: NONE
**Done when**:
- [ ] A mutation invalidates the expected query keys; URLs are plan-scoped
- [ ] Gate passes: `npm run test`; test count recorded
**Tests**: unit
**Gate**: full
**Commit**: `test(fe): service hook query/invalidation tests`

---

### T20: Base UI interaction guard [P]
**What**: A story/interaction test asserting correct compound-component parent-context nesting (guards the L-002 runtime-only failure).
**Where**: `finsight-frontend/src/components/**/*.stories.tsx` (interaction test / `play`)
**Depends on**: T11
**Reuses**: Existing Storybook browser project, component stories
**Requirement**: TEST-16
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] A compound component (e.g. dropdown/menu group) renders + interacts with no Base UI context error
- [ ] Gate passes: `npm run test`; test count recorded
**Tests**: unit (story/interaction)
**Gate**: full
**Commit**: `test(fe): base ui interaction guard`

---

### T21: Update TESTING.md + CONCERNS.md
**What**: Document the gate commands + coverage policy; downgrade the "no backend test coverage" concern.
**Where**: `.specs/codebase/TESTING.md`, `.specs/codebase/CONCERNS.md`
**Depends on**: T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20
**Reuses**: —
**Requirement**: TEST-17
**Tools**: MCP: NONE; Skill: NONE
**Done when**:
- [ ] TESTING.md reflects the Testcontainers harness, `*Test`/`*IT` split, coverage policy, and updated matrix
- [ ] CONCERNS.md "no backend test coverage" entry downgraded/resolved
- [ ] No code gate (docs only)
**Tests**: none (docs)
**Gate**: none
**Commit**: `docs(test): update TESTING.md + CONCERNS.md`

---

## Pre-Approval Validation

### Check 1 — Granularity
| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 file (pom deps/plugins) | ✅ |
| T2 | 1 file (properties) | ✅ |
| T3 | 1 class | ✅ |
| T4 | 1 class | ✅ |
| T5 | 2 cohesive support classes | ✅ (cohesive) |
| T6–T9 | 1 test file each | ✅ |
| T10 | 1 file (pom check rule) | ✅ |
| T11 | 1 config + 1 test (harness bootstrap) | ✅ (cohesive) |
| T12–T20 | 1 test file each (T16/T19 +dep) | ✅ |
| T21 | 2 doc files | ✅ (cohesive) |

### Check 2 — Diagram ↔ Definition cross-check
| Task | Depends on (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | Phase-1 start | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T6 | T6→T8 | ✅ |
| T9 | T6 | T6→T9 | ✅ |
| T10 | T7,T8,T9 | T7,T8,T9→T10 | ✅ |
| T11 | None | Phase-3 [P], no arrow in | ✅ |
| T12 | T6 | T6→T12 | ✅ |
| T13 | T6 | T6→T13 | ✅ |
| T14 | T6 | T6→T14 | ✅ |
| T15 | T6 | T6→T15 | ✅ |
| T16 | T11 | T11→T16 | ✅ |
| T17 | T6 | T6→T17 | ✅ |
| T18 | T6 | T6→T18 | ✅ |
| T19 | T11 | T11→T19 | ✅ |
| T20 | T11 | T11→T20 | ✅ |
| T21 | all | (all)→T21 | ✅ |

### Check 3 — Test co-location
| Task | Layer created | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1–T5 | test-infrastructure (no app code) | n/a | none (proven by T6) | ✅ merge-forward |
| T6–T9, T12–T15, T17–T18 | backend integration seams | integration | integration | ✅ |
| T10 | build config | n/a | none (red/green proof inline) | ✅ |
| T11, T16, T19 | FE features/hooks/forms | unit (was "none/gap") | unit | ✅ raises coverage |
| T20 | FE UI primitive | story render | unit (story/interaction) | ✅ |
| T21 | docs | n/a | none | ✅ |

**Parallelism note:** `[P]` here means *developable by concurrent sub-agents* — each Maven invocation gets its **own** Testcontainers Postgres (per-JVM), so parallel development is isolated. The **committed** suite runs single-fork (design TD-3), so this supersedes TESTING.md's old "backend @SpringBootTest: Parallel-Safe No" (which described the retired shared-dev-DB model).

---

## Progress Log

**Executed & E2E-verified 2026-07-17.** All 21 tasks done; `./mvnw clean verify` and `npm run test` both green. Backend: 55 unit + 58 integration tests across 10 new `*IT` classes. Frontend: 37 unit tests (4 files) + Storybook project (16 files, 42 tests, incl. 1 new `play`-function interaction guard). Two real (pre-existing) bugs found during test-writing, not fixed in this pass — see STATE.md B-002 (login unknown-email → 500 not 401) and B-003 (negative transaction amount accepted). TESTING.md and CONCERNS.md updated (T21).

| Task | Status | Commit (backend / frontend) | Notes |
| --- | --- | --- | --- |
| T1 | Done | `0b1bac3` | Testcontainers + JaCoCo 0.8.15 + failsafe deps/plugins |
| T2 | Done | `4fb61ce` | Test profile properties |
| T3 | Done | `e31a2d9` | Singleton Testcontainers Postgres config |
| T4 | Done | `ff2e595` | AbstractIntegrationTest base class |
| T5 | Done | `3ccae74` | TestAuthHelper + Fixtures |
| T6 | Done | `596ed81` | Harness smoke IT — needed 2 fixes beyond spec: `@Import` for `@TestComponent` beans, and `docker-java.properties` (api.version=1.44) for the testcontainers/Docker-29 bug. See STATE.md L-008 for the local Docker socket setup this machine needed. |
| T7 | Done | `fa891ca` | SPLIT-01 invariant IT |
| T8 | Done | `85201c0` | Dashboard partition (A−B+I) invariant IT |
| T9 | Done | `ff0bac1` | Plan authorization matrix IT — no authz gaps found |
| T10 | Done | `8b5aa2d` | JaCoCo floor (0.80) on SplitResolver/CategoryBreakdownAssembler/PlanAuthorization; red/green proof done |
| T11 | Done | `5a62459` (FE) | FE `unit` vitest project + CreatePlanDialog schema test |
| T12 | Done | `7228d88` | Authentication slice IT — found B-002 |
| T13 | Done | `4d4f82e` | Transaction CRUD full-replace IT — found B-003 |
| T14 | Done | `ecc6065` | Series generate/edit + guards IT — no bugs found |
| T15 | Done | `48813dd` | Migrations apply-clean IT |
| T16 | Done | `19de786` (FE) | FE form tests — one form component handles both plain + series modes (SPEC_DEVIATION from assumed "two forms", documented) |
| T17 | Done | `93bc85f` | CSV import dedup IT |
| T18 | Done | `05360ff` | Invitation lifecycle IT — LINK invites are idempotent, EMAIL invites are not (real, documented discrepancy vs. task assumption) |
| T19 | Done | `f06f8c0` (FE) | FE service-hook (usePlanService) URL-scoping + invalidation tests |
| T20 | Done | `0b9af42` (FE) | Base UI interaction guard on Dropdown — red/green-proven against the original L-002 failure |
| T21 | Done | (docs only, no commit — `.specs/` root is unversioned) | TESTING.md rewritten, CONCERNS.md coverage entries downgraded |
</content>
