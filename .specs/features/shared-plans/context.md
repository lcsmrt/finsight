# Shared Plans — Decision Context

Captures the user decisions made during the Specify/Discuss checkpoint (2026-07-11). These resolve the model's gray areas and feed Design. Source: interactive Q&A with the user.

## The chosen model: spreadsheet-style shared container

Rejected the roadmap's original **household / merge-two-users** framing. Instead, a **Plan** is a shareable container (like sharing a spreadsheet). A user can belong to many plans; each plan owns its own transactions and categories. See AD-004.

- **Why:** The household model forces one shared scope with no private space, no read-only, and no way to share just a slice. The container model subsumes it — a two-person shared plan _is_ a household — while adding privacy (separate plans), read-only (Viewer role), and per-plan granularity.

## Access control — two layers

**Layer 1 — plan role** (chosen: all four):

| Role | Scope |
| ---- | ----- |
| **Owner** (Dono) | Full control: edits anything, manages members/roles and plan config. Plan creator is Owner. |
| **Editor** | Edits any transaction in the plan (including others'), but does not manage members or categories. |
| **Contributor** (Colaborador) | Adds transactions and edits only their **own**; sees others' but cannot change them. |
| **Viewer** (Leitor) | Read-only. |

**Layer 2 — row ownership** (`created_by`): even inside a plan, edit/delete of a transaction is gated by who created it — this is what makes the Contributor role meaningful. Editor/Owner bypass the row-ownership gate.

## Decided gray areas

| Question | Decision | Note |
| -------- | -------- | ---- |
| What can a member **see** of others' transactions? | **Everyone sees everything**; only editing is gated by row ownership. | Rejected private/hidden rows — privacy = use a separate plan. Simpler aggregation. |
| Who can **manage** the plan (invite/remove members, roles, categories, limits)? | **Owner only.** | Editors edit transactions but not plan config. |
| Dashboard view for a shared plan? | **Combined + per-person breakdown.** | Requires firm `created_by` attribution on every transaction. |
| How do **categories** work in a plan? | **Shared at the plan level** — one set for the whole plan. | Rejected per-member categories. |
| How is the **spending limit** measured? | **Plan-total** per category (sum of all members). | Per-person sub-limits deferred to future. |
| How does someone **join** a plan? | **Both email invite and invite link**, with an accept step. | Email = targeted; link = share without knowing the email. |
| The **personal plan** & migrating existing data? | **Auto-created default plan per user; existing transactions + categories migrate into it.** Nothing is lost; everything becomes a plan. | The default plan is a **normal, shareable plan** — no special "private" restriction (user decided 2026-07-11). Only guard: a user can't delete/leave their **last** plan. |

## Hard prerequisite

**M3 schema migrations (Flyway/Liquibase) must land first.** The `user_id → plan_id` re-scope on `financial_transactions` and `financial_transaction_categories` is destructive and data-migrating; it cannot run on the current `ddl-auto=update`. This is a blocking dependency, not part of this feature's own tasks. (CONCERNS.md HIGH; ROADMAP M3.)

## New entities (sketch — refined in Design)

- **Plan**: `id`, `name`, `created_by`, `is_default` (marks the auto-created landing plan — does **not** restrict sharing; only used for the login default and the "always ≥1 plan" guard).
- **PlanMembership**: `plan_id`, `user_id`, `role` (OWNER | EDITOR | CONTRIBUTOR | VIEWER).
- **PlanInvitation**: `plan_id`, `role`, `email?` (for email invites), `token`, `status` (PENDING | ACCEPTED | REVOKED), optional expiry — covers both email and link flows.
- **FinancialTransaction**: `user_id` → `plan_id`, plus `created_by` (attribution).
- **FinancialTransactionCategory**: `user_id` → `plan_id`.

## Sequencing decision (vs. the "items" feature)

**Decided (2026-07-11): Shared Plans goes FIRST; the per-transaction items feature is deferred.** The user is actively organizing expenses now and needs to enter transactions from more than one person, so sharing is the immediate need. The two changes are technically independent (items would be an additive child of `FinancialTransaction`, inheriting the parent's plan/creator), so no dependency is created by doing sharing first.

**Consequence:** the **M3 migration foundation (Flyway/Liquibase) must be tackled as the first step of this track** — the `user_id → plan_id` re-scope is destructive and can't run on `ddl-auto=update`. So even though Shared Plans is "first" by the user's priority, its Design/Tasks begin with adopting migrations + baselining the current schema before the re-scope.
