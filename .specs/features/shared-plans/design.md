# Shared Plans Design

**Spec**: `.specs/features/shared-plans/spec.md`
**Context**: `.specs/features/shared-plans/context.md`
**Status**: Draft

---

## Architecture Overview

Three moving parts, in dependency order:

1. **Migration foundation (M3, prerequisite)** — adopt Flyway, baseline the current schema, then re-scope ownership from `user_id` to `plan_id` + `created_by` via a reviewed, data-preserving migration. Nothing else can safely touch the schema until this lands.
2. **Plan domain** — new `Plan`, `PlanMembership`, `PlanInvitation` entities with a `PlanService`, repositories, controller, and invitation flow.
3. **Authorization re-scope** — replace the current per-user ownership (`belongsToUser` spec + manual `getUser().getId()` checks) with a **two-layer** model: plan membership/role (Layer 1) × row ownership via `created_by` (Layer 2). The active plan is carried per-request as a **`{planId}` path variable** (`/plans/{planId}/...`), resolved to a `PlanContext` the same clean way controllers use `@AuthenticationPrincipal` today.

```mermaid
graph TD
    subgraph Client
      SW[Plan switcher] --> AX[axios finsightApi]
      AX -->|/plans/{id}/... + Bearer JWT| API
    end

    subgraph Backend
      API[Controllers] --> RES[PlanContextArgumentResolver<br/>reads {planId} path var]
      RES -->|verify membership| MEMREPO[(plan_memberships)]
      RES -->|PlanContext plan+role| SVC[Services]
      SVC --> AUTHZ[PlanAuthorization<br/>role x row-ownership]
      SVC --> TXREPO[(financial_transactions<br/>plan_id + created_by)]
      SVC --> CATREPO[(financial_transaction_categories<br/>plan_id)]
      PLANSVC[PlanService / InvitationService] --> PLANREPO[(plans / invitations)]
    end
```

> **Transport decision (confirmed 2026-07-12): path variable `/plans/{planId}/...`**, not a header. Chosen for explicitness and self-documentation — the plan is part of the resource URL, so scoping can never be silently forgotten (no cross-plan leak) and it follows the mainstream resource-hierarchy REST style (e.g. GitHub `/repos/{owner}/{repo}/...`). Costs rewriting the existing flat routes, which is cheap while the codebase is small.

> Diagrams here are inline mermaid. The `mermaid-studio` skill (if installed) would render these to SVG/PNG — recommended but not required.

---

## Migration Foundation (the mandatory first step)

**This subsection is the prerequisite; its tasks run before any plan code is wired.**

### Adopt Flyway

- Add to `finsight-backend/pom.xml`: `org.flywaydb:flyway-core` and `org.flywaydb:flyway-database-postgresql` (Spring Boot 3.5 manages the version via its BOM — do not pin manually; confirm the managed version at implementation time).
- `application.properties`: set `spring.flyway.enabled=true`, `spring.flyway.baseline-on-migrate=true`, `spring.flyway.baseline-version=1`, and change `spring.jpa.hibernate.ddl-auto=update` → `validate`. From here Hibernate only *checks* the schema; Flyway *owns* it.
- Migrations live in `src/main/resources/db/migration/`.

### The migration scripts

| Script | Purpose |
| ------ | ------- |
| `V1__baseline.sql` | The **current** schema exactly as `ddl-auto=update` produced it (users, financial_transactions, financial_transaction_categories, all current columns/indexes/FKs). ⚠️ **Must be generated from the real schema** (`pg_dump --schema-only` of the current dev DB, or Hibernate's `javax.persistence.schema-generation` export) — NOT hand-written from memory, so `validate` passes against existing data. |
| `V2__create_plan_tables.sql` | `plans`, `plan_memberships`, `plan_invitations` + indexes/constraints. |
| `V3__rescope_ownership_to_plan.sql` | The data-preserving re-scope (below). |

### V3 — the data-preserving re-scope (sketch, to finalize against real DDL)

```sql
-- 1. one default plan per existing user
INSERT INTO plans (name, created_by, is_default)
  SELECT 'Meu plano', u.id, true FROM users u;

-- 2. owner membership for each user's default plan
INSERT INTO plan_memberships (plan_id, user_id, role)
  SELECT p.id, p.created_by, 'OWNER' FROM plans p WHERE p.is_default = true;

-- 3. transactions: add plan_id + created_by, backfill, then constrain
ALTER TABLE financial_transactions ADD COLUMN plan_id BIGINT;
ALTER TABLE financial_transactions ADD COLUMN created_by BIGINT;
UPDATE financial_transactions ft
  SET created_by = ft.user_id,
      plan_id = (SELECT p.id FROM plans p WHERE p.created_by = ft.user_id AND p.is_default);
ALTER TABLE financial_transactions ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE financial_transactions ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE financial_transactions
  ADD CONSTRAINT fk_ft_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
  ADD CONSTRAINT fk_ft_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- 4. same for categories (no created_by — owner-managed)
ALTER TABLE financial_transaction_categories ADD COLUMN plan_id BIGINT;
UPDATE financial_transaction_categories c
  SET plan_id = (SELECT p.id FROM plans p WHERE p.created_by = c.user_id AND p.is_default);
ALTER TABLE financial_transaction_categories ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE financial_transaction_categories
  ADD CONSTRAINT fk_ftc_plan FOREIGN KEY (plan_id) REFERENCES plans(id);

-- 5. re-index to plan, drop the old user_id columns + their indexes
DROP INDEX IF EXISTS idx_financial_transactions_user_id;
DROP INDEX IF EXISTS idx_financial_transactions_user_id_start_date;
DROP INDEX IF EXISTS idx_financial_transactions_user_id_series_id;
CREATE INDEX idx_ft_plan_id ON financial_transactions(plan_id);
CREATE INDEX idx_ft_plan_id_start_date ON financial_transactions(plan_id, start_date);
CREATE INDEX idx_ft_plan_id_series_id ON financial_transactions(plan_id, series_id);
ALTER TABLE financial_transactions DROP CONSTRAINT fk_financial_transactions_users;
ALTER TABLE financial_transactions DROP COLUMN user_id;
ALTER TABLE financial_transaction_categories DROP COLUMN user_id;  -- + its FK/index
```

**Safety protocol** (spec Success Criteria — lose nothing): dump the dev DB first; run V3 against a *copy*; assert row counts unchanged, zero null `plan_id`/`created_by`, and one default plan per user before running against the working DB. Because git isn't initialized at the repo root yet (STATE todo), strongly recommend `git init` + baseline commit before authoring migrations so they're versioned.

---

## Data Models

All entities follow the existing convention: plain class, `@Entity @Table(name="snake_case")`, manual getters/setters, `@GeneratedValue(IDENTITY)`, ownership via `@ManyToOne @JoinColumn(nullable=false, foreignKey=@ForeignKey(name="fk_..."))`. Enums live in `models/` alongside the others.

### Plan — `models/Plan.java` → `plans`
```
Long id
String name
@ManyToOne(optional=false) User createdBy      -- fk_plans_created_by
boolean isDefault                               -- auto-created landing plan; does NOT restrict sharing
```

### PlanMembership — `models/PlanMembership.java` → `plan_memberships`
```
Long id
@ManyToOne(optional=false) Plan plan            -- fk_plan_memberships_plan
@ManyToOne(optional=false) User user            -- fk_plan_memberships_user
@Enumerated(STRING) PlanRole role
-- unique (plan_id, user_id)  → uk_plan_memberships_plan_user
```

### PlanRole — `models/PlanRole.java` (enum)
`OWNER, EDITOR, CONTRIBUTOR, VIEWER` — mirrors the access matrix in spec PLAN-05.

### PlanInvitation — `models/PlanInvitation.java` → `plan_invitations`
```
Long id
@ManyToOne(optional=false) Plan plan
@Enumerated(STRING) PlanRole role               -- role the invitee will receive
@Enumerated(STRING) InvitationType type         -- EMAIL | LINK
String email                                    -- set for EMAIL, null for LINK
String token                                    -- unique; the accept token / link slug
@Enumerated(STRING) InvitationStatus status     -- PENDING | ACCEPTED | REVOKED
@ManyToOne(optional=false) User invitedBy
LocalDateTime expiresAt                          -- nullable (P3: link expiry)
```
- **EMAIL** invite = single-use, bound to `email`+`role`; accepting flips `status→ACCEPTED`.
- **LINK** invite = reusable; accepting creates a membership but leaves `status=PENDING` (consumed only by REVOKE — P3). MVP can ship LINK as reusable-until-revoked with no expiry.
- Token via `UUID.randomUUID()` (or `SecureRandom`), unguessable.

### FinancialTransaction — changes (`models/FinancialTransaction.java`)
```
- @ManyToOne(nullable=false) User user           // REMOVED as the scoping FK
+ @ManyToOne(optional=false) Plan plan            // scoping FK  → fk_ft_plan
+ @ManyToOne(optional=false) User createdBy       // attribution → fk_ft_created_by  (was the old user_id's value)
  @Table indexes: user_id* → plan_id, (plan_id,start_date), (plan_id,series_id)
```

### FinancialTransactionCategory — changes
```
- @ManyToOne(nullable=false) User user
+ @ManyToOne(optional=false) Plan plan            // fk_ftc_plan
```

**Frontend DTO** (`src/api/dtos/`): add `createdBy` (id + name) to the transaction response type; new `Plan`, `PlanMembership`, `PlanInvitation`, `PlanRole` types.

---

## Authorization Design (two layers)

### Layer 1 — plan membership + role, via `PlanContext`

- **`{planId}` path variable** (`/plans/{planId}/...`) carries the active plan on every plan-scoped request. (JWT stays unchanged — email-only subject; the plan is deliberately **not** in the token, so switching plans needs no re-login.)
- New **`security/PlanContextArgumentResolver`** (`HandlerMethodArgumentResolver`): reads `{planId}` from the URI template variables (`HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE`), loads the caller's `PlanMembership` for that plan; if none → `NotAMemberException` (404, no existence leak). Produces a `PlanContext(Plan plan, User user, PlanRole role)` that controllers declare as a parameter — mirroring today's `@AuthenticationPrincipal` ergonomics. Registered in a `WebMvcConfigurer`. (Because scoping rides in the path, the resolver is the single choke-point; a controller physically cannot receive a `PlanContext` without the URL carrying a `{planId}`.)
- Plan-**management** endpoints (create/list plans, invitations) are user-scoped and are **not** nested under `/plans/{planId}`.

### Layer 2 — role × row ownership, via `PlanAuthorization`

New **`security/PlanAuthorization`** helper (throws on denial, consistent with the codebase's manual-check style):

| Method | Rule |
| ------ | ---- |
| `requireCanCreateTransaction(role)` | deny VIEWER |
| `requireCanModifyTransaction(role, tx, user)` | OWNER/EDITOR: any; CONTRIBUTOR: only `tx.createdBy == user`; VIEWER: deny |
| `requireCanManageCategories(role)` | OWNER only |
| `requireOwner(role)` | OWNER only (members, roles, rename/delete) |

Denials map to **403 Forbidden** (`InsufficientPlanRoleException`, `CannotModifyOthersTransactionException`); non-membership / cross-plan access maps to **404** (keeps the existing "don't leak existence" convention).

**Kept in the service layer** (not `@PreAuthorize`) to match the existing pattern — `@EnableMethodSecurity` is absent today and introducing annotation-based security would be a new, parallel authz path. Noted as an alternative in Tech Decisions.

---

## Code Reuse Analysis

| Existing component | Location | How to reuse |
| ------------------ | -------- | ------------ |
| `belongsToUser` spec pattern | `specifications/FinancialTransactionSpecification.java` | Replace with `belongsToPlan(Plan)`; keep the null-safe static-factory style |
| Manual ownership check in `findById` | `services/FinancialTransactionService.java` | Becomes plan-match (read) + `PlanAuthorization` (write) |
| `@AuthenticationPrincipal` → reload user pattern | all controllers | Add `PlanContext` param alongside it via the new resolver |
| `UserService.create` (`@Transactional`) | `services/UserService.java` | Hook auto-provisioning of the default plan + OWNER membership on registration |
| `RecurringTransactionGenerator.baseTransaction` | `services/RecurringTransactionGenerator.java` | Set `plan` + `createdBy` instead of `user` |
| CSV dedup `findExistingExternalIds` | `repositories/FinancialTransactionRepository.java` | Re-scope `:user` → `:plan` (dedup per plan, per spec edge case) |
| `PaginatedFilterDto` + `PagedResponseDto` | `dtos/` | Reuse unchanged for plan/member listings |
| `GlobalExceptionHandler` + nested `XxxExceptions` | `exceptions/` | Add `PlanExceptions.*`, map to 403/404/409 |
| `ApiRoutes` constants | `utils/ApiRoutes.java` | Add `PLAN`, `INVITATION` routes |

**CONCERNS.md callouts addressed:** the HIGH "no migration tool" debt is resolved head-on by the Flyway foundation. The HIGH "no backend test coverage" gap makes the re-scope risky — the design mandates the V3 dry-run protocol and adds authorization tests (matrix cells) as first-class tasks rather than optional.

---

## Components

### Backend (new)
- **`models/`**: `Plan`, `PlanMembership`, `PlanInvitation`, `PlanRole`, `InvitationType`, `InvitationStatus`.
- **`repositories/`**: `PlanRepository` (`findAllByMembershipsUser`, `findByCreatedByAndIsDefaultTrue`), `PlanMembershipRepository` (`findByPlanAndUser`, `findAllByPlan`, `existsByPlanAndUser`), `PlanInvitationRepository` (`findByToken`, `findAllByPlan`).
- **`services/`**:
  - `PlanService` — create plan (+OWNER membership), list my plans, rename/delete (owner, last-plan guard), member management (change role/remove; last-owner guard), provision default plan (called from `UserService.create` and the migration's app-side equivalent if needed).
  - `PlanInvitationService` — create EMAIL/LINK invite (owner), preview by token, accept (auth user → membership; dedupe existing member; mark used), revoke.
- **`security/`**: `PlanContext`, `PlanContextArgumentResolver`, `PlanAuthorization`; `config/WebConfig` registers the resolver.
- **`controllers/`**: `PlanController` (plans + members), `PlanInvitationController` (invites/accept). Existing `FinancialTransaction`/`Category`/`Dashboard` controllers gain a `PlanContext` param and drop direct user-scoping.
- **`exceptions/`**: `PlanExceptions` (`PlanNotFound`→404, `NotAMember`→404, `InsufficientPlanRole`→403, `CannotModifyOthersTransaction`→403, `LastPlan`/`LastOwner`→409, `InvitationNotFound`/`Invalid`/`AlreadyMember`).

### Backend (modified)
- `FinancialTransactionService` / `FinancialTransactionCategoryService` / `DashboardService`: `User user` param → `PlanContext` (or `Plan` + role); all reads plan-scoped, all writes gated by `PlanAuthorization`.
- Both repositories: every `= :user` query → `= :plan`.
- `UserService.create`: provision default plan + OWNER membership in the same transaction.

### Frontend (new/modified)
- **Active-plan context**: a `PlanProvider` holding `activePlanId` (persisted to `localStorage`, default = user's default plan on login). Plan-scoped service hooks build their URLs under `/plans/${activePlanId}/...` and **include `activePlanId` in their TanStack Query keys** (so switching plans naturally refetches — no manual invalidation needed). No axios header interceptor.
- **Plan switcher** component (global, e.g. header) + plans/members management UI.
- **Invite accept** route/page (opens `/invitations/{token}`, requires auth, calls accept).
- **API service hooks** (`src/api/services/`): `usePlans`, `usePlanMembers`, `useInvitations` (follow the existing axios+TanStack Query pattern; toasts + invalidation). On plan switch, invalidate transaction/category/dashboard queries so views re-fetch for the new plan (query keys must include `activePlanId`).
- DTO/types additions as above.

---

## API Endpoints

**Plan management** (user-scoped, no `X-Plan-Id`):
| Verb | Path | Role | Story |
| ---- | ---- | ---- | ----- |
| POST | `/api/finsight/plans` | any auth | PLAN-03 |
| GET | `/api/finsight/plans` | member | PLAN-06 |
| GET | `/api/finsight/plans/{id}` | member | PLAN-06 |
| PUT | `/api/finsight/plans/{id}` | owner | PLAN-10 (P3) |
| DELETE | `/api/finsight/plans/{id}` | owner | PLAN-10 (P3) |
| GET | `/api/finsight/plans/{id}/members` | member | PLAN-09 |
| PUT | `/api/finsight/plans/{id}/members/{userId}` | owner | PLAN-09 (P2) |
| DELETE | `/api/finsight/plans/{id}/members/{userId}` | owner | PLAN-09 (P2) |
| POST | `/api/finsight/plans/{id}/invitations` | owner | PLAN-04 |
| GET | `/api/finsight/invitations/{token}` | any auth | PLAN-04 |
| POST | `/api/finsight/invitations/{token}/accept` | any auth | PLAN-04 |

**Plan-scoped** (nested under `/plans/{planId}/`; existing controllers, now plan-aware): the `financial-transaction`, `financial-transaction-category`, and `dashboard` routes move under the plan segment, e.g.:
- `/api/finsight/plans/{planId}/financial-transaction` (GET list/POST/`/{id}`/`/series`/`/import`)
- `/api/finsight/plans/{planId}/financial-transaction-category` (…)
- `/api/finsight/plans/{planId}/dashboard`

DTOs unchanged except the added `createdBy` (id + name) on the transaction response. Controllers swap their `User loggedUser`-scoping for a `PlanContext` parameter (resolved from `{planId}`); `@AuthenticationPrincipal` still identifies *who* is acting (for row-ownership + attribution). Route constants for these move under a `/plans/{planId}` prefix in `ApiRoutes`.

---

## Error Handling Strategy

| Scenario | Handling | User sees |
| -------- | -------- | --------- |
| `{planId}` absent / malformed | No route matches (or 400 on non-numeric path var) | 404 / 400 — scoping is structural, can't be silently skipped |
| Caller not a member of the plan | `NotAMemberException` | 404 (no existence leak) |
| Member but role too low (e.g. Viewer writing) | `InsufficientPlanRoleException` | 403 |
| Contributor edits another's transaction | `CannotModifyOthersTransactionException` | 403 |
| Delete/leave the last remaining plan | `LastPlanException` | 409 + explanation |
| Owner leaves without transfer | `LastOwnerException` | 409 + "transfer ownership first" |
| Invite token invalid/expired/revoked | `InvitationInvalidException` | 404/410 |
| Accepting when already a member | no-op, idempotent | 200 + "already a member" |

---

## Tech Decisions (non-obvious)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Active-plan transport | **`/plans/{planId}/...` path variable → `PlanContext` resolver** (confirmed 2026-07-12) | Explicit & self-documenting; scoping is structural so it can't be forgotten (no cross-plan leak); mainstream resource-hierarchy REST style. Stateless — plan stays out of the JWT, so switching needs no re-login. Cost: rewrites the existing flat routes (cheap now). Alt considered & rejected: `X-Plan-Id` header (lower churn but invisible context + relies on discipline to scope each endpoint). |
| Plan in JWT? | **No** | Plan is switchable per request; embedding it would force token re-issue on every switch. Membership is checked per-request from DB (cheap, indexed). |
| Authz location | **Service layer via `PlanAuthorization`** | Matches the existing manual-check convention; avoids introducing a parallel `@PreAuthorize`/`@EnableMethodSecurity` path. |
| Default plan | **Normal shareable plan, `isDefault=true`** | User decided personal plans aren't special; flag only drives the login default and the "always ≥1 plan" guard. |
| Categories re-scope | **Plan-owned, no `created_by`** | Categories are owner-managed shared config (spec P2); attribution only matters for transactions. |
| Invitation model | **One entity, `type=EMAIL\|LINK`** | Email = single-use bound to address; link = reusable-until-revoked. One table covers both flows (PLAN-04 now, PLAN-11 expiry/revoke later). |
| Baseline strategy | **`baseline-on-migrate=true`, V1 generated from real DDL** | The dev DB already has data + a Hibernate-made schema; baseline adopts it so `validate` passes. V1 must be dumped, never hand-written. |
| Plan deletion (PLAN-10, P3) | **Soft delete — `plans.deleted_at` (V4) + explicit per-finder filtering** (AD-006, 2026-07-12) | Hard cascade delete of a plan's transactions/categories/memberships is destructive and irreversible. Soft delete archives the plan (invisible everywhere, `PlanContext` unresolvable → 404) while all rows stay intact; permanent purge is a deferred future concern. Explicit `deleted_at IS NULL` in the read finders, **not** a global `@SQLRestriction` (which would break `membership.getPlan()` loads of an archived plan). |

---

## Build Order (feeds Tasks)

1. **Foundation** — Flyway + V1 baseline + `ddl-auto=validate` (no behavior change; app still runs identically).
2. **Plan domain** — entities, repos, `PlanService`, `PlanController`, default-plan on registration (V2). Still single-plan in practice.
3. **Re-scope** — V3 migration + swap `user`→`plan`/`createdBy` across entities, repos, services, generator, CSV dedup; `PlanContext` resolver; `PlanAuthorization`; controllers take `PlanContext`. **This is the atomic, risky step** — dry-run protocol mandatory.
4. **Sharing** — invitations (email+link) + accept; member management.
5. **Frontend** — plan context/switcher, header injection, hooks, accept page, per-person dashboard (P2).
6. **Tests** — authorization matrix, migration dry-run assertions, invitation flow.

---

## Checkpoint Decisions — Resolved (2026-07-12)

1. **Active-plan transport** → ✅ **Path variable `/plans/{planId}/...`** (see Tech Decisions). Everything downstream assumes the path.
2. **Default plan naming** → ✅ `"Meu plano"` for the migration; renameable later (PLAN-10).
3. **Version control for migrations** → ✅ Resolved: `finsight-backend` is already its own GitHub repo, so the `db/migration/` scripts are versioned there by default — no repo-root `git init` needed. (Only the monorepo-root `.specs/` folder is unversioned; where to track it is a separate, non-blocking question.)
4. **Migration data safety** → ✅ The current dev DB is the only real data (no prod yet — prod will be created later, where Flyway builds the schema from scratch via V1→V3 on an empty DB). The dry-run-on-a-copy protocol for V3 is sufficient.
