# Test Foundation Specification

**Milestone:** M3 — Trust the Data
**Created:** 2026-07-17
**Status:** Specified (pending user approval)

## Problem Statement

Every feature shipped so far (Shared Plans, Splitting, Expense Items, Series Edit) has been verified by a **manual copy-DB E2E ritual** run by hand each session — the "ice-cream cone" anti-pattern. The only automated tests are 5 pure-logic unit tests plus a `@SpringBootTest` context stub that needs a live Postgres to even load. There are **zero** tests exercising the controller→service→repository→DB seams where the real risk lives (authorization, transactions, SQL, migrations), and **zero** frontend tests despite the tooling being installed. This makes the foundation unsafe to evolve as forecasting grows, and makes every release depend on a flaky SSH tunnel (Lessons L-005/L-006/L-007).

## Goals

- [ ] Stand up a **backend integration harness** (Testcontainers Postgres + Flyway + MockMvc) so the seams are tested against a real, ephemeral, parallel-safe database — no dev tunnel, no shared DB.
- [ ] Replace the manual copy-DB checks for the **critical invariants** (split partition, dashboard partition, plan authorization) with automated integration tests.
- [ ] Make **coverage measurable** (JaCoCo backend, vitest v8 frontend) with an enforced floor on critical packages only.
- [ ] Bootstrap the **frontend test harness** (a `test` script + a node-env vitest project) and its first meaningful tests.
- [ ] Document the resulting **gate commands and coverage policy** in TESTING.md as the pre-merge check.

## Out of Scope

| Feature | Reason |
| --- | --- |
| GitHub Actions / CI workflows | User chose local gate commands + docs; monorepo root isn't version-controlled yet (separate decision) |
| Hard global coverage threshold | User chose measure + floor-on-critical-only; ratchet up later |
| Mutation testing (PIT / Stryker) | Phase-2 "are the tests any good" quality measure; note it, don't build it |
| Standalone Playwright E2E suite | Integration + component tests cover the seams; full-browser E2E stays manual for now |
| **Recurrence Model v2** (interval vocabulary, open-ended rolling recurrence) | Split out as a separate **forecast-track feature** — it's feature work, not foundation |
| **B-001 cleanup** (remove free-text `frequency`) | Sibling M3 task, handled separately (small; read-audit + migration) |
| 100% / exhaustive coverage of DTO/config plumbing | Low risk; effort goes to the risk-ranked matrix, not vanity % |

---

## User Stories

### P1: Backend integration harness + critical-invariant tests ⭐ MVP

**User Story**: As the maintainer, I want the money/security/data-integrity invariants tested automatically against a real ephemeral Postgres, so I stop re-verifying them by hand every session.

**Why P1**: This is the whole point — it retires the manual copy-DB ritual for the three areas that would be catastrophic if wrong (money math, authorization, data integrity).

**Acceptance Criteria**:

1. WHEN the backend test suite runs THEN it SHALL provision an **ephemeral Postgres via Testcontainers**, apply the full Flyway V1..V8 chain, and run **without any dev SSH tunnel or shared `dev_finsight` database**.
2. WHEN integration tests run in parallel THEN each SHALL be isolated (per-container or transactional rollback) with no cross-test data bleed.
3. WHEN a split transaction is created through the API THEN the test SHALL assert the **SPLIT-01 invariant** (participations sum to `amount`) is persisted and that **unfiltered dashboard totals are unchanged** by the split.
4. WHEN the dashboard category breakdown is requested through the endpoint THEN the test SHALL assert the **partition invariant** (`spent[C] = A[C] − B[C] + I[C]`) for both itemized and non-itemized transactions, and that **top-line income/expense/net never move** with categories.
5. WHEN each cell of the **plan authorization matrix** (OWNER / EDITOR / CONTRIBUTOR / VIEWER / non-member) hits a scoped endpoint through the real resolver + security filter THEN the test SHALL assert the correct 200/403/404 and that a denied write produces **no partial persistence** (fail-closed).

**Independent Test**: Run `cd finsight-backend && ./mvnw verify` on a machine with Docker but no tunnel — the critical-area integration tests pass green.

---

### P1: Coverage measurement + critical-package floor ⭐ MVP

**User Story**: As the maintainer, I want coverage visible on every run and enforced where it matters, so quality is measured, not assumed.

**Why P1**: "How do we measure coverage?" was the explicit ask. Measurement + a targeted floor is what turns tests from vanity into a gate.

**Acceptance Criteria**:

1. WHEN `./mvnw verify` runs THEN **JaCoCo** SHALL produce a line + branch coverage report.
2. WHEN coverage on the **critical packages** (split/attribution, dashboard aggregation, plan authorization) falls below the agreed floor THEN the build SHALL **fail**; global coverage SHALL be **reported but not gated**.
3. WHEN the frontend `test:coverage` script runs THEN **vitest + coverage-v8** SHALL produce a line/branch/function report.

**Independent Test**: Drop an assertion in a critical package below the floor → `./mvnw verify` goes red; a low-coverage plumbing package does not.

---

### P1: Frontend test harness bootstrap ⭐ MVP

**User Story**: As the maintainer, I want a real frontend test setup (not just installed tooling), so form and hook logic can be tested without a browser E2E.

**Why P1**: The tooling is bought and unplugged (no `test` script, zero tests). A minimal but real harness is the entry point for all FE testing.

**Acceptance Criteria**:

1. WHEN a developer runs the new `test` / `test:coverage` npm scripts THEN vitest SHALL execute, including a **node-environment project** for hooks/forms/utils alongside the existing Storybook browser project.
2. WHEN the harness is in place THEN at least one **real assertion-style test** SHALL exist and pass (proving the setup works end-to-end), covering a `zod` schema + `toPayload` mapping for a representative form.

**Independent Test**: `cd finsight-frontend && npm run test` runs and reports at least one passing non-story test.

---

### P2: High-risk area integration + form tests

**User Story**: As the maintainer, I want the remaining high-risk seams (auth, transaction CRUD, series edit, migrations, key forms) tested, so the common paths are safe too.

**Why P2**: Important and high-risk, but the P1 critical trio is what unblocks trust; these round it out.

**Acceptance Criteria**:

1. WHEN register / login / token scoping run through the auth slice THEN the test SHALL assert JWT issuance and per-plan access enforcement.
2. WHEN a transaction is updated through the API THEN the test SHALL assert the **full-replace contract** (see `transaction-update-contract` memory) and item handling.
3. WHEN a series is generated and edited THEN the test SHALL assert installment k/N + recurring generation, all three edit scopes, and the `MAX_OCCURRENCES` / D10 guards (→ 400).
4. WHEN the app boots against a fresh empty database THEN the test SHALL assert the **full Flyway V1..V8 chain applies cleanly** and `ddl-auto=validate` passes.
5. WHEN the transaction and series **forms** are exercised THEN FE tests SHALL assert zod validation, `buildDefaultValues`, `toPayload`, and edit-mode reset.

**Independent Test**: Each area's suite runs green independently under `./mvnw verify` / `npm run test`.

---

### P3: Medium-risk coverage + Base UI interaction guard

**User Story**: As the maintainer, I want the medium-risk areas and the Base UI runtime-nesting trap covered, so the long tail and the L-002 class of bug are caught.

**Why P3**: Lower risk/frequency; valuable but not gating.

**Acceptance Criteria**:

1. WHEN a Nubank CSV with duplicate `externalId`s is imported THEN the test SHALL assert dedup (no double rows).
2. WHEN an invitation is accepted twice / after expiry / after revoke THEN the test SHALL assert idempotent accept, 410 on expiry, and revoke behavior.
3. WHEN a plan-scoped service hook mutates data THEN the FE test SHALL assert correct query keys, plan-scoped URLs, and cache invalidation.
4. WHEN a Base UI compound component renders THEN an interaction/story test SHALL assert correct parent-context nesting (guards the L-002 runtime-only failure).

**Independent Test**: Each suite runs green independently.

---

## Edge Cases

- WHEN Docker is unavailable on the runner THEN the integration suite SHALL fail with a clear "Docker required" message (not hang on a tunnel).
- WHEN tests run in parallel THEN no test SHALL depend on another's data or ordering.
- WHEN the real `dev_finsight` is reachable THEN the suite SHALL **never** connect to it — ephemeral container only (prevents the L-007 auto-apply / data-touch class of incident).
- WHEN a migration is added later THEN the "apply-clean on empty DB" test SHALL extend to it automatically (runs the whole chain, not a pinned version).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TEST-01 | P1: Harness (Testcontainers + Flyway) | Design | Pending |
| TEST-02 | P1: Harness (MockMvc + auth helper) | Design | Pending |
| TEST-03 | P1: Split SPLIT-01 invariant (integration) | Design | Pending |
| TEST-04 | P1: Dashboard partition A−B+I (integration) | Design | Pending |
| TEST-05 | P1: Plan authorization matrix (integration) | Design | Pending |
| TEST-06 | P1: JaCoCo + critical-package floor | Design | Pending |
| TEST-07 | P1: Frontend harness + first form test | Design | Pending |
| TEST-08 | P2: Auth/JWT slice | Design | Pending |
| TEST-09 | P2: Transaction CRUD full-replace + items | Design | Pending |
| TEST-10 | P2: Series generate/edit + guards | Design | Pending |
| TEST-11 | P2: Migrations apply-clean on empty DB | Design | Pending |
| TEST-12 | P2: Frontend form tests (zod/toPayload/reset) | Design | Pending |
| TEST-13 | P3: CSV import externalId dedup | - | Pending |
| TEST-14 | P3: Invitations lifecycle | - | Pending |
| TEST-15 | P3: Frontend service-hook tests | - | Pending |
| TEST-16 | P3: Base UI interaction/nesting guard | - | Pending |
| TEST-17 | P1: Update TESTING.md + CONCERNS.md (gate commands, coverage policy) | Design | Pending |

**ID format:** `TEST-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 17 total, 0 mapped to tasks (Tasks phase pending), 0 unmapped

---

## Success Criteria

- [ ] `./mvnw verify` runs the integration suite against an ephemeral Testcontainers Postgres with **no SSH tunnel and no touch of `dev_finsight`**.
- [ ] The three critical invariants (SPLIT-01, dashboard partition, authz matrix) are asserted automatically — the manual copy-DB ritual is no longer required for them.
- [ ] Coverage is reported on every run; the critical-package floor fails the build when breached.
- [ ] `npm run test` exists and runs real frontend tests (not just stories).
- [ ] TESTING.md documents the gate commands + coverage policy; CONCERNS.md's "no backend test coverage" entry is downgraded/resolved.
</content>
</invoke>
