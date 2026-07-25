# Handoff — Execute: Transaction Line Items ("Expense Items")

**Date:** 2026-07-15
**Feature:** `.specs/features/expense-items/`
**Status:** **Planning complete (spec + design + tasks approved). Not started. Execute in a fresh session.**
**Planner did NOT implement** — per the SDD split (planner hands off, a fresh executor picks this up).

## What this is

Line-item detail per `FinancialTransaction`: a transaction can be broken into 0..N **items**, each with its own
description, amount, and (optional) **category**. The payoff is the **dashboard category breakdown** becoming
item-aware — answering "cleaning vs. food inside one grocery run". Applies to **both** DEBIT and CREDIT.

Read in order: `spec.md` → `design.md` → `tasks.md`. This file is the executor's entry point.

## The one idea to internalize first

**The Partition Invariant.** A transaction's `amount` is sliced across category buckets exactly once:
`amount = Σ(categorized items, by item category) + Σ(uncategorized items → parent cat) + remainder(→ parent cat)`.
Because `Σitems ≤ amount` is enforced, the parent "remainder" bucket is always ≥ 0. **Top-line totals
(income/expense/net) never change** — they don't read categories at all. Only the *distribution across
categories* gets finer.

The breakdown math is `spent[C] = A[C] − B[C] + I[C]` where A = `SUM(ft.amount)` by parent cat (today's query),
B = categorized-item sums by *parent* cat, I = categorized-item sums by *item* cat. Worked example
(grocery 150, food 90 / cleaning 40): Groceries `150−130+0 = 20`, Food `90`, Cleaning `40`. See design.md §"The
item-aware category breakdown" for the full derivation — **this is the only non-obvious logic in the feature.**

## Scope for THIS execution pass

**P1 only — T1 through T10** (the complete vertical slice: persist items → dashboard reflects them → form to
enter them). Verify with a P1-scoped run of T14, then **stop and hand back**.

**P2 (T11 quantity, T12 table indicator) and P3 (T13 series items) are deferred to a follow-up pass** — each is
an independent, individually-shippable slice. Recommended boundary, matching how Splitting was sequenced. (If
the executor is told otherwise, T11–T13 slot in cleanly before the full T14.)

## Execution order (P1)

```
T1 → T2                     (migration V7, entity + boot-verify)
T2 → {T3, T4, T6, T7}       (DTOs, A/B/I queries, PURE assembler + unit tests)
{T2,T3} → T5 ; {T6,T7} → T8 (applyItems ; wire item-aware breakdown)
T4 → T9 → T10               (FE types/payload → items form section)
{T5,T8,T10} → T14           (full-stack E2E, P1 scope)
```

## Critical notes for the executor

1. **RE-VERIFY THE MIGRATION NUMBER FIRST** (STATE L-004). Design assumes `V7`. Before T1,
   `ls finsight-backend/src/main/resources/db/migration/` — if anything landed since planning, renumber to the
   next free version and add a `SPEC_DEVIATION` note at the top of tasks.md. (Both repos were unpushed/local at
   planning time with a stack of commits on `main`; `main` may have moved.)
2. **T7 is the crown jewel** — the `CategoryBreakdownAssembler` is **pure** and **must** ship with unit tests
   (the grocery-150 example is a required test case). It's the one place a silent mis-attribution bug could hide.
   Everything else DB/HTTP-bound is compile-gated + proven in T14, per the Splitting precedent.
3. **`quantity` column ships in V7 (T1) but is only wired into DTOs/form in P2 (T11).** In the entity (T2),
   **initialize `quantity = 1`** so Hibernate doesn't emit a NULL into the NOT-NULL column on insert.
4. **No new authz gate.** Items are *what*, not *who owes* — reuse `requireCanCreate/ModifyTransaction`
   unchanged. (Contrast with Splitting, which needed `requireCanAttributeToOthers`.)
5. **Update semantics = full-replace** (clear + add via orphanRemoval), not reconcile-by-key — items have no
   business key. Consistent with the PUT full-replace contract (STATE `transaction-update-contract`).
6. **Inline-edit edge**: lowering a transaction's amount below its current `Σitems` must 400. The inline update
   already sends the full body; ensure items ride along and are validated by `applyItems`.
7. **Design decision — no "Uncategorized" bucket in v1** (approved). A category-less transaction's remainder
   stays out of the breakdown (as today); a *categorized item* on it still surfaces under its item category.
8. **Totals must be untouched** — T8 rewrites only `buildCategoryBreakdown`; do NOT touch
   `sumByPlanAndTypeAndDateRange`, monthly trend, or person breakdown. T14 asserts the expense total is unchanged.

## Gates & environment

- Backend compile: `cd finsight-backend && ./mvnw -q -DskipTests package`
- Backend unit (T7): `./mvnw test -Dtest=CategoryBreakdownAssemblerTest`
- Frontend: `cd finsight-frontend && npm run lint && npm run build` (respect the pre-existing lint baseline)
- Boot/migration verify (T2): boot with `SERVER_PORT=3099` against a **copy** of the dev DB; Flyway applies V7,
  Hibernate `validate` passes. If boot fails "Connection refused", check for the SSH tunnel first
  (`ss -tlnp | grep 5432`) before assuming the DB is down (STATE L-003).
- Tools: MCP NONE throughout; FE skills `api-integration` (T9), `form-creation`/`component-creation` (T10).

## Definition of done (this pass)

All P1 ACs (ITEM-01..11) green in T14: itemize → GET returns items → dashboard splits by item category with the
remainder on the parent and the **expense total unchanged** → overflow/validation/category-type/inline-edit
guards return 400 → non-itemized transactions unchanged. Throwaway data cleaned; real dev data re-verified at
baseline. Flag the FE form for a human visual pass (L-002 — build-green ≠ runtime-correct for Base UI).

## To resume

Say **"resume work"** in a fresh session → it reads STATE.md + this handoff. Start at Critical Note #1
(re-verify the migration number), then T1.
