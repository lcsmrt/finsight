# Execute Handoff — Series Edit (P1 + P2)

**Date:** 2026-07-16
**Planned by:** prior session (Specify → Design → Tasks all done & user-approved).
**To start:** open a fresh session and say **"resume work"** (or "execute series-edit"). This session planned; it did **not** implement (per workflow `execution-in-separate-chat`).

## What this is
Add the ability to **edit a recurring/installment series** with the three-way scope **This one / This and following / All**, backed by a new first-class `RecurrenceDefinition` entity. Full context:
- Spec: `.specs/features/series-edit/spec.md` (12 reqs SEDIT-01..12; P1 = attribute edits across all scopes, P2 = range resize)
- Design: `.specs/features/series-edit/design.md` (entity + V8 migration + `SeriesRegenerator` + endpoints + FE dialog/drawer)
- Tasks: `.specs/features/series-edit/tasks.md` (**T1–T13**, with execution diagram + validation tables)
- Research/architecture (LOCKED): `.specs/features/series-edit/research.md` (D1–D6) + spec D7–D10.

## Locked decisions (do not reopen without the user)
- **D7** all three scopes ship (English labels: This one / This and following / All).
- **D8** installment k/N is **position-anchored** (`firstParcel + index`), never parsed from description strings.
- **D9** bulk edits **clobber** prior single-occurrence edits (no override tracking in v1).
- **D10** changing an installment's **total parcel count** is allowed only at **"All"** scope (no mixed `4/12`+`5/18`).
- **English-only** everywhere (memory `english-only`).

## Execution order
Follow the phases in `tasks.md`:
1. **Pre-flight (before T1):** re-verify next Flyway number is **V8** (highest is currently V7); confirm `ddl-auto=validate`. Log any drift as `SPEC_DEVIATION` at the top of tasks.md (L-004).
2. Phase 1 (T1→T2, T1→T3) → Phase 2 (T4, T5 → T6 → T7) → Phase 3 (T8 → T9/T10 → T11) → Phase 4 (T12, T13).
3. Delegate implementation tasks to sub-agents; keep the pure `SeriesRegenerator` (T4) genuinely dependency-free so `./mvnw test -Dtest=SeriesRegeneratorTest` runs without a DB.

## Gates
- Backend: `cd finsight-backend && ./mvnw -q compile` (T4 also `./mvnw -q test -Dtest=SeriesRegeneratorTest`).
- Frontend: `cd finsight-frontend && npm run lint && npm run build` (keep added-lint count 0).
- DB-dependent verification is **only** T12 (integrity gate) + T13 (E2E), each against a throwaway `dev_finsight_verify` (copy of `dev_finsight`, **dropped after** — never write the real DB).

## Skills per task (user-approved)
`api-integration` (T8) · `component-creation` (T9, T11) · `form-creation`+`component-creation` (T10) · `verify` (T12, T13). Backend tasks: none.

## Watch-outs (from Lessons Learned)
- **L-005 / L-003:** the DB is reached via an SSH tunnel that can go half-dead; wrap probes in `timeout 10-15`, treat exit 124 as stale, and surface it rather than silently retrying. Check `ss -tlnp | grep 5432` for the tunnel.
- **L-006:** for the throwaway backend on `:3099`, export `ALLOWED_ORIGINS` including the exact FE origin used, or requests fail as a generic toast.
- **L-002:** FE build-green ≠ runtime-correct for Base UI compound components — mirror an existing dialog's `.stories.tsx` nesting for `SeriesScopeDialog`; a real click-through is needed (T13 or a human pass).
- **L-001:** don't mark T2 "done/verified" on compile alone — the migration is only proven once T12's boot-`validate` + zero-drift assertions pass.
- **Nulling bug:** T6's THIS_ONE must preserve `frequency`/`parcelsNumber` (today the single-row UI edit nulls them) — verify explicitly in T13.

## Definition of done for the pass
All of T1–T13 complete; SEDIT-01..12 → Verified; both repos' working trees clean; STATE.md + this feature's tasks.md Progress Log updated with commit hashes and T12/T13 results.
