# Test Foundation Design

**Spec**: `.specs/features/test-foundation/spec.md`
**Status**: Draft

> Diagram note: the `mermaid-studio` skill isn't installed — using inline mermaid. Install it for rendered/validated diagrams.

---

## Architecture Overview

Two independent test stacks, each with a clear unit/integration split and its own coverage tool. The backend gains the piece it has never had: a **real ephemeral Postgres** (Testcontainers) that the full Flyway chain migrates, with tests driving the app through **MockMvc + real JWTs** so the security filter, `PlanContextArgumentResolver`, transactions, and SQL all execute exactly as in production.

```mermaid
graph TD
    subgraph Backend["Backend — mvn verify"]
        U1[Unit tests *Test\nsurefire, no Spring] --> J[JaCoCo agent]
        I1[Integration tests *IT\nfailsafe] --> BASE[AbstractIntegrationTest\n@SpringBootTest + MockMvc]
        BASE --> TC[(Testcontainers\nPostgres — singleton)]
        BASE --> FW[Flyway V1..V9\nauto-migrate on boot]
        BASE --> AUTH[TestAuthHelper\nreal JWT via JwtService]
        BASE --> FIX[Fixtures\nPlan/Member/Tx builders]
        FW --> TC
        I1 --> J
        J --> CHK[jacoco:check\nfloor on critical classes]
    end
    subgraph Frontend["Frontend — npm run test"]
        SB[storybook project\nbrowser/Chromium — existing] --> V8[coverage-v8]
        UNIT[unit project\njsdom — new] --> V8
    end
```

**Key stance on isolation:** integration tests **commit for real** (no blanket `@Transactional` rollback) and reset state via a fast truncate-all `@BeforeEach`. Rationale below (TD-3) — a rollback-only wrapper would have *hidden* the exact Hibernate flush-order bug found in Series-Edit (L-007). Realistic commit semantics are the point.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `JwtService` | `security/JwtService.java` | Mint real bearer tokens in `TestAuthHelper` — drives the actual auth filter |
| `AuthenticationController` / `AuthenticationService` | `controllers/`, `services/` | Register/login slice tests (TEST-08) hit these directly |
| `JwtAuthenticationFilter` + `PlanContextArgumentResolver` + `PlanAuthorization` | `security/` | Exercised end-to-end by the authz-matrix test (TEST-05) — not mocked |
| `SplitResolver`, `CategoryBreakdownAssembler` | `services/` | Already unit-tested; integration tests assert their invariants *through the API*; both are JaCoCo floor targets |
| Existing unit tests (`SeriesRegeneratorTest`, `SplitResolverTest`, `CategoryBreakdownAssemblerTest`, `PlanAuthorizationTest`) | `src/test/.../services`, `.../security` | Keep as-is (they're the fast `*Test` tier); the new `*IT` tier complements, doesn't replace |
| Repositories (`Plan`, `PlanMembership`, `FinancialTransaction`, …) | `repositories/` | Fixtures seed data directly via repos — faster and clearer than driving every setup through the API |
| Flyway migrations V1..V8 (+ V9 from B-001) | `src/main/resources/db/migration/` | Run unchanged in the container; TEST-11 asserts the whole chain applies clean |
| Storybook vitest project | `vite.config.ts` `test.projects[0]` | Keep; add a sibling `unit` project — the L-002 interaction guard (TEST-16) extends the story approach |

### Integration Points

| System | Integration Method |
| --- | --- |
| Postgres | Testcontainers `PostgreSQLContainer` wired via `@ServiceConnection` (Spring Boot 3.1+) — overrides the `.env`/`dev_finsight` datasource for tests only |
| Flyway | `spring.flyway.enabled=true` already set; runs on context boot against the container; `ddl-auto=validate` doubles as an entity-vs-schema drift check |
| Security | Real JWT in the `Authorization` header → real filter chain (no `@WithMockUser` for the matrix test) |

---

## Components

### AbstractIntegrationTest (base class)
- **Purpose**: One-line entry point for every `*IT` — boots the app once against the singleton container with MockMvc ready.
- **Location**: `src/test/java/com/lcs/finsight/support/AbstractIntegrationTest.java`
- **Interfaces**: `@SpringBootTest(webEnvironment=MOCK)` + `@AutoConfigureMockMvc` + `@ActiveProfiles("test")`; exposes `protected MockMvc mockMvc`, `protected <repos>`; `@BeforeEach truncateAll()`.
- **Dependencies**: Testcontainers singleton, Spring test context, `application-test.properties`.
- **Reuses**: The whole real application context.

### TestContainersConfig / singleton container
- **Purpose**: Start **one** Postgres container for the entire suite (fast); publish its connection to Spring.
- **Location**: `src/test/java/com/lcs/finsight/support/TestContainersConfig.java`
- **Interfaces**: `@TestConfiguration(proxyBeanMethods=false)` with `@Bean @ServiceConnection PostgreSQLContainer<?> postgres()` using a static singleton (started in a static initializer, never stopped — JVM teardown reaps it).
- **Dependencies**: `org.testcontainers:postgresql`, `:junit-jupiter`, `spring-boot-testcontainers`.
- **Reuses**: Spring Boot BOM manages all versions.

### TestAuthHelper
- **Purpose**: Produce authenticated request context for any user/role without going through login each time.
- **Location**: `src/test/java/com/lcs/finsight/support/TestAuthHelper.java`
- **Interfaces**: `String bearerFor(User user)`; `RequestPostProcessor asUser(User user)` — sets the `Authorization` header with a real token.
- **Dependencies**: `JwtService`.
- **Reuses**: `JwtService` (the production token minting).

### Fixtures (test data builders)
- **Purpose**: Concise, readable setup — a plan with members at given roles, transactions with participants/items.
- **Location**: `src/test/java/com/lcs/finsight/support/Fixtures.java`
- **Interfaces**: `Plan aPlan(User owner)`; `PlanMembership addMember(Plan, User, PlanRole)`; `FinancialTransaction aTransaction(Plan, User, …)`; split/item variants.
- **Dependencies**: Repositories.
- **Reuses**: Real entities + repositories (no shadow schema).

### JaCoCo config (pom)
- **Purpose**: Measure everywhere; gate only the invariant-bearing classes.
- **Location**: `finsight-backend/pom.xml`
- **Interfaces**: `jacoco-maven-plugin` with `prepare-agent`, `report`, and a `check` execution whose rule is **class-scoped** via `<includes>` to: `com.lcs.finsight.services.SplitResolver`, `com.lcs.finsight.services.CategoryBreakdownAssembler`, `com.lcs.finsight.security.PlanAuthorization` (branch floor, e.g. 0.80). Global report has no minimum.
- **Dependencies**: failsafe binding so `*IT` runs in `verify` and is counted.
- **Reuses**: —

### Failsafe binding (pom)
- **Purpose**: Split fast unit (`*Test`, surefire, `mvn test`) from container integration (`*IT`, failsafe, `mvn verify`).
- **Location**: `finsight-backend/pom.xml`
- **Interfaces**: `maven-failsafe-plugin` with `integration-test` + `verify` goals (versions/config from the Spring Boot parent).

### Frontend `unit` vitest project + scripts
- **Purpose**: A node/jsdom project for hooks/forms/utils next to the existing browser story project.
- **Location**: `finsight-frontend/vite.config.ts` (`test.projects[1]`), `package.json` scripts.
- **Interfaces**: `test.projects[1] = { name:'unit', test:{ environment:'jsdom', include:['src/**/*.test.{ts,tsx}'] } }`; scripts `test`, `test:coverage`, `test:watch`.
- **Dependencies**: P1 (schema/`toPayload` tests) needs only node env; P2 form tests (`buildDefaultValues`, edit reset via `react-hook-form`) add `@testing-library/react` + jsdom.
- **Reuses**: `@vitest/coverage-v8` (installed), existing zod schemas + `toPayload` mappers.

---

## Test Isolation & Data Strategy

| Concern | Decision |
| --- | --- |
| Container lifecycle | **Singleton**, shared across all `*IT` (start once ~2–3s, reused) |
| Per-test isolation | **Truncate-all `@BeforeEach`** (TRUNCATE … RESTART IDENTITY CASCADE) — real commits, deterministic clean slate |
| Why not `@Transactional` rollback | It never flushes like production and would mask flush-order bugs (L-007). Web-layer requests also run their own tx, so rollback wrapping is unreliable for MockMvc anyway |
| Parallel safety | Suite runs single-fork by default; truncate-per-test + one schema keeps it correct. (Parallel forks would need per-fork containers — deferred, not needed) |
| Never touch `dev_finsight` | `@ServiceConnection` overrides the datasource to the container; `application-test.properties` supplies a fixed `JWT_SECRET_KEY`, so tests depend on **zero** `.env`/tunnel state |

---

## Error Handling Strategy

| Scenario | Handling | Result |
| --- | --- | --- |
| Docker not running | Testcontainers throws at startup | Suite fails fast with "Could not find a valid Docker environment" — clear, no hang (spec edge case) |
| Migration fails to apply on empty DB | Flyway errors on context boot | TEST-11 fails — exactly its job |
| Entity/schema drift | `ddl-auto=validate` fails context load | Any `*IT` goes red — free drift detection |
| Critical coverage below floor | `jacoco:check` fails `verify` | Build red; global % only reported |

---

## Tech Decisions (non-obvious)

| Decision | Choice | Rationale |
| --- | --- | --- |
| TD-1: DB for integration tests | Testcontainers Postgres (not H2) | Real dialect/SQL (correlated subquery sort SORT-03, `TRUNCATE`, Flyway PG module); H2 would diverge from prod |
| TD-2: Container lifecycle | Singleton static, `@ServiceConnection` | Start-once is the standard fast pattern; `@ServiceConnection` is the idiomatic Boot 3.1+ wiring, no manual `@DynamicPropertySource` |
| TD-3: Isolation | Real commits + truncate, **not** rollback | Rollback hides flush-order bugs (the L-007 participant `clear()`+re-add race) and is unreliable through MockMvc |
| TD-4: Unit vs integration split | `*Test` (surefire) vs `*IT` (failsafe) | Fast feedback loop stays fast; container tests only on `verify` |
| TD-5: Coverage floor scope | Class-level `<includes>` on 3 invariant classes | Matches the user's "floor on critical only"; avoids gating a ~0% codebase globally |
| TD-6: Auth in tests | Real JWT via `JwtService` for the matrix; `@WithMockUser` acceptable for non-security slices | TEST-05 must prove the *real* filter+resolver fail closed; elsewhere speed is fine |
| TD-7: FE project split | Add `unit` (jsdom) project, keep `storybook` (browser) | Pure logic (zod/`toPayload`) needs no browser; keeps story render-tests intact |
| TD-8: New Maven deps | Only Testcontainers artifacts + JaCoCo plugin; **all Testcontainers versions from the Spring Boot BOM** | No version guesswork; minimal footprint |

---

## New Dependencies

**Backend (`pom.xml`, test scope, versions from BOM):**
- `org.springframework.boot:spring-boot-testcontainers`
- `org.testcontainers:junit-jupiter`
- `org.testcontainers:postgresql`
- Plugins: `org.jacoco:jacoco-maven-plugin` (needs explicit version — latest stable), `maven-failsafe-plugin` (version from parent)

**Frontend (`package.json`, dev, P2 only):**
- `@testing-library/react`, `jsdom` (only when P2 form-render tests land; P1 schema tests need neither)

---

## Requirement → Component Map

| Requirement | Built by |
| --- | --- |
| TEST-01 | TestContainersConfig, AbstractIntegrationTest, application-test.properties, failsafe binding |
| TEST-02 | AbstractIntegrationTest (MockMvc), TestAuthHelper, Fixtures |
| TEST-03/04/05 | Critical-invariant `*IT` on top of the harness |
| TEST-06 | JaCoCo config |
| TEST-07 | FE `unit` project + scripts + first schema/`toPayload` test |
| TEST-08..11 | Auth/Tx/Series `*IT`; migration-apply `*IT` |
| TEST-12 | FE form tests (+ testing-library/jsdom) |
| TEST-13..15 | CSV/invitation `*IT`; FE hook tests |
| TEST-16 | Story/interaction test (browser project) |
| TEST-17 | TESTING.md + CONCERNS.md edits |
```
</content>
