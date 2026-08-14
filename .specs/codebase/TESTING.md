# Testing Infrastructure

**Analyzed:** 2026-07-05
**Updated:** 2026-07-25 (`*IT` moved off Testcontainers onto the `dev_finsight` database)
**Prior:** 2026-07-17 (test-foundation feature, T1–T21 — see `.specs/features/test-foundation/`)

## Test Frameworks

**Backend (backend):**

- Unit (`*Test`, surefire, `mvn test`): JUnit 5 via `spring-boot-starter-test`. Plain Mockito/AssertJ unit tests for pure logic — no Spring context.
- Integration (`*IT`, failsafe, `mvn verify`): JUnit 5 + `spring-boot-starter-test`. Runs against the real `dev_finsight` Postgres over the SSH tunnel (**not** an ephemeral container — Testcontainers was removed 2026-07-25), full Flyway migration chain, real MockMvc HTTP requests, real JWTs via the production `JwtService` (not `@WithMockUser` for security-sensitive tests).
- Coverage: JaCoCo (`jacoco-maven-plugin` 0.8.15) — global report always generated; a `check` rule gates branch coverage ≥0.80 on exactly three invariant-bearing classes (see Coverage Targets below). No global minimum.
- E2E: none (out of scope — MockMvc-driven integration tests substitute for HTTP-level E2E).

**Frontend (frontend):**

- Unit/logic (`unit` vitest project, jsdom, `npm run test`): pure-logic tests — zod schema validation, `buildDefaultValues`, `toPayload`/request mappers, TanStack Query hook behavior (`renderHook` + a real `QueryClient`, HTTP client mocked at module level).
- Component/story (`storybook` vitest project, browser/Chromium, existing since before this pass): Storybook stories double as render/smoke tests; some now carry `play` functions for interaction-level regression guards (see "Base UI interaction guard" below).
- Coverage: `@vitest/coverage-v8`, wired to `npm run test:coverage` (targets the `unit` project only).

## Test Organization

**Backend:**

- Location: `backend/src/test/java/com/lcs/finsight/`.
- Harness/support (test-infrastructure, not app code): `support/AbstractIntegrationTest.java` (base class every `*IT` extends — `@SpringBootTest(MOCK)` + MockMvc + `truncateAll()` `@BeforeEach` + the disposable-database guard), `support/TestAuthHelper.java` (real-JWT bearer tokens), `support/Fixtures.java` (plan/member/transaction builders via real repositories).
- `*Test` files (existing, unchanged by this pass): `services/SplitResolverTest.java`, `services/CategoryBreakdownAssemblerTest.java`, `services/SeriesRegeneratorTest.java`, `services/RecurringTransactionGeneratorTest.java`, `security/PlanAuthorizationTest.java`.
- `*IT` files (new): `support/HarnessSmokeIT.java`, `services/SplitInvariantIT.java`, `services/DashboardPartitionIT.java`, `security/PlanAuthorizationMatrixIT.java`, `security/AuthenticationIT.java`, `services/TransactionCrudIT.java`, `services/SeriesEditIT.java`, `services/MigrationsIT.java`, `services/CsvImportIT.java`, `services/InvitationLifecycleIT.java`.
- `FinSightApplicationTests.java` now extends `AbstractIntegrationTest` (previously booted against the real `SPRING_DATASOURCE_URL`/`.env`, which made even the default context-load stub depend on a live tunnel).
- Test config: `src/test/resources/application-test.properties` (fixed `JWT_SECRET_KEY`, `spring.flyway.enabled=true`, `ddl-auto=validate`). It deliberately does **not** set the datasource — `application.properties`' `${SPRING_DATASOURCE_*}` placeholders resolve from `backend/.env` exactly as in a normal run.

**Frontend:**

- Stories: co-located with components, `frontend/src/components/**/*.stories.tsx` (unchanged pattern; `Dropdown.stories.tsx` gained a `play` function).
- Unit/logic tests: co-located with the code under test, `*.test.ts`/`*.test.tsx` — e.g. `src/features/plans/components/CreatePlanDialog.test.ts`, `src/features/home/components/transactions/TransactionFormDrawer.test.ts` + `.series.test.ts`, `src/api/services/usePlanService.test.ts`.

## Testing Patterns

### Unit Tests

**Backend:** plain JUnit 5 + Mockito, no Spring context, fast. Covers `SplitResolver`, `CategoryBreakdownAssembler`, `SeriesRegenerator`, `RecurringTransactionGenerator`, `PlanAuthorization` — the pure-logic/invariant classes.

**Frontend:** zod schema assertions, pure mapper-function assertions (`buildDefaultValues`/`toPayload`), and `renderHook`-based TanStack Query hook tests (mocked HTTP client, real `QueryClient`) — all in jsdom, no browser needed. Component render/smoke coverage stays on the Storybook `play`-function pattern where DOM/interaction is genuinely required (e.g. the Base UI compound-component guard).

### Integration Tests

**Backend — Approach:** `*IT` classes extend `AbstractIntegrationTest`, drive the app through real HTTP requests via MockMvc against the `dev_finsight` Postgres (real commits — **not** `@Transactional` rollback; state is reset via a fast `TRUNCATE ... RESTART IDENTITY CASCADE` `@BeforeEach`, deliberately, because rollback-wrapping would hide flush-order bugs like the one found during series-edit, STATE.md L-007). Real JWTs via `TestAuthHelper`, not mocked auth, for anything security-sensitive. Fixtures seed data directly through repositories (fast, clear setup) rather than driving every precondition through the API.

**⚠️ The suite empties `dev_finsight`.** `truncateAll()` wipes every table (except `flyway_schema_history`) before *each* test, so after any `./mvnw verify` the dev database is empty and needs re-seeding for manual UI testing. That is the accepted trade — there are only two databases and `dev_finsight` is the throwaway one now that the real data lives in prod. Because the datasource comes from `backend/.env` (which sits next to `.env.production`, and both point at the same Postgres instance), `AbstractIntegrationTest` fails the run unless the connected database's name is in its `DISPOSABLE_DATABASES` allowlist. Widen that set only for another genuinely throwaway database; **never** add the production one.

**Frontend — Approach:** none beyond the hook-level TanStack Query tests above; no browser-driven E2E.

### E2E Tests

None on either side, by design (see Test Frameworks above).

## Local Environment Setup — the DB tunnel (read before running `*IT`/`mvn verify`)

The `*IT` suite talks to `dev_finsight` on the VPS through the SSH tunnel that publishes it on `localhost:5432`. **Bring the tunnel up first** — with it down, every `*IT` (and `FinSightApplicationTests`, which surefire also picks up) fails at context startup with `Connection to localhost:5432 refused`. `backend/.env` must exist too; nothing supplies a fallback datasource anymore.

Docker is no longer involved. Testcontainers, `TestContainersConfig.java`, and `docker-java.properties` were removed 2026-07-25, which retires the `DOCKER_HOST` / `TESTCONTAINERS_RYUK_DISABLED` exports that STATE.md Lesson L-008 documented — that lesson is now historical.

## Test Execution

**Backend:**

```bash
cd backend
./mvnw test          # *Test (surefire) — but FinSightApplicationTests is an integration test by
                     # inheritance, so this still needs the tunnel; -Dtest=<name> for a pure unit test
./mvnw verify         # unit + integration (*Test + *IT) + jacoco:check — needs the tunnel, empties dev_finsight
```

**Frontend:**

```bash
cd frontend
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
| Backend pure logic (resolvers/assemblers/authz) | unit (present)  | `backend/src/test/**/*Test.java`                       | `./mvnw test`                             |
| Backend HTTP/security/DB slice        | integration (present)   | `backend/src/test/**/*IT.java`                          | `./mvnw verify`                           |
| Backend controllers (beyond the *IT already covering create/edit/auth/dashboard/csv/invitations) | integration (partial) | same as above | `./mvnw verify` |
| Backend migrations                    | integration (present)   | `backend/src/test/**/MigrationsIT.java`                 | `./mvnw verify`                           |
| Frontend UI primitives                | story render (present)  | `frontend/src/components/**/*.stories.tsx`              | `npx vitest run --project=storybook`      |
| Frontend Base UI compound components  | story interaction (present, 1 guard) | `frontend/src/components/dropdown/Dropdown.stories.tsx` | `npx vitest run --project=storybook`      |
| Frontend forms (schema/defaults/payload/edit-reset) | unit (present, 2 forms) | `frontend/src/features/**/*.test.{ts,tsx}`             | `npm run test`                            |
| Frontend service hooks (URL scoping + invalidation) | unit (present, 1 service) | `frontend/src/api/**/*.test.ts`                       | `npm run test`                            |
| Frontend remaining feature components/hooks | none (gap)         | `frontend/src/features/**`                              | `npm run test`                            |

Remaining gaps (not "no coverage exists" anymore, but "coverage is not yet exhaustive") — see `CONCERNS.md`.

## Parallelism Assessment

| Test Type                     | Parallel-Safe? | Isolation Model                                                                                  | Evidence |
| ------------------------------ | -------------- | -------------------------------------------------------------------------------------------------- | -------- |
| Backend `*Test` (unit)         | Yes            | No Spring context, no shared state                                                                  | Plain JUnit/Mockito |
| Backend `*IT` (integration, **development**) | **No — superseded 2026-07-25** | All concurrent `mvn` invocations now share the one `dev_finsight` database, and each truncates every table between tests. Two parallel runs will wipe each other's data mid-test. Run the backend suite one at a time; do not fan `[P]` sub-agents across `mvn verify`. | Testcontainers removed — no per-JVM container |
| Backend `*IT` (integration, **committed suite**) | No — single-fork by design | All `*IT` in one `mvn verify` run share one container + truncate-between-tests; this supersedes the old "shares one real datasource, no isolation" note | design.md TD-3 |
| Frontend `unit` project tests   | Yes            | jsdom, no shared mutable state, mocked HTTP layer per test                                          | `renderHook`/schema tests are pure |
| Frontend `storybook` project tests | Yes         | Each story renders in an isolated headless Chromium context                                         | `vite.config.ts` (`browser` project) |

## Gate Check Commands

| Gate Level | When to Use                               | Command                                                                                       |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Quick      | Backend change, unit tests only            | `cd backend && ./mvnw test` (needs the tunnel — `FinSightApplicationTests` boots a context) |
| Quick (FE) | Frontend logic change                      | `cd frontend && npm run test`                                                          |
| Full       | Backend change touching HTTP/DB/security   | `cd backend && ./mvnw verify` (tunnel up; empties `dev_finsight` — see Local Environment Setup) |
| Full (FE)  | Frontend change touching a compound/Base UI component | `cd frontend && npx vitest run` (both projects)                             |
| Build      | Phase completion                           | `cd backend && ./mvnw package` ; `cd frontend && npm run lint && npm run build` |

Commands are extracted from `backend/pom.xml` (Maven wrapper, failsafe+jacoco bindings) and `frontend/package.json` scripts (added by T11).
