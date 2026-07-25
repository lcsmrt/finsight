# Testing Infrastructure

**Analyzed:** 2026-07-05
**Updated:** 2026-07-17 (test-foundation feature, T1–T21 — see `.specs/features/test-foundation/`)

## Test Frameworks

**Backend (finsight-backend):**

- Unit (`*Test`, surefire, `mvn test`): JUnit 5 via `spring-boot-starter-test`. Plain Mockito/AssertJ unit tests for pure logic — no Spring context.
- Integration (`*IT`, failsafe, `mvn verify`): JUnit 5 + `spring-boot-testcontainers` + `org.testcontainers:junit-jupiter`/`postgresql`. Real ephemeral Postgres container, full Flyway migration chain, real MockMvc HTTP requests, real JWTs via the production `JwtService` (not `@WithMockUser` for security-sensitive tests).
- Coverage: JaCoCo (`jacoco-maven-plugin` 0.8.15) — global report always generated; a `check` rule gates branch coverage ≥0.80 on exactly three invariant-bearing classes (see Coverage Targets below). No global minimum.
- E2E: none (out of scope — MockMvc-driven integration tests substitute for HTTP-level E2E).

**Frontend (finsight-frontend):**

- Unit/logic (`unit` vitest project, jsdom, `npm run test`): pure-logic tests — zod schema validation, `buildDefaultValues`, `toPayload`/request mappers, TanStack Query hook behavior (`renderHook` + a real `QueryClient`, HTTP client mocked at module level).
- Component/story (`storybook` vitest project, browser/Chromium, existing since before this pass): Storybook stories double as render/smoke tests; some now carry `play` functions for interaction-level regression guards (see "Base UI interaction guard" below).
- Coverage: `@vitest/coverage-v8`, wired to `npm run test:coverage` (targets the `unit` project only).

## Test Organization

**Backend:**

- Location: `finsight-backend/src/test/java/com/lcs/finsight/`.
- Harness/support (test-infrastructure, not app code): `support/TestContainersConfig.java` (singleton Testcontainers Postgres via `@ServiceConnection`), `support/AbstractIntegrationTest.java` (base class every `*IT` extends — `@SpringBootTest(MOCK)` + MockMvc + `truncateAll()` `@BeforeEach`), `support/TestAuthHelper.java` (real-JWT bearer tokens), `support/Fixtures.java` (plan/member/transaction builders via real repositories).
- `*Test` files (existing, unchanged by this pass): `services/SplitResolverTest.java`, `services/CategoryBreakdownAssemblerTest.java`, `services/SeriesRegeneratorTest.java`, `services/RecurringTransactionGeneratorTest.java`, `security/PlanAuthorizationTest.java`.
- `*IT` files (new): `support/HarnessSmokeIT.java`, `services/SplitInvariantIT.java`, `services/DashboardPartitionIT.java`, `security/PlanAuthorizationMatrixIT.java`, `security/AuthenticationIT.java`, `services/TransactionCrudIT.java`, `services/SeriesEditIT.java`, `services/MigrationsIT.java`, `services/CsvImportIT.java`, `services/InvitationLifecycleIT.java`.
- `FinSightApplicationTests.java` now extends `AbstractIntegrationTest` (previously booted against the real `SPRING_DATASOURCE_URL`/`.env`, which made even the default context-load stub depend on a live tunnel).
- Test config: `src/test/resources/application-test.properties` (fixed `JWT_SECRET_KEY`, `spring.flyway.enabled=true`, `ddl-auto=validate`, non-placeholder datasource stand-ins superseded by `@ServiceConnection`), `src/test/resources/docker-java.properties` (`api.version=1.44` — see Local Environment Setup below).

**Frontend:**

- Stories: co-located with components, `finsight-frontend/src/components/**/*.stories.tsx` (unchanged pattern; `Dropdown.stories.tsx` gained a `play` function).
- Unit/logic tests: co-located with the code under test, `*.test.ts`/`*.test.tsx` — e.g. `src/features/plans/components/CreatePlanDialog.test.ts`, `src/features/home/components/transactions/TransactionFormDrawer.test.ts` + `.series.test.ts`, `src/api/services/usePlanService.test.ts`.

## Testing Patterns

### Unit Tests

**Backend:** plain JUnit 5 + Mockito, no Spring context, fast. Covers `SplitResolver`, `CategoryBreakdownAssembler`, `SeriesRegenerator`, `RecurringTransactionGenerator`, `PlanAuthorization` — the pure-logic/invariant classes.

**Frontend:** zod schema assertions, pure mapper-function assertions (`buildDefaultValues`/`toPayload`), and `renderHook`-based TanStack Query hook tests (mocked HTTP client, real `QueryClient`) — all in jsdom, no browser needed. Component render/smoke coverage stays on the Storybook `play`-function pattern where DOM/interaction is genuinely required (e.g. the Base UI compound-component guard).

### Integration Tests

**Backend — Approach:** `*IT` classes extend `AbstractIntegrationTest`, drive the app through real HTTP requests via MockMvc against a singleton Testcontainers Postgres (started once per JVM, Flyway-migrated once, real commits — **not** `@Transactional` rollback; state is reset via a fast `TRUNCATE ... RESTART IDENTITY CASCADE` `@BeforeEach`, deliberately, because rollback-wrapping would hide flush-order bugs like the one found during series-edit, STATE.md L-007). Real JWTs via `TestAuthHelper`, not mocked auth, for anything security-sensitive. Fixtures seed data directly through repositories (fast, clear setup) rather than driving every precondition through the API.

**Frontend — Approach:** none beyond the hook-level TanStack Query tests above; no browser-driven E2E.

### E2E Tests

None on either side, by design (see Test Frameworks above).

## Local Environment Setup — Docker (read before running `*IT`/`mvn verify`)

Testcontainers needs a working Docker daemon. On a standard Linux Docker install this just works. **On this development machine specifically** (Docker Desktop on Linux, non-standard socket topology), two environment variables are required or `mvn verify` fails with Docker-environment errors that have nothing to do with the code:

```bash
export DOCKER_HOST=unix:///home/lcs/.docker/desktop/docker.raw.sock
export TESTCONTAINERS_RYUK_DISABLED=true
```

Full diagnosis and rationale: `.specs/project/STATE.md`, Lesson L-008. One fix is **not** machine-specific and is already committed: `finsight-backend/src/test/resources/docker-java.properties` pins `api.version=1.44`, working around a real testcontainers 1.21.x bug against Docker Engine 29+ (upstream: testcontainers/testcontainers-java#11210, fixed in 2.x).

If `TESTCONTAINERS_RYUK_DISABLED=true` is needed on your machine, containers are not auto-reaped by Ryuk — a plain JVM shutdown hook still removes the container on normal process exit (confirmed via `docker ps -a` after a run), but an abnormal kill (e.g. `kill -9` mid-test) can leave a stray `postgres:16-alpine` container running. Check `docker ps -a` occasionally if disk/memory pressure shows up.

## Test Execution

**Backend:**

```bash
cd finsight-backend
./mvnw test          # unit only (*Test, surefire) — fast, no Docker needed
./mvnw verify         # unit + integration (*Test + *IT) + jacoco:check — needs Docker (see above)
```

**Frontend:**

```bash
cd finsight-frontend
npm run test           # unit/logic tests only (jsdom, fast, no browser) — vitest run --project=unit
npm run test:coverage  # same, with coverage
npm run test:watch     # watch mode
npx vitest run --project=storybook   # story/interaction tests (Chromium, headless)
npx vitest run                        # both projects
```

## Coverage Targets

**Current:**
- Backend: global JaCoCo report generated on every `mvn verify` (no global minimum). A `check` rule gates branch coverage ≥0.80 on exactly `SplitResolver`, `CategoryBreakdownAssembler`, `PlanAuthorization` — the three invariant-bearing classes identified during design (AD-007's partition invariant, SPLIT-01, and the two-layer plan authz model). Weakening test coverage on any of these three fails `mvn verify`; no other class is gated.
- Frontend: `@vitest/coverage-v8` wired but no enforced minimum yet.

**Goals:** extend the JaCoCo floor to additional invariant classes as they're identified; consider a frontend coverage floor once the `unit` project has broader feature coverage.
**Enforcement:** backend — `jacoco:check` bound to the `verify` phase (hard gate, fails the build). Frontend — none yet (reporting only).

## Test Coverage Matrix

| Code Layer                           | Test Type              | Location Pattern                                              | Run Command                              |
| ------------------------------------- | ----------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| Backend pure logic (resolvers/assemblers/authz) | unit (present)  | `finsight-backend/src/test/**/*Test.java`                       | `./mvnw test`                             |
| Backend HTTP/security/DB slice        | integration (present)   | `finsight-backend/src/test/**/*IT.java`                          | `./mvnw verify`                           |
| Backend controllers (beyond the *IT already covering create/edit/auth/dashboard/csv/invitations) | integration (partial) | same as above | `./mvnw verify` |
| Backend migrations                    | integration (present)   | `finsight-backend/src/test/**/MigrationsIT.java`                 | `./mvnw verify`                           |
| Frontend UI primitives                | story render (present)  | `finsight-frontend/src/components/**/*.stories.tsx`              | `npx vitest run --project=storybook`      |
| Frontend Base UI compound components  | story interaction (present, 1 guard) | `finsight-frontend/src/components/dropdown/Dropdown.stories.tsx` | `npx vitest run --project=storybook`      |
| Frontend forms (schema/defaults/payload/edit-reset) | unit (present, 2 forms) | `finsight-frontend/src/features/**/*.test.{ts,tsx}`             | `npm run test`                            |
| Frontend service hooks (URL scoping + invalidation) | unit (present, 1 service) | `finsight-frontend/src/api/**/*.test.ts`                       | `npm run test`                            |
| Frontend remaining feature components/hooks | none (gap)         | `finsight-frontend/src/features/**`                              | `npm run test`                            |

Remaining gaps (not "no coverage exists" anymore, but "coverage is not yet exhaustive") — see `CONCERNS.md`.

## Parallelism Assessment

| Test Type                     | Parallel-Safe? | Isolation Model                                                                                  | Evidence |
| ------------------------------ | -------------- | -------------------------------------------------------------------------------------------------- | -------- |
| Backend `*Test` (unit)         | Yes            | No Spring context, no shared state                                                                  | Plain JUnit/Mockito |
| Backend `*IT` (integration, **development**) | Yes | Each concurrent `mvn` invocation (e.g. parallel sub-agent development) gets its **own** JVM and therefore its own Testcontainers Postgres singleton | `TestContainersConfig` starts one container per JVM |
| Backend `*IT` (integration, **committed suite**) | No — single-fork by design | All `*IT` in one `mvn verify` run share one container + truncate-between-tests; this supersedes the old "shares one real datasource, no isolation" note | design.md TD-3 |
| Frontend `unit` project tests   | Yes            | jsdom, no shared mutable state, mocked HTTP layer per test                                          | `renderHook`/schema tests are pure |
| Frontend `storybook` project tests | Yes         | Each story renders in an isolated headless Chromium context                                         | `vite.config.ts` (`browser` project) |

## Gate Check Commands

| Gate Level | When to Use                               | Command                                                                                       |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Quick      | Backend change, unit tests only            | `cd finsight-backend && ./mvnw test`                                                            |
| Quick (FE) | Frontend logic change                      | `cd finsight-frontend && npm run test`                                                          |
| Full       | Backend change touching HTTP/DB/security   | `cd finsight-backend && export DOCKER_HOST=... && export TESTCONTAINERS_RYUK_DISABLED=true && ./mvnw verify` (see Local Environment Setup) |
| Full (FE)  | Frontend change touching a compound/Base UI component | `cd finsight-frontend && npx vitest run` (both projects)                             |
| Build      | Phase completion                           | `cd finsight-backend && ./mvnw package` ; `cd finsight-frontend && npm run lint && npm run build` |

Commands are extracted from `finsight-backend/pom.xml` (Maven wrapper, failsafe+jacoco bindings) and `finsight-frontend/package.json` scripts (added by T11).
