# Handoff — Execute: Recurrence Model v2

**Date:** 2026-07-24
**Feature:** `.specs/features/recurrence-model-v2/`
**Status:** ✅ Planned & Approved — ready to Execute. **No code written yet.**
**Milestone:** M3 — Trust the Data (this feature closes M3 and resolves blocker B-001).

Say **"resume work"** in a fresh session to start Execute from T1.

---

## What this feature is

Two coupled goals, MONTHLY-only (no new intervals):
1. **Retire the vestigial `frequency` field** across the whole stack behind a Flyway `DROP COLUMN` (closes B-001). Provably no behavior change — the field is dead.
2. **Open-ended RECURRING series** (no end date): materialize occurrences up to a rolling 12-month horizon, refilled lazily on the dashboard read, tracked by the existing `RecurrenceDefinition.generatedThrough` watermark. Installments stay bounded by parcel count.

Full requirements: `spec.md` (RMV2-01..09). Architecture + locked decisions: `design.md` (D1 on-read, D2 H=12, D3 P3 in-scope). Atomic tasks: `tasks.md`.

---

## Execution order (one commit per task — user decision 2026-07-24)

**Phase 1 (parallel):** T1 (BE retire frequency + V9) · T2 (FE remove frequency) · T3 (Clock bean)
**Phase 2:** T4 (generator) → {T5 createSeries ∥ T7 topUp service+repo} → {T8 dashboard ∥ T9 editSeries}
**Phase 3:** T10 (FE form) ∥ backend · then T11 (full-stack E2E, final)

`[P]` tasks: launch one sub-agent each; each runs its own `mvn verify` (own JVM + Testcontainer → dev-parallel-safe per TESTING.md). See `tasks.md` for the full diagram + cross-check.

---

## Start-of-Execute checklist (do these FIRST — hard-won lessons)

1. **Re-verify migration numbering against reality (L-004).** `tasks.md` was written assuming V8 is highest → this feature is **V9**. Before creating `V9__drop_frequency_column.sql`, `ls finsight-backend/src/main/resources/db/migration/` and confirm V9 is still free. If another migration landed since 2026-07-24, renumber and log a `SPEC_DEVIATION` at the top of `tasks.md`.
2. **Docker env for `mvn verify` (L-008).** Export both before any `./mvnw verify`:
   ```bash
   export DOCKER_HOST=unix:///home/lcs/.docker/desktop/docker.raw.sock
   export TESTCONTAINERS_RYUK_DISABLED=true
   ```
   (The portable `docker-java.properties` api.version=1.44 fix is already committed; these two are this-machine-only.)
3. **DB reachability (L-003/L-005).** The dev DB may be local Postgres OR an SSH tunnel — check `ss -tlnp | grep 5432`. Always probe with `timeout 10 psql ... -c "SELECT 1"`; exit 124 = stale tunnel, surface it, don't silently retry.

---

## Grounding facts (re-verified 2026-07-24 — see the note block atop `tasks.md`)

- Highest migration on disk: **V8** → this feature = **V9**. Column originates in `V1__baseline.sql:60`.
- `frequency` sites (all of them): entity `FinancialTransaction.java:40,124-129`; `FinancialTransactionRequestDto.java:28,59-60`; `FinancialTransactionResponseDto.java:21,39,175-176`; `RecurringTransactionGenerator.java:51,71`; `SeriesRegenerator.java:41,122`; `FinancialTransactionService.java:168,198`; frontend `financialTransaction.ts:27`.
- `createSeries` at `FinancialTransactionService.java:332`; RECURRING-requires-endDate throw at **:348**; `editSeries` at **:494**.
- `DashboardService.getSummary` at **:40** (`readOnly=true` at :39) — the on-read hook site.
- `RecurrenceDefinitionRepository` has only `findByPlanAndSeriesId` — the locked due-query (T7) is net-new.
- **No `Clock` bean exists** — T3 creates it.
- `RecurrenceDefinition` already has `endDate` (:61 nullable) and `generatedThrough` (:68) — no schema change beyond the DROP.
- FE zod endDate-required-for-RECURRING lives in **two** spots: seriesEdit `TransactionFormDrawer.tsx:155-159`, create `:206-217`. `toPayload` already treats `endDate` as optional.

Line numbers are as of 2026-07-24 — re-grep at Execute time rather than trusting them blind.

---

## Tools / skills per task (as assigned in tasks.md)

- Service-layer tasks (T5, T7, T9): `/backend-endpoint` conventions.
- Frontend form (T10): `/form-creation`, `/component-creation`.
- E2E (T11): `/verify` + the copy-DB procedure (memory `e2e-plan-auth-trick`).
- No project MCPs beyond filesystem. No new exceptions → `/backend-exceptions` not needed (reuse existing `IllegalArgumentException` → 400 mapping).

---

## Gates & test expectations

- **Full gate** (T1, T5, T7, T8, T9): `./mvnw verify` (needs Docker env above). Baseline: 55 unit + ~59 integration, all green — watch for silent test deletions.
- **Quick gate** (T3, T4): `./mvnw test`. **Build** (T2): `npm run lint && npm run build`. **Quick FE** (T10): `npm run test`.
- Each backend Part-2 task **extends** an existing IT (`SeriesEditIT`, `DashboardPartitionIT`, `TransactionCrudIT`) or adds a focused `OpenEndedTopUpIT` — test-foundation already covers the regression surface.
- **T1 must leave existing ITs unchanged & green** — that's the proof `frequency` removal changed no behavior.

---

## Watch-outs specific to this feature

- **Dashboard write-on-GET is intentional (D1).** `getSummary` stays `readOnly=true`; the top-up runs in its own `REQUIRES_NEW` tx. Don't "fix" the readOnly by making getSummary writable.
- **Idempotency is load-bearing.** T7's IT must fire top-up twice and assert a stable row count. The pessimistic write lock on the due-query is the guard (single-instance app, cheap insurance).
- **Full-replace edit semantics (T9).** On a RECURRING edit, a null `endDate` means *open-ended*, not "leave unchanged" — symmetric with the transaction PUT contract ([[transaction-update-contract]]).
- **Bounded series need no backfill.** The top-up query targets `mode=RECURRING AND endDate IS NULL` only; every existing series has `endDate NOT NULL` and is never touched — a null `generatedThrough` on them is inert.
- **FE build-green ≠ runtime-correct (L-002).** T10 touches form/zod only (not Base UI compound context), but T11's runtime pass is still the real proof the open-ended form submits and the dashboard reflects it.
- **T11 copy-DB discipline (L-007).** Check `flyway_schema_history` on the REAL `dev_finsight` first (a concurrently-running dev instance may auto-apply V9 the moment the file exists on disk). Verify against a `dev_finsight_verify` copy; drop it after; never write the real DB.

---

## After Execute

- Update `STATE.md` Current Work + flip B-001 to FIXED; mark `ROADMAP.md` M3 "Recurrence Model v2 — SHIPPED" and M3 status → complete.
- Update `.specs/codebase/TESTING.md` if new IT classes were added.
- Append per-task commit hashes + gate results to the `tasks.md` Progress Log.
