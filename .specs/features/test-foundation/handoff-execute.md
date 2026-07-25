# Execute Handoff — Test Foundation

**Date:** 2026-07-17
**Feature:** `.specs/features/test-foundation/` (spec.md + design.md + tasks.md)
**Status:** Planned & approved. Ready to Execute in a fresh session. Say **"resume work"**.

## What this is
M3's test-foundation: a real backend integration harness (Testcontainers Postgres + MockMvc + real JWT), the critical-invariant tests that retire the manual copy-DB ritual, coverage measurement (JaCoCo + vitest), and an FE test harness. 21 tasks, T1–T21.

## Execution order
- **Phase 1 (sequential):** T1→T2→T3→T4→T5→T6 — build the harness, prove it with the smoke IT (T6). **Do not start Phase 2 until T6 is green.**
- **Phase 2 [P]:** T7, T8, T9 — critical invariants (split, dashboard, authz).
- **Phase 3:** T10 (JaCoCo floor, needs T7–T9) + T11 [P] (FE harness, independent).
- **Phase 4 [P]:** T12–T15 (backend, need T6) + T16 (needs T11).
- **Phase 5 [P]:** T17, T18 (need T6) + T19, T20 (need T11).
- **Phase 6:** T21 (docs, last).

## Prerequisites (verify FIRST)
1. **Docker must be running** — Testcontainers needs it. `docker info` should succeed. If absent, T6+ cannot run; stop and tell the user.
2. **No dev tunnel / real DB needed** — by design the suite uses an ephemeral container. Do **not** point tests at `dev_finsight`.
3. **Re-check migration numbering** (Lesson L-004): the B-001 cleanup adds `V9`. If B-001 hasn't shipped yet, TEST-11 still just runs "the whole chain" — no pinning. Confirm the highest `V` on disk before assuming.
4. **jacoco-maven-plugin version** (T1): pin the current stable via context7 — do NOT guess a version.

## Locked decisions (do not relitigate)
- Testcontainers (not H2); singleton container + `@ServiceConnection`. (design TD-1/TD-2)
- Real commits + `truncateAll` between tests, NOT `@Transactional` rollback. (TD-3 — this is deliberate; it catches flush-order bugs like L-007)
- `*Test` = surefire/`mvn test`; `*IT` = failsafe/`mvn verify`. (TD-4)
- Coverage floor scoped to `SplitResolver`, `CategoryBreakdownAssembler`, `PlanAuthorization` only; global reported not gated. (TD-5)
- Real JWT (no `@WithMockUser`) for the authz matrix test T9. (TD-6)

## Gate commands
- Backend: `cd finsight-backend && ./mvnw verify`
- Frontend: `cd finsight-frontend && npm run test`

## Sibling M3 item (separate, not in this feature)
- **B-001 cleanup** — remove the write-only dead `frequency` field (audit confirmed nothing reads it): migration V9 dropping the column + strip field from `FinancialTransaction`, request/response DTOs, FE DTO type, and the 3 `setFrequency` calls; retire 4 stale test assertions. Quick-mode sized. Can be done before or after this feature; if before, it becomes the V9 that TEST-11 protects.

## After Execute
Update ROADMAP.md + STATE.md (deferred per user's request to batch it post-execution): M3 migrations ✅ done, test-foundation status, "Recurrence Model v2" split out as a forecast-track feature, B-001 outcome.
```
</content>
