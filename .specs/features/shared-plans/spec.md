# Shared Plans Specification

## Problem Statement

finSight scopes every transaction and category to a single owning user (`user_id`, enforced in the service layer). There is no way to share finances with another person — a couple, a family, or any two people tracking money together. The user wants a **spreadsheet-style sharing model**: a shared container ("plan") that another person can be invited into, with **granular access control** so a member can add and edit their own entries but not touch everyone else's. This reverses the original single-user-only assumption and replaces the earlier "household / merge two users" framing (see AD-004) with a more flexible per-plan membership model.

## Goals

- [ ] Introduce a **Plan** as the unit that owns transactions and categories, replacing the direct `user → transaction` ownership with `plan → transaction` + a `created_by` attribution.
- [ ] Give every existing user a **personal plan** automatically and migrate their current transactions and categories into it, losing nothing.
- [ ] Let a user **create a shared plan and invite others** (by email and by link, with accept) at a chosen role.
- [ ] Enforce **two-layer access control**: a plan-level role (Owner / Editor / Contributor / Viewer) combined with **row-level ownership** — a Contributor edits only what they created; everyone sees everything.
- [ ] Let members see a plan's finances as a **combined view with an optional per-person breakdown**.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Household / merge-two-users model | Replaced by per-plan membership (AD-004); a plan generalizes it — a two-person shared plan _is_ the household |
| Private (per-row hidden) transactions inside a plan | Decided against: within a plan everyone sees everything; only **editing** is gated. Privacy is achieved by using a separate plan |
| Per-member categories inside a plan | Categories are shared at the plan level; per-member categories were considered and rejected for aggregation simplicity |
| Per-person spending limits / sub-budgets | v1 limit is a **plan-total** per category; per-person sub-limits are a future idea |
| Real-time collaboration / presence / comments | Out of scope; this is shared data, not a live-editing surface |
| Cross-plan reporting / consolidated net worth across plans | Each view is scoped to one active plan in v1 |
| DB migration tooling itself | **Hard prerequisite, tracked separately as M3.** This feature's re-scope is destructive and MUST run on Flyway/Liquibase, not `ddl-auto=update` — but adopting the tool is its own milestone, not part of this spec |

---

## Dependencies & Prerequisites

- **M3 — Schema migrations (BLOCKING).** The `user_id → plan_id` re-scope on `financial_transactions` and `financial_transaction_categories` is destructive and data-migrating. It MUST NOT ride on `ddl-auto=update`. Flyway/Liquibase must be adopted and the current schema baselined **before** any task in this feature runs. See CONCERNS.md (HIGH: no migration tool) and ROADMAP M3.

---

## User Stories

### P1: Personal plan + data migration (foundation) ⭐ MVP

**User Story**: As an existing finSight user, when the plans feature ships, I want a personal plan created for me automatically with all my current transactions and categories inside it, so that nothing I already have is lost or changed from my point of view.

**Why P1**: The re-scope is atomic — transactions and categories must belong to a plan the moment the model changes. Every user needs a landing plan or their data is orphaned. This is the foundation the rest stands on.

**Acceptance Criteria**:

1. WHEN the migration runs THEN the system SHALL create exactly one personal plan per existing user, owned by that user with role Owner.
2. WHEN the migration runs THEN every existing `financial_transaction` and `financial_transaction_category` SHALL be assigned to its owner's personal plan, and each transaction's `created_by` SHALL be set to its original `user_id`.
3. WHEN a new user registers after the feature ships THEN the system SHALL create their personal plan automatically as part of registration.
4. WHEN a user with only a personal plan uses the app THEN their experience SHALL be functionally identical to today (they see their own data, scoped to that plan) — the plan is transparent until they choose to share.
5. WHEN the migration completes THEN no transaction or category SHALL remain without a `plan_id`.

**Independent Test**: Run the migration against a snapshot with N users; verify each user has one Owner-role personal plan, every transaction/category is attached to the right plan, `created_by` matches the original owner, and the existing dashboard renders identically for a user who does nothing else.

---

### P1: Re-scope transactions & categories to the plan, with attribution ⭐ MVP

**User Story**: As a plan member, I want the transactions and categories I work with to belong to a plan rather than directly to me, and I want each transaction to record who created it, so that the same data can be shared and later attributed to a person.

**Why P1**: This is the model change every other story depends on. Ownership checks move from "belongs to this user" to "belongs to a plan the user is a member of" + role.

**Acceptance Criteria**:

1. WHEN any transaction or category is read/created/updated/deleted THEN access SHALL be scoped to a **plan the authenticated user is a member of**, replacing the current `belongsToUser` check.
2. WHEN a transaction is created THEN the system SHALL stamp `created_by` with the acting member and `plan_id` with the active plan.
3. WHEN a user who is not a member of a plan requests that plan's data THEN the system SHALL deny access (not found / forbidden), never leaking cross-plan data.
4. WHEN existing aggregation queries (totals, category breakdown, monthly trend, external-id dedup) run THEN they SHALL be filtered by `plan_id` instead of `user_id`, preserving current results for a single-member personal plan.

**Independent Test**: For a two-member plan, confirm both members' reads return the same plan-scoped set; confirm a non-member gets denied; confirm dashboard aggregates over the plan, not the individual.

---

### P1: Create a shared plan and invite a member ⭐ MVP

**User Story**: As a user, I want to create a new shared plan and invite another person by email or by a shareable link at a specific role, so that we can track finances together.

**Why P1**: Sharing is the point of the feature. Without invite + join there is no second person.

**Acceptance Criteria**:

1. WHEN a user creates a plan THEN they SHALL become its Owner and the plan SHALL start empty (its own transactions/categories, independent of the creator's personal plan).
2. WHEN the Owner invites someone by **email** at a chosen role THEN an invitation SHALL be recorded, and the invitee SHALL join that plan at that role only after **accepting** (they register first if they have no account).
3. WHEN the Owner generates an **invite link** with a chosen role THEN anyone who opens the link and accepts (authenticated) SHALL join the plan at that role.
4. WHEN an invitation is accepted THEN a membership SHALL be created linking the user to the plan with the assigned role, and the invitation SHALL be marked used.
5. WHEN a person is already a member of the plan THEN re-inviting or re-using a link SHALL NOT create a duplicate membership.

**Independent Test**: User A creates "Casa", invites B by email as Contributor; B accepts and appears as a Contributor member; A generates a Viewer link, C opens and accepts, appears as Viewer. No duplicates on re-accept.

---

### P1: Two-layer access control enforced ⭐ MVP

**User Story**: As a plan member, I want my ability to change things to depend on both my role in the plan and whether I created the entry, so that a Contributor can manage their own entries without touching everyone else's, and a Viewer can only look.

**Why P1**: This is the "controle de acesso um pouco melhor" the user explicitly asked for. It is what distinguishes this from a blunt all-or-nothing share.

**Access matrix** (Layer 1 = plan role, Layer 2 = row ownership via `created_by`):

| Action | Owner | Editor | Contributor | Viewer |
| ------ | :---: | :----: | :---------: | :----: |
| View all plan transactions/categories | ✅ | ✅ | ✅ | ✅ |
| Create a transaction | ✅ | ✅ | ✅ | ❌ |
| Edit/delete a transaction **they created** | ✅ | ✅ | ✅ | ❌ |
| Edit/delete a transaction **another member created** | ✅ | ✅ | ❌ | ❌ |
| Manage categories & spending limits | ✅ | ❌ | ❌ | ❌ |
| Invite/remove members, change roles | ✅ | ❌ | ❌ | ❌ |
| Rename/delete the plan | ✅ | ❌ | ❌ | ❌ |

**Acceptance Criteria**:

1. WHEN a Viewer attempts any create/update/delete THEN the system SHALL deny it (forbidden).
2. WHEN a Contributor attempts to edit or delete a transaction they did not create THEN the system SHALL deny it, while allowing the same operation on their own transactions.
3. WHEN an Editor or Owner edits or deletes any transaction in the plan (regardless of creator) THEN the system SHALL allow it.
4. WHEN any non-Owner attempts to manage categories/limits, manage members, or rename/delete the plan THEN the system SHALL deny it.
5. WHEN authorization is decided THEN it SHALL be enforced server-side (not only hidden in the UI).

**Independent Test**: With one member per role, exercise every cell of the matrix and confirm allow/deny matches the table, verified against the API directly (not just the UI).

---

### P1: Active plan context ⭐ MVP

**User Story**: As a member of more than one plan, I want to select which plan I'm currently looking at, so that transactions, categories, and the dashboard all reflect that plan.

**Why P1**: Once a user has a personal plan plus at least one shared plan, every scoped view needs to know which plan is active. Without it the re-scoped data has no selector.

**Acceptance Criteria**:

1. WHEN a user has multiple plans THEN the interface SHALL let them choose an active plan, and SHALL default to a sensible one (e.g. their personal plan) on login.
2. WHEN a plan is active THEN transaction lists, category management, imports, and the dashboard SHALL all operate on that plan.
3. WHEN a request acts on plan-scoped data THEN the active plan SHALL be conveyed to the API so the server scopes and authorizes against it.
4. WHEN a user switches the active plan THEN the visible data SHALL update to that plan without leaking the previous plan's data.

**Independent Test**: A user in two plans switches between them; the transaction list and dashboard swap accordingly, and API calls are scoped/authorized to the selected plan.

---

### P2: Shared categories & plan-total spending limits

**User Story**: As an Owner, I want the plan to have a shared set of categories with a plan-total spending limit each, so that everyone classifies against the same categories and the limit reflects the whole plan's spending.

**Why P2**: The re-scope (P1) already moves categories onto the plan; this story is the richer management + limit semantics on top. The plan is usable before it, using the migrated categories.

**Acceptance Criteria**:

1. WHEN a member views categories in a plan THEN they SHALL see one shared set belonging to the plan.
2. WHEN the Owner sets a category's spending limit THEN the limit SHALL be evaluated against the **sum of all members'** transactions in that category within the plan (plan-total).
3. WHEN a non-Owner attempts to create/edit/delete a category or its limit THEN the system SHALL deny it (per the access matrix).
4. WHEN the category breakdown / limit comparison is shown THEN it SHALL aggregate across all members of the plan.

**Independent Test**: In a two-member plan, both add spend in "Groceries"; confirm the limit compares against the combined total and that only the Owner can edit the category/limit.

---

### P2: Combined dashboard with per-person breakdown

**User Story**: As a plan member, I want the dashboard to show the plan's combined totals and let me break spending down per person, so that we see both the shared picture and who spent what.

**Why P2**: Attribution (`created_by`, P1) makes this possible; it's high-value but not required to demonstrate sharing.

**Acceptance Criteria**:

1. WHEN the dashboard is viewed for a plan THEN it SHALL show combined totals (income/expense/net) across all members.
2. WHEN the user requests a per-person view THEN the system SHALL break totals and/or category spend down by `created_by` member.
3. WHEN a transaction was created by a member who has since been removed THEN their attribution SHALL still be represented (not dropped or mis-attributed).

**Independent Test**: In a two-member plan with spend from both, confirm the combined total equals the sum and the per-person split matches each member's `created_by` transactions.

---

### P2: Manage members

**User Story**: As an Owner, I want to change a member's role or remove them, so that I can adjust who can do what over time.

**Why P2**: Plans work with the roles set at invite; adjusting them afterward is important but not part of the first demonstrable slice.

**Acceptance Criteria**:

1. WHEN the Owner changes a member's role THEN subsequent actions by that member SHALL be authorized at the new role.
2. WHEN the Owner removes a member THEN that member SHALL lose access to the plan, while the transactions they created SHALL remain in the plan with their attribution intact.
3. WHEN a non-Owner attempts to change roles or remove members THEN the system SHALL deny it.

**Independent Test**: Owner promotes a Contributor to Editor (they can now edit others' rows), then removes them (they lose access; their past rows remain attributed).

---

### P3: Plan lifecycle — rename, leave, transfer ownership, delete

**User Story**: As a plan Owner or member, I want to rename or delete a plan, leave a plan I'm in, or transfer ownership, so that plans can be maintained over their lifetime.

**Why P3**: Housekeeping. The core value (share + controlled access) is demonstrable without it.

**Acceptance Criteria**:

1. WHEN the Owner renames the plan THEN the new name SHALL be reflected everywhere.
2. WHEN a non-Owner member leaves a plan THEN their membership SHALL end while their created transactions remain in the plan.
3. WHEN the Owner transfers ownership to another member THEN that member SHALL become Owner and the previous Owner SHALL drop to a chosen role.
4. WHEN the Owner deletes a plan THEN its transactions/categories/memberships SHALL be removed; a user SHALL always retain at least one plan they belong to (they cannot delete or leave their **last remaining** plan).

---

## Edge Cases

- WHEN an invite email targets a person with no finSight account THEN the flow SHALL let them register and then land on acceptance (invite survives until accepted or revoked).
- WHEN an invite link is opened by someone already a member THEN the system SHALL no-op (no duplicate membership) and inform them.
- WHEN the last/only Owner tries to leave a shared plan without transferring ownership THEN the system SHALL block it (a shared plan must always have an Owner).
- WHEN a member is removed or leaves THEN their historical transactions SHALL stay attributed to them for the per-person breakdown, even though they can no longer access the plan.
- WHEN a request omits or forges an active plan the user is not a member of THEN the server SHALL reject it based on membership, never trusting a client-supplied plan id blindly.
- WHEN the CSV import (`externalId` dedup) runs inside a plan THEN dedup SHALL be scoped to that plan, so the same statement imported into two different plans does not cross-deduplicate.
- WHEN a user tries to delete or leave their **last remaining** plan THEN the system SHALL block it, so every user always lands somewhere. (The auto-created default plan is otherwise a normal, shareable plan with no special restriction.)
- All authorization SHALL be enforced server-side; hiding a control in the UI SHALL never be the only guard.

---

## Requirement Traceability

| Requirement ID | Story | Tasks | Status |
| -------------- | ----- | ----- | ------ |
| PLAN-01 | P1: Personal plan + data migration | T1–T3, T12, T14 | ✅ Verified (backend) |
| PLAN-02 | P1: Re-scope transactions & categories to plan + `created_by` | T14–T16, T19–T24 | ✅ Verified (backend) |
| PLAN-03 | P1: Create shared plan | T5, T8, T11, T13 | ✅ Verified (backend); FE pending |
| PLAN-04 | P1: Invite (email + link) + accept | T7, T25, T26, T32 | ✅ Verified (backend); FE (T32) pending |
| PLAN-05 | P1: Two-layer access control (role × row-ownership) | T4, T6, T17, T18, T20, T21 | ✅ Verified (backend E2E, all matrix cells) |
| PLAN-06 | P1: Active plan context / switching | T13, T17, T24, T29, T30 | Backend done; FE (T29,T30) pending |
| PLAN-07 | P2: Shared categories + plan-total spending limit | T21, T24 (plan-total done); T34, T35 (evaluation) | Verified |
| PLAN-08 | P2: Combined dashboard + per-person breakdown | T24 (`createdBy`); T36, T37 | Verified |
| PLAN-09 | P2: Manage members (change role, remove) | T38, T39, T40, T41 (guards ready in T11) | Verified |
| PLAN-10 | P3: Plan lifecycle (rename/leave/transfer/**soft-delete**) | T42 (soft-delete foundation), T43, T44, T45, T46, T47 (guards in T11) | Verified |
| PLAN-11 | P3: Invite link management (revoke/expiry) | T48, T49, T50, T51 (`revoke` service already exists) | Verified |

**ID format:** `PLAN-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total. P1 (PLAN-01..06) fully mapped to T1–T33 (done & verified). **P2/P3 (PLAN-07..11) now atomized to T34–T52** (planned 2026-07-12; not yet executed) — see tasks.md "Part 2".

---

## Success Criteria

- [ ] Every existing user keeps 100% of their data inside an auto-created personal plan, with an unchanged single-user experience.
- [ ] A user can create a shared plan, invite a second person by email and by link, and that person joins at the assigned role.
- [ ] The full access matrix holds **server-side**: a Contributor edits only their own rows, a Viewer edits nothing, only the Owner manages members/categories/plan.
- [ ] The dashboard for a plan shows combined totals and a correct per-person breakdown by `created_by`.
- [ ] No cross-plan data leak in any scoped read.

---

## Open Gray Areas (to confirm at Specify → Design checkpoint)

Model decisions already made with the user are captured in `context.md`. Remaining items to lock in Design:

1. **Active-plan transport** — how the client conveys the active plan to the API (explicit `planId` per plan-scoped request/path segment vs. a server-side "current plan" on the session/JWT). Recommendation: explicit `planId` in the request, authorized against membership; keeps it stateless like the current JWT model.
2. ~~**Invite acceptance & link mechanics**~~ — ✅ **Resolved.** EMAIL = single-use token bound to email+role (flips ACCEPTED on accept); LINK = reusable-until-revoked, fixed role, **optional** `expiresAt`. Revoke + expiry are the PLAN-11 slice (T48–T51); the model (one `PlanInvitation` entity, `type=EMAIL|LINK`) is already implemented. Tokens are `UUID.randomUUID()`.
3. **Frontend active-plan UX** — global plan switcher (top-level) vs. per-page selector; where the default lands on login. UX detail for Design.

**Resolved since first draft:** the auto-created plan is a normal, **shareable** plan (not a private/immutable "personal" space) — the only guard is that a user can't delete/leave their last remaining plan. Sequencing: **Shared Plans goes before** the per-transaction items feature (user needs multi-person expense entry now).
