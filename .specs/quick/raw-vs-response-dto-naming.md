# DTO naming + the anti-corruption layer question

## Status: DECIDED (naming) + DEFERRED (architecture)

Resolved on 2026-07-18.

## Decision (naming/location) — settled, do not relitigate

- **Keep the `XxxResponse` suffix** for API response types. It's an established, self-documenting
  pattern already used across the whole codebase; consistency wins.
- **Keep all API-related types in `src/api/dtos/`** (alongside `CreateXxxRequest`/`UpdateXxxRequest`).
- **Exportability is not a concern right now.** Whether a response type is exported from `dtos/`
  or kept local is not something to police at this stage.

Consequence: two renames applied during the earlier audit were **reverted** back to the
consistent pattern:
- `DashboardSummary` → back to `DashboardSummaryResponse`
- `RecurrenceDefinition` → back to `RecurrenceDefinitionResponse`

(The separate `useFinancialTransactionSeries` → `useGetFinancialTransactionSeries` hook rename was
kept — it was an unrelated, confirmed fix for a missing `Get` prefix, not part of this decision.)

## What "leaking" meant (context, so this isn't rediscovered later)

The `src/api/services/` layer is meant to be the single checkpoint that talks to the API. A "leak"
is when a type that mirrors the raw HTTP payload is imported and used directly inside
`features/`/`components/`, coupling the UI to the backend's wire shape. If the backend changes a
field, a leaked shape forces edits across many UI files instead of one service-layer mapping.

This is the same idea as the **adapter / anti-corruption layer** used in the owner's offline-first
mobile apps (`API → adapter → Realm`, and the reverse for requests). Difference: Realm's schema is a
*hard* structural wall that forces the adapter to run; a web SPA has no equivalent, so the boundary
is only a *soft* convention about which type you import — which is why leaks are even possible here.

finsight already has adapters in both directions where shapes genuinely diverge:
- inbound: `mapPlan()` in `usePlanService.ts` (Jackson serializes `isDefault()` as `"default"`)
- outbound: `toPayload` / `toSeriesEditPayload` / `attributionToPayload` in `TransactionFormDrawer.tsx`

## Deferred (architecture) — a separate, planned effort

If an anti-corruption layer is introduced, it will be a **general, structural** change applied
across the codebase — **not** an incremental, per-endpoint retrofit. A half-applied ACL in one or
two spots is worse than none (inconsistent, and it hides the coupling behind a clean-looking name
without actually removing it).

So: do **not** start mapping individual response types into domain types opportunistically. Treat
the ACL as its own planned initiative with a consistent rule (e.g. where the wire shape diverges
from the UI's needs, a mapping seam lives in the service layer), decided and rolled out deliberately.

Until then, the status quo stands: `XxxResponse` types in `dtos/`, used where convenient, suffix intact.
