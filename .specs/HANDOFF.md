# Handoff

**Date:** 2026-07-17
**Feature:** M3 Test Foundation — `.specs/features/test-foundation/`
**Status:** ✅ **EXECUTED & E2E-VERIFIED.** All 21 tasks (T1–T21) done.

## Completed ✓ (this session)

- **T1–T6 (backend harness)** — Testcontainers Postgres singleton, test profile, `AbstractIntegrationTest`, `TestAuthHelper`, `Fixtures`, `HarnessSmokeIT`. Commits `0b1bac3`..`596ed81` on `main`.
- **T7–T9 (critical invariants)** — `SplitInvariantIT`, `DashboardPartitionIT`, `PlanAuthorizationMatrixIT` (no authz gaps found). Commits `fa891ca`..`ff0bac1`.
- **T10** — JaCoCo branch-coverage floor (0.80) on `SplitResolver`/`CategoryBreakdownAssembler`/`PlanAuthorization`; red/green mechanism proven. Commit `8b5aa2d`.
- **T11** — Frontend `unit` vitest project (jsdom) + `CreatePlanDialog` schema test. Commit `5a62459`.
- **T12–T15 (backend P2)** — `AuthenticationIT`, `TransactionCrudIT`, `SeriesEditIT`, `MigrationsIT`. Commits `7228d88`..`48813dd`.
- **T16 (FE forms)** — `TransactionFormDrawer` schema/defaults/payload/edit-reset tests (plain + series modes; one component handles both, not two separate forms — documented deviation). Commit `19de786`.
- **T17–T18 (backend P3)** — `CsvImportIT`, `InvitationLifecycleIT` (found LINK vs EMAIL idempotency differs from the task's blanket assumption — documented, not a bug). Commits `93bc85f`, `05360ff`.
- **T19–T20 (FE P3)** — `usePlanService` hook tests (URL scoping + invalidation), Base UI interaction guard on `Dropdown.stories.tsx` (red/green-proven against the original L-002 failure). Commits `f06f8c0`, `0b9af42`.
- **T21** — `TESTING.md` rewritten, `CONCERNS.md` coverage entries downgraded from "none" to "narrow but real." No commit (`.specs/` root is unversioned).
- Both repos clean on `main`. Final verification: `./mvnw clean verify` green (55 unit + 58 integration tests); `npm run test` green (37 unit tests) + Storybook project green (42 tests, 16 files).
- ROADMAP.md + STATE.md updated: M3 schema-migrations retroactively marked shipped (landed during Shared Plans, was stale "planned"); test-foundation marked shipped; "Recurrence Model v2" split out as its own not-started forecast-track item.

## In Progress
- Nothing. Feature is done.

## Pending
- **B-001** (frequency free-text enum), **B-002** (login unknown-email → 500 not 401), **B-003** (negative transaction amount accepted) — all logged in STATE.md Active Blockers + Deferred Ideas, none fixed yet. Each is quick-mode sized if picked up next.
- Test coverage is now real but not exhaustive — see `CONCERNS.md` residual-gap notes (category CRUD, dashboard's monthly-trend/person-breakdown endpoints, most other FE feature components/hooks).

## Blockers
- None blocking. B-001/B-002/B-003 are known, logged, low-severity bugs — not blockers to other work.

## Context
- Both repos (`backend`, `frontend`) clean on `main`, no uncommitted changes.
- **This machine's Docker Desktop needs env vars for `./mvnw verify` to work**: `export DOCKER_HOST=unix:///home/lcs/.docker/desktop/docker.raw.sock` and `export TESTCONTAINERS_RYUK_DISABLED=true` — see STATE.md Lesson L-008. A real (portable) fix is already committed (`docker-java.properties`, api.version=1.44); the two env vars are this-machine-specific and not committed.

## To resume
Say "resume work" to pick the next item: B-001/B-002/B-003 quick fixes, "Recurrence Model v2", or any other Deferred Idea in STATE.md (Expense Items P2/P3, permanent plan deletion, open-ended recurrence, etc.).
