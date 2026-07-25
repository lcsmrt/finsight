# Shared Plans Tasks

**Design**: `.specs/features/shared-plans/design.md`
**Spec**: `.specs/features/shared-plans/spec.md`
**Status**: Done
**Scope of this breakdown**: P1 / MVP (PLAN-01..06 + PLAN-04 invitations) — **DONE & verified**. **Part 2 (P2/P3: PLAN-07..11, T34–T52) — DONE & verified 2026-07-12.** Part 2 slices are independent and individually shippable — they do not have to land together.

**Part 2 progress log:**
- ✅ **T34–T35** (Phase 8, PLAN-07: category limit evaluation) — commits `7eb2f4f` (backend: `CategoryBreakdownDto` gains `remaining`/`percentUsed`/`overLimit`, zero-spend limited categories now surfaced) / `ef14903` (frontend: dashboard type extended, tooltip "Remaining" row; existing `CategorySpendingChart` bar visualization already covered the over-limit state). FE gate: build green, lint pre-existing-baseline-only (same as Phase 6 precedent).
- ✅ **T36–T37** (Phase 9, PLAN-08: per-person dashboard) — commits `892958e` (backend: `findPersonBreakdown` query, `PersonBreakdownDto`, `DashboardService.buildPersonBreakdown`, `personBreakdown` field on `DashboardSummaryDto`) / `98b83be` (frontend: `PersonBreakdown` type, `PersonBreakdownList` component wired into `OverviewTab`; implemented as an always-visible section rather than a toggle — consistent with the tab's other always-rendered cards). FE gate: build green, lint pre-existing-baseline-only.
- ✅ **T38–T41** (Phase 10, PLAN-09: manage members) — commits `55f9043` (backend svc: `changeMemberRole`/`removeMember`, owner+last-owner guards) / `231c9ab` (backend ctrl: `PUT`/`DELETE /plans/{id}/members/{userId}`, `UpdateMemberRoleRequestDto`) / `dbde148` (frontend hooks: `useUpdateMemberRole`/`useRemoveMember`) / `9532919` (frontend UI: role `Select` + remove button in `PlanMembersList`, owner-only, hidden for self and for the sole remaining owner, uses shared `useConfirm()` dialog). All gates green (FE lint pre-existing-baseline-only).
- ✅ **T42–T47** (Phase 11, PLAN-10: plan lifecycle) — commits `f438d09` (V4 migration `deleted_at` + explicit per-finder filtering; **boot-verified against the live tunneled dev DB**: Flyway applied v4, Hibernate validate passed, no destructive SQL run) / `c900478` (svc: `renamePlan`/`deletePlan` soft-delete) / `2015e0a` (svc: `leavePlan`/`transferOwnership`) / `b1e127c` (ctrl: `PUT`/`DELETE /plans/{id}`, `POST /{id}/leave`, `POST /{id}/transfer`, `TransferOwnershipRequestDto`) / `4470105` (frontend hooks: `useRenamePlan`/`useDeletePlan`/`useLeavePlan`/`useTransferOwnership` — active-plan fallback needed no new code, already covered by `PlanProvider`'s existing effect) / `69d60d3` (frontend UI: rename/transfer dialogs + archive/leave actions in `PlansPage`, copy says "arquivar" not "excluir permanentemente"). All gates green.
- ✅ **T48–T51** (Phase 12, PLAN-11: invite revoke/expiry) — commits `e285a95` (svc: `InvitationExpiredException`→410, expiry accepted on LINK invites; **note**: `EXPIRED` added to the Java enum but deliberately never persisted — the DB `plan_invitations_status_check` constraint only allows PENDING/ACCEPTED/REVOKED, so expiry is a lazy check in `loadValidInvitation` + a display-only computed status in `InvitationResponseDto`, avoiding a V5 migration) / `9316af4` (ctrl: `DELETE .../invitations/{invitationId}`, `GET .../invitations` list, owner-check via new `PlanInvitationService.listInvitations`) / `9678436` (frontend hooks: `useGetPlanInvitations`/`useRevokeInvitation`) / `6957e02` (frontend UI: `PlanInvitationsList` card on `PlansPage`, optional `datetime-local` expiry input on `InvitePlanDialog` for LINK). All gates green.

**All of T34–T51 (Part 2 code) is COMPLETE.**
- ✅ **T52 (Part-2 runtime E2E)** — full API-driven verification against the live tunneled dev DB, both backend (compile) and frontend (lint/build) gates green. All 5 requirement areas PASS with every sub-check confirmed by actual HTTP status/response: PLAN-07 (limit crossing → `overLimit`, zero-spend limited category still surfaced), PLAN-08 (per-person sums match combined totals, ex-member attribution survives removal), PLAN-09 (role change authorizes immediately, removal preserves attribution, last-owner guard 409, non-owner 403), PLAN-10 (rename reflected, soft-delete archives while DB rows stay intact — verified via `psql`, non-owner leave preserves rows, owner-leave-without-transfer 409, transfer atomic, last-active-plan guard 409), PLAN-11 (revoke → 400 on accept, expired LINK → 410, list endpoint accurate). No bugs found. Test data (4 throwaway users, 5 plans, transactions/categories/invitations) fully cleaned up; pre-existing real data (3 users, 51 tx, 21 cat, 3 plans) verified byte-for-byte unchanged. One non-blocking observation: `GET /invitations/{token}` preview requires auth (403 anonymous) — not spec-required either way, flagged for awareness only, not treated as a bug.

**Part 2 (PLAN-07..11) is fully shipped.**

**Progress log:**
- ✅ **T1** (Flyway + ddl-auto=validate) — commit `795a079`
- ✅ **T2** (V1 baseline from real schema) — commit `270fbad`
- ✅ **T3** (boot verified: Flyway baselined v1, Hibernate `validate` passed, data intact 3u/51tx/21cat). Note: port 3000 held by a stray dev instance (pid 20174) — must be stopped before T14 (V3).
- _(pre-step)_ committed the uncommitted RECUR-10 recurring work separately — commit `7dc9877`
- ✅ **T4–T9** (Phase 2: enums, Plan/PlanMembership/PlanInvitation entities, V2 migration, repositories) — commits `10da50f`,`2202469`,`1dcca5e`,`24bf934`,`4ec91da`,`16559d6`
- ✅ **V2 boot-verified**: Flyway applied v2 (plan tables created), Hibernate `validate` passed, app started on :3099. Stray backend on :3000 (pid 20174) is now gone — clean slate for the re-scope.
- ✅ **T10–T13** (Phase 3: PlanExceptions+handler, PlanService, default-plan-on-registration, PlanController+routes) — commits `1fb34a0`,`d15d665`,`e5d70dc`,`9967989`. Sub-agent added `findAllByUser` to PlanMembershipRepository (needed for listing plan+role).
- ✅ **Phase 3 smoke-tested** on :3099: register → auto default plan created; login; `GET /plans` shows "Meu plano" OWNER; `POST /plans` creates a second; `/members` lists owner. Test data cleaned up (DB back to 3u/0plans).
- **Note (task↔commit mapping):** Phase 4 re-scope (T15,T16,T19–T24) is compile-coupled (changing `FinancialTransaction.user` breaks all consumers at once) → committed as ONE atomic commit, not 1-per-task. T14 (V3 SQL), T17 (PlanContext), T18 (PlanAuthorization) stay separate. Justified per implement.md (merge when tasks aren't independently verifiable). `PlanAuthorization` designed as pure logic — `requireCanModifyTransaction(role, rowOwner, actor)` — so it's unit-testable and decoupled from the entity.
- ✅ **T14–T24** (Phase 4: the re-scope) — commits `3b82c16` (V3), `c8387a1` (PlanContext resolver), `2b06c62` (PlanAuthorization + 20 matrix tests), `634b238` (entities/spec/repo/service/generator/controllers re-scope + `createdBy` DTO). _(Sub-agent died on an unstable connection AFTER all 4 commits landed; work verified independently.)_
- ✅ **Unit tests**: PlanAuthorizationTest 20/20, RecurringTransactionGeneratorTest 8/8.
- ✅ **V3 dry-run** on a template copy DB: all integrity assertions passed (counts 3/51/21 unchanged, 3 default plans + 3 OWNER memberships, zero null plan_id/created_by, 1 plan/user, user_id columns dropped, every tx → its creator's default plan).
- ✅ **V3 applied to REAL DB** via boot: Flyway v2→v3, Hibernate `validate` passed, app started. Real-DB integrity re-checked (same assertions, all clean).
- ✅ **Functional smoke test** of nested routes: `/plans/{id}/financial-transaction` CRUD works, response carries `createdBy`, and a non-member hitting another plan gets **404**. Test data cleaned up.
- ✅ **T25–T26** (Phase 5: invitations) — commits `d107c58` (PlanInvitationService: create email/link, preview, accept idempotent, revoke), `0d20fa3` (PlanInvitationController + routes + DTOs). No SecurityConfig change (routes fall under `.authenticated()`). Note: `InvitationInvalidException`→400 (design suggested 410; left as-is, easy to change).
- ✅ **FULL BACKEND E2E** (the backend half of T33) on :3099 — all green, then cleaned up:
  - Email invite → preview `{Casa, CONTRIBUTOR, Ana}` → accept 200; Link invite → accept 200; members = Ana(OWNER)/Bob(CONTRIBUTOR)/Cid(VIEWER).
  - **Access matrix, all server-side:** CONTRIBUTOR create=201, edit-others=403, create-category=403; VIEWER create=403, read=200; OWNER edit-any=200, create-category=201; non-member read=404. Every cell holds.

**Backend (Phases 1–5) is COMPLETE and verified.**
- ✅ **T27–T32** (Phase 6: frontend) on finsight-frontend `main` — commits `99fe622`,`3deef76`,`ea27661`,`ddbcb50`,`7b8b746`,`a00966b`. `npm run build` (tsc+vite) green; lint clean on all new/changed files (23 pre-existing baseline errors untouched, +1 accepted house-pattern warning in PlanProvider). _(Also committed the uncommitted RECUR-10 frontend work separately first: `c387ebb`.)_
  - Plan DTOs, `usePlanService`, `PlanProvider` (activePlanId + localStorage + default-plan seeding), rewired tx/category/dashboard hooks under `/plans/${activePlanId}/`, plan switcher + management UI, invitation service + accept page `/invitations/:token`.
- ✅ **Full-stack connectivity verified**: backend :3000 + vite :5173 both up and talking (front serves 200; register→login→`GET /plans` returns default plan through the real client path).
- ⏳ **T33 — visual UAT PENDING (user)**: the backend half of the E2E (access matrix + invites) is already proven via API; the remaining piece is the human visual walk-through of the UI (switcher, create-plan, invite create + accept page). Both servers left running for it.

**MVP (PLAN-01..06) is code-complete and backend-verified; only the frontend visual UAT remains.**

> **Testing note.** TESTING.md marks every backend layer "none (gap)" — there is no test profile and even the `@SpringBootTest` stub needs a live DB. Following the precedent set by recurring-transactions: pure-logic gets real unit tests; everything DB/HTTP-bound is compile-gated + verified at runtime (both apps up) in the final E2E task. Backend compile gate = `./mvnw -q -DskipTests package` (compiles without a DB). The one exception is **T18 `PlanAuthorization`** (pure role×ownership logic) which gets unit tests via `./mvnw test -Dtest=PlanAuthorizationTest`.

---

## Execution Plan

### Phase 1 — Migration Foundation (Sequential) ⚠️ prerequisite
```
T1 → T2 → T3
```

### Phase 2 — Plan Domain Model / V2 (mostly parallel)
```
T3 → T4 → T5 → ┌→ T6 [P] ─┐
               └→ T7 [P] ─┘ → T8 → T9
```

### Phase 3 — Plan Service & Management API
```
T9 → ┌→ T10 [P] ─┐
     └───────────┴→ T11 → ┌→ T12 ─┐
                          └→ T13 ─┘
```

### Phase 4 — Ownership Re-scope / V3 (the atomic, risky step)
```
T9,T8 → T14 (V3)
T5 → ┌→ T15 [P] ─┐
     └→ T16 [P] ─┘
T9 → T17 ;  T4 → T18 [P]
T15 → T19 → T20 ;  T16,T17,T18 → T21 ;  T15,T17 → T22 ;  T15 → T23
T20,T21,T22,T23 → T24
```

### Phase 5 — Invitations (PLAN-04)
```
T11,T10 → T25 → T26
```

### Phase 6 — Frontend (P1)
```
T27 → T28 → T29 → ┌→ T30 [P] ─┐
                  ├→ T31 [P] ─┤
                  └→ T32 [P] ─┘
```

### Phase 7 — Verification
```
(all) → T33
```

---

## Part 2 — Execution Plan (P2/P3)

> All Part-2 phases depend on the **P1 baseline** (backend Phases 1–5 + FE Phase 6, verified). Each phase below is an independent, shippable slice.

### Phase 8 — PLAN-07: Category limit evaluation (P2)
```
T34 (be) → T35 (fe)
```

### Phase 9 — PLAN-08: Combined dashboard + per-person breakdown (P2)
```
T36 (be) → T37 (fe)
```

### Phase 10 — PLAN-09: Manage members — change role / remove (P2)
```
T38 (svc) → T39 (ctrl) → T40 (fe hooks) → T41 (fe UI)
```

### Phase 11 — PLAN-10: Plan lifecycle — rename / soft-delete / leave / transfer (P3)
```
T42 (soft-delete foundation, V4) → T43 (svc: rename+soft-delete) → T44 (svc: leave+transfer) → T45 (ctrl) → T46 (fe hooks) → T47 (fe UI)
```
> T42 is a schema + cross-cutting change (V4 migration + read-path filtering) and must land first. T43 & T44 both modify `PlanService.java` → sequential (shared file, not `[P]`).

### Phase 12 — PLAN-11: Invite revoke / expiry (P3)
```
T48 (be: expiry) → T49 (be: revoke+list ctrl) → T50 (fe hooks) → T51 (fe UI)
```

### Phase 13 — Part-2 Verification
```
(part-2 slices) → T52
```

---

## Task Breakdown

### T1: Add Flyway + switch to schema validation
**What**: Add Flyway to the backend and stop Hibernate from managing the schema.
**Where**: `finsight-backend/pom.xml`, `finsight-backend/src/main/resources/application.properties`
**Depends on**: None
**Reuses**: Spring Boot BOM (manages Flyway version — do not pin)
**Requirement**: PLAN-01 (foundation)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `flyway-core` + `flyway-database-postgresql` added (version from BOM)
- [ ] `spring.flyway.enabled=true`, `baseline-on-migrate=true`, `baseline-version=1`
- [ ] `spring.jpa.hibernate.ddl-auto` changed `update` → `validate`
- [ ] Gate: `cd finsight-backend && ./mvnw -q -DskipTests package` compiles
**Tests**: none (matrix: none) · **Gate**: build
**Commit**: `chore(backend): adopt flyway, switch ddl-auto to validate`

### T2: Baseline the current schema as V1
**What**: Capture the existing schema (produced by `ddl-auto=update`) as the Flyway baseline.
**Where**: `finsight-backend/src/main/resources/db/migration/V1__baseline.sql`
**Depends on**: T1
**Reuses**: current live dev schema
**Requirement**: PLAN-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `V1__baseline.sql` generated from the **real** schema via `pg_dump --schema-only` (NOT hand-written) — users, financial_transactions, financial_transaction_categories, all columns/indexes/FKs
- [ ] Reviewed to match the three current entities exactly
**Tests**: none · **Gate**: build
**Verify**: diff the dump against `models/*.java`; every column/index/FK accounted for.
**Commit**: `chore(backend): add V1 baseline migration from current schema`

### T3: Verify the baseline boots under validate
**What**: Prove Flyway adopts the existing DB and Hibernate `validate` passes with zero schema drift.
**Where**: runtime (needs Postgres up)
**Depends on**: T2
**Reuses**: `docker-compose`, `.env`
**Requirement**: PLAN-01
**Tools**: MCP: NONE · Skill: `run` (launch the app)
**Done when**:
- [ ] App boots; `flyway_schema_history` created with V1 marked applied (baseline)
- [ ] No `SchemaManagementException` (validate passes)
- [ ] Existing endpoints still respond (smoke: login + list transactions)
**Tests**: none · **Gate**: build + runtime boot
**Verify**: `./mvnw spring-boot:run`; check logs for `Successfully validated`/flyway baseline; `GET /api/finsight/financial-transaction` works.
**Commit**: _(no code change; verification checkpoint — note result in tasks.md)_

---

### T4: Add plan enums
**What**: `PlanRole` (OWNER/EDITOR/CONTRIBUTOR/VIEWER), `InvitationType` (EMAIL/LINK), `InvitationStatus` (PENDING/ACCEPTED/REVOKED).
**Where**: `models/PlanRole.java`, `models/InvitationType.java`, `models/InvitationStatus.java`
**Depends on**: T3
**Reuses**: existing enum style (`FinancialTransactionType`, `RecurrenceMode`)
**Requirement**: PLAN-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Three enums created with the exact values from design
- [ ] Gate: `./mvnw -q -DskipTests package` compiles
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): add plan role and invitation enums`

### T5: Plan entity
**What**: `Plan` entity → table `plans` (`id`, `name`, `createdBy` FK, `isDefault`).
**Where**: `models/Plan.java`
**Depends on**: T4
**Reuses**: entity conventions (`@Table`, manual getters, `@ManyToOne` FK naming)
**Requirement**: PLAN-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Entity matches design; FK `fk_plans_created_by`
- [ ] Compiles (validate deferred until V2 exists — T8)
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): add Plan entity`

### T6: PlanMembership entity [P]
**What**: `PlanMembership` → `plan_memberships` (`plan`, `user`, `role`, unique(plan,user)).
**Where**: `models/PlanMembership.java`
**Depends on**: T4, T5
**Reuses**: entity conventions
**Requirement**: PLAN-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Entity + `@UniqueConstraint`/`@ForeignKey` per design
- [ ] Compiles
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): add PlanMembership entity`

### T7: PlanInvitation entity [P]
**What**: `PlanInvitation` → `plan_invitations` (`plan`, `role`, `type`, `email?`, `token` unique, `status`, `invitedBy`, `expiresAt?`).
**Where**: `models/PlanInvitation.java`
**Depends on**: T4, T5
**Reuses**: entity conventions
**Requirement**: PLAN-04
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Entity per design; `token` unique constraint
- [ ] Compiles
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): add PlanInvitation entity`

### T8: V2 — create plan tables
**What**: Migration creating `plans`, `plan_memberships`, `plan_invitations` (+ indexes/constraints) so `validate` passes with the new entities.
**Where**: `db/migration/V2__create_plan_tables.sql`
**Depends on**: T5, T6, T7
**Reuses**: V1 conventions
**Requirement**: PLAN-03/04/05
**Tools**: MCP: NONE · Skill: `run`
**Done when**:
- [ ] Tables/columns/constraints match the three entities
- [ ] App boots; Flyway applies V2; `validate` passes with the new entities present
**Tests**: none · **Gate**: build + runtime boot
**Verify**: boot app; `flyway_schema_history` shows V2; tables exist in DB.
**Commit**: `feat(backend): V2 migration for plan tables`

### T9: Plan repositories
**What**: `PlanRepository`, `PlanMembershipRepository`, `PlanInvitationRepository` with the finders from design.
**Where**: `repositories/Plan*Repository.java` (×3)
**Depends on**: T8
**Reuses**: `JpaRepository` + `JpaSpecificationExecutor` convention
**Requirement**: PLAN-03/04/05/06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `findAllByMembershipsUser`/membership lookup, `findByCreatedByAndIsDefaultTrue`, `findByPlanAndUser`, `existsByPlanAndUser`, `findAllByPlan`, `findByToken`
- [ ] Compiles
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): add plan repositories`

---

### T10: Plan exceptions + handler mappings [P]
**What**: `PlanExceptions` nested types + `GlobalExceptionHandler` mappings (404/403/409).
**Where**: `exceptions/PlanExceptions.java`, `exceptions/GlobalExceptionHandler.java` (modify)
**Depends on**: T9
**Reuses**: `UserExceptions`/`FinancialTransactionExceptions` pattern, `ErrorResponseDto`
**Requirement**: PLAN-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `PlanNotFound`/`NotAMember`→404, `InsufficientPlanRole`/`CannotModifyOthersTransaction`→403, `LastPlan`/`LastOwner`→409, invitation errors
- [ ] Handler maps each; compiles
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): plan exceptions and error mappings`

### T11: PlanService
**What**: create plan (+OWNER membership), list my plans (with role), get plan, `provisionDefaultPlan(user)`, guards (last-plan, last-owner).
**Where**: `services/PlanService.java`
**Depends on**: T9, T10
**Reuses**: `@Transactional` service pattern
**Requirement**: PLAN-03, PLAN-06, PLAN-10 guards
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] All methods implemented; membership created transactionally on plan create
- [ ] Guards throw the T10 exceptions
- [ ] Compiles
**Tests**: none (DB-bound; covered in T33) · **Gate**: build
**Commit**: `feat(backend): PlanService with membership + guards`

### T12: Auto-provision default plan on registration
**What**: Hook `UserService.create` to create the user's default plan + OWNER membership in the same transaction.
**Where**: `services/UserService.java` (modify)
**Depends on**: T11
**Reuses**: existing `@Transactional create`
**Requirement**: PLAN-01 (new users)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] New user → exactly one `isDefault` plan, OWNER membership
- [ ] Compiles; verified at runtime in T33
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): provision default plan on user registration`

### T13: PlanController + routes
**What**: `PlanController` (POST create, GET list, GET `/{id}`, GET `/{id}/members`) + `ApiRoutes` plan constants.
**Where**: `controllers/PlanController.java`, `utils/ApiRoutes.java` (modify)
**Depends on**: T11
**Reuses**: `@AuthenticationPrincipal`→reload-user pattern, `PagedResponseDto`
**Requirement**: PLAN-03, PLAN-06, PLAN-09 (list)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Endpoints wired to `PlanService`; owner-only guarded where needed
- [ ] New `PlanResponseDto`/`PlanRequestDto`/`PlanMemberResponseDto`
- [ ] Compiles
**Tests**: none (covered T33) · **Gate**: build
**Commit**: `feat(backend): plan management endpoints`

---

### T14: V3 — re-scope ownership to plan (data migration) ⚠️
**What**: The data-preserving re-scope: default plan per existing user, OWNER memberships, add `plan_id`+`created_by` to transactions (backfill), `plan_id` to categories, re-index, drop `user_id`.
**Where**: `db/migration/V3__rescope_ownership_to_plan.sql`
**Depends on**: T8 (plan tables), T9
**Reuses**: design V3 sketch
**Requirement**: PLAN-01, PLAN-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Script finalized against the real V1 columns
- [ ] **Dry-run protocol**: run on a dump copy; assert row counts unchanged, zero null `plan_id`/`created_by`, exactly one default plan per user
**Tests**: none · **Gate**: runtime (dry-run on copy)
**Verify**: `pg_dump` copy → apply V3 → run the assertion queries; all pass before it touches the working DB.
**Commit**: `feat(backend): V3 migration re-scoping ownership to plans`

### T15: Re-scope FinancialTransaction entity [P]
**What**: Replace `user` with `plan` (scoping FK) + add `createdBy` (attribution); re-index user_id→plan_id.
**Where**: `models/FinancialTransaction.java` (modify)
**Depends on**: T5
**Reuses**: entity conventions
**Requirement**: PLAN-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `plan` + `createdBy` FKs; indexes `(plan_id)`,`(plan_id,start_date)`,`(plan_id,series_id)`
- [ ] Aligns with V3 output; compiles (boot-validate in T33)
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): re-scope FinancialTransaction to plan + createdBy`

### T16: Re-scope FinancialTransactionCategory entity [P]
**What**: Replace `user` with `plan`.
**Where**: `models/FinancialTransactionCategory.java` (modify)
**Depends on**: T5
**Reuses**: entity conventions
**Requirement**: PLAN-02, PLAN-07
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `plan` FK; compiles
**Tests**: none · **Gate**: build
**Commit**: `feat(backend): re-scope category to plan`

### T17: PlanContext + argument resolver
**What**: `PlanContext(plan,user,role)`, `PlanContextArgumentResolver` (reads `{planId}` path var, verifies membership → NotAMember 404), register in `WebConfig`.
**Where**: `security/PlanContext.java`, `security/PlanContextArgumentResolver.java`, `config/WebConfig.java`
**Depends on**: T9
**Reuses**: `HandlerMethodArgumentResolver`, membership repo
**Requirement**: PLAN-05, PLAN-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Resolver reads URI template var, loads membership, throws `NotAMember` if absent
- [ ] Registered via `WebMvcConfigurer`; compiles
**Tests**: none (HTTP-bound; T33) · **Gate**: build
**Commit**: `feat(backend): PlanContext resolver for plan-scoped routes`

### T18: PlanAuthorization (pure logic) + unit tests [P]
**What**: Helper deciding writes: `requireCanCreateTransaction`, `requireCanModifyTransaction(role,tx,user)`, `requireCanManageCategories`, `requireOwner` — throwing T10 exceptions.
**Where**: `security/PlanAuthorization.java`, `src/test/java/.../security/PlanAuthorizationTest.java`
**Depends on**: T4 (enums), T10 (exceptions)
**Reuses**: `RecurringTransactionGeneratorTest` as the pure-unit-test template
**Requirement**: PLAN-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] All four methods implemented as pure logic (no DB)
- [ ] Unit tests cover **every cell of the access matrix** (all roles × own/others' row)
- [ ] Gate: `./mvnw test -Dtest=PlanAuthorizationTest` green
- [ ] Test count: ≥12 tests pass (matrix cells)
**Tests**: **unit** · **Gate**: quick (targeted)
**Commit**: `feat(backend): PlanAuthorization with access-matrix unit tests`

### T19: Re-scope transaction spec + repository queries
**What**: `belongsToPlan(Plan)` spec; every `= :user` query → `= :plan` (`findAllByPlan`, `findAllByPlanAndSeriesId`, `findExistingExternalIds`, `sumByPlan...`, `findCategoryBreakdown`, `findMonthlyTrend`).
**Where**: `specifications/FinancialTransactionSpecification.java`, `repositories/FinancialTransactionRepository.java` (modify)
**Depends on**: T15
**Reuses**: existing spec/query shapes
**Requirement**: PLAN-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `belongsToUser`→`belongsToPlan`; all `@Query` re-scoped to plan; compiles
**Tests**: none · **Gate**: build
**Commit**: `refactor(backend): scope transaction queries to plan`

### T20: Re-scope FinancialTransactionService
**What**: Swap `User user` params for `PlanContext`; reads plan-scoped, writes gated by `PlanAuthorization`; set `plan`+`createdBy` on create/import/series.
**Where**: `services/FinancialTransactionService.java` (modify)
**Depends on**: T17, T18, T19
**Reuses**: `PlanAuthorization`, `belongsToPlan`
**Requirement**: PLAN-02, PLAN-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `findById` = plan-match (404 else); create/update/delete gated by authz + row-ownership; import dedup per plan
- [ ] Compiles
**Tests**: none (behaviour verified T33) · **Gate**: build
**Commit**: `refactor(backend): plan-scope + authorize transaction service`

### T21: Re-scope category spec/repo/service
**What**: `belongsToPlan`; `findAllByPlan`; service to `PlanContext`; category management gated to OWNER.
**Where**: `specifications/FinancialTransactionCategorySpecification.java`, `repositories/FinancialTransactionCategoryRepository.java`, `services/FinancialTransactionCategoryService.java` (modify)
**Depends on**: T16, T17, T18
**Reuses**: `PlanAuthorization.requireCanManageCategories`
**Requirement**: PLAN-02, PLAN-07
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Reads plan-scoped; create/update/delete OWNER-only; compiles
**Tests**: none · **Gate**: build
**Commit**: `refactor(backend): plan-scope + authorize category service`

### T22: Re-scope DashboardService
**What**: Aggregations plan-scoped; `getSummary(planContext, start, end)`.
**Where**: `services/DashboardService.java` (modify)
**Depends on**: T15, T17
**Reuses**: re-scoped repo aggregation queries (T19)
**Requirement**: PLAN-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Summary computed over the plan; compiles
**Tests**: none · **Gate**: build
**Commit**: `refactor(backend): plan-scope dashboard aggregation`

### T23: Generator sets plan + createdBy
**What**: `RecurringTransactionGenerator` stamps `plan` + `createdBy` instead of `user`.
**Where**: `services/RecurringTransactionGenerator.java` (modify), `services/RecurringTransactionGeneratorTest.java` (update)
**Depends on**: T15
**Reuses**: existing generator + its unit test
**Requirement**: PLAN-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `baseTransaction` sets plan+createdBy
- [ ] Existing generator unit tests updated & green: `./mvnw test -Dtest=RecurringTransactionGeneratorTest`
- [ ] Test count: 8 tests pass (no silent deletions)
**Tests**: **unit** (existing) · **Gate**: quick (targeted)
**Commit**: `refactor(backend): generator stamps plan + createdBy`

### T24: Move scoped controllers under /plans/{planId}
**What**: Nest transaction/category/dashboard routes under `/plans/{planId}/`; controllers take `PlanContext`; add `createdBy` to `FinancialTransactionResponseDto`.
**Where**: `controllers/FinancialTransaction*Controller.java`, `DashboardController.java`, `dtos/response/FinancialTransactionResponseDto.java`, `utils/ApiRoutes.java` (modify)
**Depends on**: T20, T21, T22, T23
**Reuses**: `PlanContext` resolver param, `ApiRoutes`
**Requirement**: PLAN-02, PLAN-06, PLAN-08 (attribution field)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] All three controllers nested + accept `PlanContext`; `createdBy` in response
- [ ] App boots; `validate` passes against re-scoped entities; smoke on a scoped route
- [ ] Compiles + boots
**Tests**: none (full behaviour in T33) · **Gate**: build + runtime boot
**Commit**: `feat(backend): nest scoped routes under /plans/{planId}`

---

### T25: PlanInvitationService
**What**: create EMAIL/LINK invite (OWNER), preview by token, accept (auth user → membership, dedupe existing, mark EMAIL used), revoke.
**Where**: `services/PlanInvitationService.java`
**Depends on**: T11, T10
**Reuses**: `PlanService`, token via `UUID.randomUUID()`
**Requirement**: PLAN-04
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Both flows create memberships at the invite's role; re-accept idempotent; guards throw T10 errors
- [ ] Compiles
**Tests**: none (flow verified T33) · **Gate**: build
**Commit**: `feat(backend): plan invitation service (email + link)`

### T26: PlanInvitationController + routes
**What**: POST `/plans/{id}/invitations` (OWNER), GET `/invitations/{token}` (preview), POST `/invitations/{token}/accept`.
**Where**: `controllers/PlanInvitationController.java`, `utils/ApiRoutes.java` (modify)
**Depends on**: T25
**Reuses**: controller conventions, `PlanContext` for the OWNER-scoped create
**Requirement**: PLAN-04
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Endpoints wired; invite/preview/accept DTOs; compiles
**Tests**: none (T33) · **Gate**: build
**Commit**: `feat(backend): invitation endpoints`

---

### T27: Frontend plan DTO types
**What**: `Plan`, `PlanMembership`, `PlanInvitation`, `PlanRole` types; add `createdBy` to the transaction response type.
**Where**: `finsight-frontend/src/api/dtos/plan.ts`, `src/api/dtos/financialTransaction.ts` (modify)
**Depends on**: None (mirrors backend contract; can start once T24 shape is known)
**Reuses**: existing DTO style
**Requirement**: PLAN-02..06
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] Types match backend DTOs; `npm run build` typechecks
**Tests**: none (matrix: none) · **Gate**: build (FE)
**Commit**: `feat(frontend): plan DTO types`

### T28: Plan API service hooks
**What**: `usePlans` (list/create/get), `usePlanMembers` — axios + TanStack Query with toasts + invalidation.
**Where**: `finsight-frontend/src/api/services/usePlans.ts`, `usePlanMembers.ts`
**Depends on**: T27
**Reuses**: existing service-hook pattern, `finsightApi` client
**Requirement**: PLAN-03, PLAN-06, PLAN-09
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] Hooks for list/create/get/members; query keys defined; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): plan service hooks`

### T29: Active-plan context provider
**What**: `PlanProvider` holding `activePlanId` (localStorage, default = user's default plan on login) + `usePlanContext` hook.
**Where**: `finsight-frontend/src/features/plans/PlanProvider.tsx` (+ wire into app root)
**Depends on**: T28
**Reuses**: existing context/provider patterns
**Requirement**: PLAN-06
**Tools**: MCP: NONE · Skill: `feature-structure`, `component-creation`
**Done when**:
- [ ] Provider exposes active plan + setter; defaults sensibly; persists; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): active-plan context provider`

### T30: Rewire scoped hooks under /plans/{activePlanId} [P]
**What**: Point transaction/category/dashboard service hooks at `/plans/${activePlanId}/...`; add `activePlanId` to their query keys.
**Where**: `finsight-frontend/src/api/services/*` (transaction/category/dashboard hooks) (modify)
**Depends on**: T29
**Reuses**: `usePlanContext`, existing hooks
**Requirement**: PLAN-02, PLAN-06
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] URLs nested; keys include `activePlanId`; switching plan refetches; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `refactor(frontend): scope data hooks to active plan`

### T31: Plan switcher + management UI [P]
**What**: Global plan switcher; minimal plans list/create + members view.
**Where**: `finsight-frontend/src/features/plans/**`
**Depends on**: T28, T29
**Reuses**: shared UI primitives, `component-creation` patterns
**Requirement**: PLAN-03, PLAN-06, PLAN-09
**Tools**: MCP: NONE · Skill: `component-creation`, `feature-structure`
**Done when**:
- [ ] Switcher changes active plan; create-plan form; members list; `npm run lint && npm run build` pass
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): plan switcher and management UI`

### T32: Invitation hooks + accept page [P]
**What**: `useInvitations` (create/preview/accept); `/invitations/:token` accept route/page.
**Where**: `finsight-frontend/src/api/services/useInvitations.ts`, `src/features/plans/InviteAcceptPage.tsx`, routing (modify)
**Depends on**: T27, T29
**Reuses**: service-hook + form patterns, router
**Requirement**: PLAN-04
**Tools**: MCP: NONE · Skill: `api-integration`, `form-creation`, `component-creation`
**Done when**:
- [ ] Owner can create email/link invite; invitee opens link, previews, accepts, lands in the plan; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): invitation flow (create + accept)`

---

### T33: Runtime E2E — access matrix + invite + migration integrity
**What**: End-to-end verification with both apps up: full access matrix, invite flows, plan switch, and post-V3 data integrity.
**Where**: runtime (docker Postgres + backend + frontend)
**Depends on**: T24, T26, T30, T31, T32
**Reuses**: `run`/`verify` skills
**Requirement**: PLAN-01..06 (verification)
**Tools**: MCP: NONE · Skill: `run`, `verify`
**Done when**:
- [ ] **Migration**: after V3, existing user's data intact, one default plan, `created_by` correct
- [ ] **Matrix (server-side)**: every cell holds — Viewer blocked on writes (403); Contributor edits own only, others' → 403; Editor/Owner edit any; non-Owner blocked on categories/members/plan (403); non-member → 404
- [ ] **Invite**: email invite accepted → member at role; link invite accepted → member; re-accept idempotent
- [ ] **Switch**: changing active plan swaps data with no cross-plan leak
- [ ] Full gate: `cd finsight-backend && ./mvnw -q -DskipTests package` + `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (manual/driven E2E — no backend test infra; matches recurring-transactions T12/T17 precedent) · **Gate**: build + runtime E2E
**Verify**: drive each matrix cell against the API directly (curl/httpie) with tokens for users in different roles; confirm status codes.
**Commit**: _(verification checkpoint; record results + any SPEC_DEVIATION in STATE.md)_

---

## Part 2 — Task Breakdown (P2/P3, T34–T52)

> **Grounding (verified against code 2026-07-12).** The P1 re-scope already delivered more than the coarse notes implied:
> - Categories are **already plan-scoped** and `spendingLimit` exists; `findCategoryBreakdown` is plan-scoped and returns `[name, SUM(spent), limit]` → **plan-total spend is already aggregated**. Only *evaluation/surfacing* is missing (PLAN-07 is small).
> - `FinancialTransaction.createdBy` (FK to `users`) exists and is in the tx response DTO; **nothing aggregates by it** yet (PLAN-08).
> - `PlanService.requireNotLastPlan` / `requireNotLastOwner` guards + `LastPlan`/`LastOwner`→409 exist but are **uncalled**; `PlanMembershipRepository` has `findByPlanAndUser`/`countByPlanAndRole`/`findAllByPlan` (PLAN-09/10 have their guards+queries ready).
> - `PlanInvitationService.revoke(...)` **already exists** and `loadValidInvitation` already rejects REVOKED; it is just **unexposed** by any controller. `expiresAt` is hard-set `null` on create and never checked; `InvitationStatus` has no `EXPIRED` value (PLAN-11 expiry is greenfield).
>
> **Testing follows the P1 note above**: no backend test infra → pure logic gets targeted unit tests; DB/HTTP behaviour is compile-gated (`./mvnw -q -DskipTests package`) and driven end-to-end in **T51**. Frontend gate = `npm run lint && npm run build`.

---

### T34: Evaluate category spending limit in the breakdown (backend)
**What**: Surface a plan-total limit evaluation per category: add `remaining`, `percentUsed`, `overLimit` (derived) to `CategoryBreakdownDto`, computed from the already-aggregated `spent` vs `limit`; include DEBIT categories that have a `spendingLimit` but **zero spend** in range (currently omitted because the breakdown query inner-joins through transactions).
**Where**: `dtos/response/CategoryBreakdownDto.java`, `services/DashboardService.java#buildCategoryBreakdown` (modify)
**Depends on**: P1 baseline
**Reuses**: `FinancialTransactionRepository.findCategoryBreakdown` (plan-scoped, returns spent+limit), `FinancialTransactionCategoryRepository.findAllByPlan` (to seed zero-spend limited categories)
**Requirement**: PLAN-07
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `CategoryBreakdownDto` exposes `remaining` (`limit - spent`), `percentUsed`, `overLimit` (null-safe when `limit == null`)
- [ ] DEBIT categories with a limit but no spend appear with `spent = 0`; null-limit categories keep evaluation fields null
- [ ] DEBIT-only behaviour preserved; compiles
**Tests**: none (DB-bound; verified T52) · **Gate**: build
**Commit**: `feat(backend): evaluate plan-total category spending limits`

### T35: Show category limit usage on the dashboard (frontend)
**What**: Render the limit evaluation — a per-category usage bar / over-limit indicator using `spent`/`limit`/`percentUsed`/`overLimit` in the dashboard category breakdown.
**Where**: `finsight-frontend/src/api/dtos/*` (extend the dashboard/category-breakdown type), dashboard breakdown component(s) (modify)
**Depends on**: T34
**Reuses**: existing dashboard breakdown UI, shared UI primitives
**Requirement**: PLAN-07
**Tools**: MCP: NONE · Skill: `api-integration`, `component-creation`
**Done when**:
- [ ] Breakdown type includes the new fields; each category shows spent-vs-limit with an over-limit state; `npm run lint && npm run build` pass
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): show category limit usage on dashboard`

---

### T36: Per-person dashboard breakdown (backend)
**What**: Aggregate the plan's spend by `createdBy`: new repo query grouping by `ft.createdBy` (id, name, type, SUM) plan+date-scoped; new `PersonBreakdownDto` (userId, name, income, expense, net); `DashboardService.buildPersonBreakdown(...)`; add a `List<PersonBreakdownDto> personBreakdown` field to `DashboardSummaryDto`.
**Where**: `repositories/FinancialTransactionRepository.java`, `dtos/response/PersonBreakdownDto.java` (new), `services/DashboardService.java`, `dtos/response/DashboardSummaryDto.java` (modify)
**Depends on**: P1 baseline
**Reuses**: the existing `sumByPlanAndTypeAndDateRange`/`findCategoryBreakdown` query shapes; `createdBy` FK; `FinancialTransactionResponseDto.CreatedByDto` (id+name shape)
**Requirement**: PLAN-08
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] New query groups by `createdBy.id`, `createdBy.name`, `type`, plan+date filtered
- [ ] `DashboardSummaryDto` carries `personBreakdown`; combined totals unchanged; sum of per-person income/expense equals the combined totals
- [ ] Ex-members (membership removed, user row intact) still appear via their `createdBy` (satisfies PLAN-08 AC-3 / PLAN-09 attribution); compiles
**Tests**: none (DB-bound; verified T52) · **Gate**: build
**Commit**: `feat(backend): per-person dashboard breakdown by createdBy`

### T37: Per-person breakdown view (frontend)
**What**: Add a per-person section/toggle to the dashboard consuming `personBreakdown` (who spent what: income/expense/net per member).
**Where**: `finsight-frontend/src/api/dtos/*` (dashboard type), dashboard feature component(s) (modify/new)
**Depends on**: T36
**Reuses**: existing dashboard layout + chart/list primitives
**Requirement**: PLAN-08
**Tools**: MCP: NONE · Skill: `api-integration`, `component-creation`
**Done when**:
- [ ] Dashboard type includes `personBreakdown`; a toggle/section shows the per-person split; `npm run lint && npm run build` pass
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): per-person dashboard breakdown view`

---

### T38: Member management service methods (backend)
**What**: `PlanService.changeMemberRole(planId, targetUserId, newRole, requester)` and `removeMember(planId, targetUserId, requester)` — OWNER-only (`requireOwner`); wire the existing `requireNotLastOwner` guard when demoting/removing an OWNER; removing a member deletes only the `PlanMembership` (their transactions stay, `created_by` intact).
**Where**: `services/PlanService.java` (modify)
**Depends on**: P1 baseline
**Reuses**: `PlanMembershipRepository.findByPlanAndUser`/`countByPlanAndRole`, `requireNotLastOwner`, `PlanAuthorization.requireOwner`
**Requirement**: PLAN-09
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Both methods implemented; demote/remove of the last OWNER throws `LastOwnerException` (409); non-owner requester → `InsufficientPlanRoleException` (403); removed member's transactions remain attributed
- [ ] Compiles
**Tests**: none (DB-bound; verified T52) · **Gate**: build
**Commit**: `feat(backend): change member role and remove member`

### T39: Member management endpoints (backend)
**What**: `PUT /plans/{planId}/members/{userId}` (change role) and `DELETE /plans/{planId}/members/{userId}` (remove) on `PlanController`; `UpdateMemberRoleRequestDto`; `ApiRoutes` member route constant.
**Where**: `controllers/PlanController.java`, `dtos/request/UpdateMemberRoleRequestDto.java` (new), `utils/ApiRoutes.java` (modify)
**Depends on**: T38
**Reuses**: `PlanContext` resolver (owner-scoped mutation) or the controller's existing user-resolution pattern — match the existing `PlanController` style
**Requirement**: PLAN-09
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Both endpoints wired to T38; owner-gated; request DTO validated; compiles
**Tests**: none (verified T52) · **Gate**: build
**Commit**: `feat(backend): member management endpoints`

### T40: Member management hooks (frontend)
**What**: `useUpdateMemberRole` (PUT) + `useRemoveMember` (DELETE) mutations with toasts + invalidation of `["planMembers", planId]` (and `["plans"]` where role affects the switcher).
**Where**: `finsight-frontend/src/api/services/usePlanService.ts` (modify), `src/api/dtos/plan.ts` (add `UpdateMemberRoleRequest`)
**Depends on**: T39
**Reuses**: existing service-hook pattern, `finsightApi`
**Requirement**: PLAN-09
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] Both mutations defined; correct invalidation; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): member management service hooks`

### T41: Member controls in members list (frontend)
**What**: Add per-member controls to `PlanMembersList` (role dropdown + remove), OWNER-only, hidden for self / last owner; wire to T40.
**Where**: `finsight-frontend/src/features/plans/components/PlanMembersList.tsx` (modify)
**Depends on**: T40
**Reuses**: `ROLE_OPTIONS` (`utils/planLabels.ts`), shared menu/dialog primitives, `usePlanContext` (`myRole`)
**Requirement**: PLAN-09
**Tools**: MCP: NONE · Skill: `component-creation`
**Done when**:
- [ ] Owner can change a member's role and remove a member from the list; controls gated by `myRole === OWNER`; confirm-on-remove; `npm run lint && npm run build` pass
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): role-change and remove controls in members list`

---

### T42: Soft-delete foundation (backend) ⚠️ schema
**What**: Introduce soft delete on plans: `V4__add_plan_deleted_at.sql` adds nullable `plans.deleted_at`; `Plan.deletedAt` (`LocalDateTime`) field; **filter archived plans out of the read paths** — `PlanRepository.findByCreatedByAndIsDefaultTrue`, `PlanMembershipRepository.findAllByUser`, the resolver's membership lookup, and the last-plan count — so an archived plan is invisible everywhere (its `PlanContext` can't be resolved → 404) while its transactions/categories/memberships/invitations stay physically intact.
**Where**: `db/migration/V4__add_plan_deleted_at.sql` (new), `models/Plan.java`, `repositories/PlanRepository.java`, `repositories/PlanMembershipRepository.java`, `security/PlanContextArgumentResolver.java`, `services/PlanService.java` (`requireNotLastPlan` counts only active) (modify)
**Depends on**: P1 baseline
**Reuses**: Flyway migration convention (V1–V3), existing finders
**Requirement**: PLAN-10
**Tools**: MCP: NONE · Skill: `run`
**Done when**:
- [ ] `V4` adds `deleted_at`; `Plan.deletedAt` maps it; app boots, Flyway applies V4, `validate` passes
- [ ] Read paths exclude `deleted_at IS NOT NULL`: archived plan not listed, not resolvable (→404), and not counted by the last-plan guard; login-default falls back past an archived default plan
- [ ] Filtering is explicit per-finder (NOT a global `@SQLRestriction`, to avoid breaking `membership.getPlan()` association loads); compiles + boots
**Tests**: none (DB-bound; verified T52) · **Gate**: build + runtime boot
**Verify**: boot app; `flyway_schema_history` shows V4; set a plan's `deleted_at` manually → it vanishes from `GET /plans` and its `/plans/{id}/...` routes 404.
**Commit**: `feat(backend): soft-delete foundation for plans (V4 + read-path filtering)`

### T43: Rename + soft-delete plan service methods (backend)
**What**: `PlanService.renamePlan(planId, newName, requester)` and `deletePlan(planId, requester)` — OWNER-only. Delete is a **soft delete**: set `deletedAt = now()` (archives the plan for all members; no rows cascaded); blocked by `requireNotLastPlan` (can't archive the requester's last active plan).
**Where**: `services/PlanService.java` (modify)
**Depends on**: T42
**Reuses**: `requireNotLastPlan` (now active-only), `PlanAuthorization.requireOwner`
**Requirement**: PLAN-10
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Rename (owner-only) updates the name; delete sets `deletedAt` (owner-only), leaving all dependent rows intact; archiving the requester's last active plan → `LastPlanException` (409); non-owner → 403
- [ ] Compiles
**Tests**: none (DB-bound; verified T52) · **Gate**: build
**Commit**: `feat(backend): rename and soft-delete plan`

### T44: Leave + transfer-ownership service methods (backend)
**What**: `PlanService.leavePlan(planId, requester)` — non-owner leaves (guard `requireNotLastPlan`; an OWNER must transfer first, not leave); `transferOwnership(planId, newOwnerUserId, previousOwnerRole, requester)` — current OWNER promotes a member to OWNER and drops to `previousOwnerRole` (default EDITOR) in one transaction.
**Where**: `services/PlanService.java` (modify)
**Depends on**: T43
**Reuses**: `requireNotLastPlan`, `requireNotLastOwner`, `findByPlanAndUser`
**Requirement**: PLAN-10
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Non-owner can leave (their created transactions remain); owner leaving without transfer → `LastOwnerException` (409); transfer promotes target to OWNER and demotes the old owner atomically; leaving the last remaining plan → `LastPlanException` (409)
- [ ] Compiles
**Tests**: none (DB-bound; verified T52) · **Gate**: build
**Commit**: `feat(backend): leave plan and transfer ownership`

### T45: Plan lifecycle endpoints (backend)
**What**: `PUT /plans/{planId}` (rename), `DELETE /plans/{planId}` (soft-delete), `POST /plans/{planId}/leave`, `POST /plans/{planId}/transfer` on `PlanController`; `TransferOwnershipRequestDto` (`newOwnerUserId`, `previousOwnerRole`); reuse `PlanRequestDto` for rename; `ApiRoutes` constants as needed.
**Where**: `controllers/PlanController.java`, `dtos/request/TransferOwnershipRequestDto.java` (new), `utils/ApiRoutes.java` (modify)
**Depends on**: T43, T44
**Reuses**: existing `PlanController` conventions
**Requirement**: PLAN-10
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] All four endpoints wired and owner/membership-gated; DTOs validated; compiles
**Tests**: none (verified T52) · **Gate**: build
**Commit**: `feat(backend): plan lifecycle endpoints`

### T46: Plan lifecycle hooks (frontend)
**What**: `useRenamePlan` (PUT), `useDeletePlan` (DELETE), `useLeavePlan` (POST), `useTransferOwnership` (POST) with toasts + `["plans"]`/`["planMembers"]` invalidation; on delete/leave of the active plan, fall back to the default plan in `PlanProvider`.
**Where**: `finsight-frontend/src/api/services/usePlanService.ts` (modify), `src/api/dtos/plan.ts` (add `UpdatePlanRequest`, `TransferOwnershipRequest`), `src/features/plans/PlanProvider.tsx` (active-plan fallback)
**Depends on**: T45
**Reuses**: service-hook pattern, `usePlanContext`
**Requirement**: PLAN-10
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] Four mutations defined; active-plan fallback after delete/leave; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): plan lifecycle service hooks`

### T47: Plan lifecycle UI (frontend)
**What**: Rename + delete (archive) controls on `PlansPage` (owner-only), a leave-plan action (non-owner), and a transfer-ownership control (owner, picks a member). Split if it grows beyond one cohesive area.
**Where**: `finsight-frontend/src/features/plans/PlansPage.tsx` + `components/**` (modify/new)
**Depends on**: T46
**Reuses**: `component-creation`/`form-creation` patterns, confirm dialogs, `PlanMembersList` (transfer target)
**Requirement**: PLAN-10
**Tools**: MCP: NONE · Skill: `component-creation`, `form-creation`
**Done when**:
- [ ] Owner can rename/delete/transfer; non-owner can leave; destructive actions confirm ("archive", not "permanently delete"); guards' 409s surfaced as messages; `npm run lint && npm run build` pass
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): plan lifecycle UI`

---

### T48: Invitation expiry support (backend)
**What**: Add `EXPIRED` to `InvitationStatus`; accept an optional `expiresAt` on create (`InvitationRequestDto` → set on the entity instead of hard-null, LINK only); check expiry in `loadValidInvitation` (now-past `expiresAt` → reject); add `InvitationExpiredException` → **410 GONE** in `GlobalExceptionHandler`.
**Where**: `models/InvitationStatus.java`, `services/PlanInvitationService.java`, `dtos/request/InvitationRequestDto.java`, `exceptions/PlanExceptions.java`, `exceptions/GlobalExceptionHandler.java` (modify)
**Depends on**: P1 baseline
**Reuses**: existing `loadValidInvitation` reject-path, `InvitationInvalidException` precedent
**Requirement**: PLAN-11
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Optional `expiresAt` persisted on LINK invites; preview/accept of an expired invite → 410; EMAIL single-use + REVOKED handling unchanged; compiles
**Tests**: none (verified T52) · **Gate**: build
**Commit**: `feat(backend): invitation expiry support`

### T49: Revoke + list-invitations endpoints (backend)
**What**: Expose the existing `PlanInvitationService.revoke(...)` via `DELETE /plans/{planId}/invitations/{invitationId}` (OWNER); add `GET /plans/{planId}/invitations` (OWNER) listing a plan's invitations via the existing `PlanInvitationRepository.findAllByPlan`; list response DTO; `ApiRoutes` constant.
**Where**: `controllers/PlanInvitationController.java`, `dtos/response/InvitationListItemDto.java` (new, or reuse `InvitationResponseDto`), `utils/ApiRoutes.java` (modify)
**Depends on**: T48
**Reuses**: `PlanInvitationService.revoke` (already implemented), `findAllByPlan`, `PlanContext` (owner-scoped)
**Requirement**: PLAN-11
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Revoke endpoint wired (owner-only; sets REVOKED); list endpoint returns the plan's invitations with status/type/role/email/expiresAt; compiles
**Tests**: none (verified T52) · **Gate**: build
**Commit**: `feat(backend): revoke and list invitation endpoints`

### T50: Invitation management hooks (frontend)
**What**: `useRevokeInvitation` (DELETE) + `useGetPlanInvitations` (GET, key `["planInvitations", planId]`) with toasts + invalidation; extend `InvitationStatus` usage (`EXPIRED` already in the FE DTO).
**Where**: `finsight-frontend/src/api/services/useInvitationService.ts` (modify), `src/api/dtos/plan.ts` (add list item type)
**Depends on**: T49
**Reuses**: service-hook pattern, existing invitation DTOs (FE `InvitationStatus` already includes `EXPIRED`/`REVOKED`)
**Requirement**: PLAN-11
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] Revoke + list hooks defined; revoke invalidates the plan-invitations list; `npm run build` passes
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): invitation management hooks`

### T51: Pending-invitations UI + optional expiry (frontend)
**What**: A pending-invitations list (owner) with a revoke button, shown on `PlansPage`/invite area; add an optional expiry input to `InvitePlanDialog` for LINK invites.
**Where**: `finsight-frontend/src/features/plans/PlansPage.tsx` + `components/InvitePlanDialog.tsx` + a new invitations-list component (modify/new)
**Depends on**: T50
**Reuses**: `InvitePlanDialog`, status/type labels (`utils/planLabels.ts`), shared list/badge primitives
**Requirement**: PLAN-11
**Tools**: MCP: NONE · Skill: `component-creation`, `form-creation`
**Done when**:
- [ ] Owner sees pending invites and can revoke one (list refetches); LINK invite form offers an optional expiry; expired/revoked states rendered; `npm run lint && npm run build` pass
**Tests**: none · **Gate**: build (FE)
**Commit**: `feat(frontend): pending invitations list, revoke, and expiry`

---

### T52: Part-2 runtime E2E + UAT
**What**: End-to-end verification (both apps up) of the Part-2 slices. Independently runnable per slice as each lands; consolidated here.
**Where**: runtime (Postgres + backend + frontend)
**Depends on**: the Part-2 tasks whose slices are being verified (T35, T37, T41, T47, T51)
**Reuses**: `run`, `verify` skills
**Requirement**: PLAN-07..11 (verification)
**Tools**: MCP: NONE · Skill: `run`, `verify`
**Done when**:
- [ ] **PLAN-07**: category with two members' spend shows a plan-total that crosses its limit → `overLimit`; a limited category with no spend still appears
- [ ] **PLAN-08**: combined totals equal the sum of the per-person split; an ex-member's past spend still attributed
- [ ] **PLAN-09**: owner changes a role (new role authorizes immediately) and removes a member (loses access, past rows retained); demoting/removing the last owner → 409; non-owner → 403
- [ ] **PLAN-10**: rename reflected; **soft-delete archives** the plan (vanishes from lists + routes 404) while its rows stay in the DB; non-owner leaves (rows remain); owner-leave-without-transfer → 409; transfer promotes/demotes atomically; last active plan delete/leave → 409
- [ ] **PLAN-11**: owner revokes an invite (accept then → rejected); expired LINK invite → 410; list shows pending invites
- [ ] Gates: `cd finsight-backend && ./mvnw -q -DskipTests package` + `cd finsight-frontend && npm run lint && npm run build`
**Tests**: none (manual/driven E2E — no backend test infra; matches T33 precedent) · **Gate**: build + runtime E2E
**Verify**: drive each cell against the API with role-specific tokens; confirm status codes and DB state.
**Commit**: _(verification checkpoint; record results + any SPEC_DEVIATION in STATE.md)_

---

## Pre-Approval Validation

### Check 1 — Granularity
| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | pom + properties (1 concern) | ✅ |
| T2 | 1 SQL file | ✅ |
| T3 | 1 verification | ✅ |
| T4 | 3 enums (cohesive) | ✅ |
| T5–T7 | 1 entity each | ✅ |
| T8 | 1 migration | ✅ |
| T9 | 3 repos (cohesive, 1 concern) | ✅ |
| T10 | exceptions + handler (1 concern) | ✅ |
| T11 | 1 service | ✅ |
| T12 | 1 hook into 1 method | ✅ |
| T13 | 1 controller | ✅ |
| T14 | 1 migration | ✅ |
| T15,T16 | 1 entity each | ✅ |
| T17 | resolver+context (1 concern) | ✅ |
| T18 | 1 helper + its tests | ✅ |
| T19 | spec+queries (1 concern, related files) | ✅ |
| T20,T21,T22 | 1 service each | ✅ |
| T23 | 1 generator | ✅ |
| T24 | controllers nesting (1 concern) | ✅ |
| T25 | 1 service | ✅ |
| T26 | 1 controller | ✅ |
| T27 | DTO types (1 concern) | ✅ |
| T28 | service hooks (1 concern) | ✅ |
| T29 | 1 provider | ✅ |
| T30 | hook rewiring (1 concern) | ✅ |
| T31 | switcher+mgmt UI (1 feature area) | ⚠️ OK if kept minimal; split if it grows |
| T32 | invite hooks+page (1 flow) | ✅ |
| T33 | 1 verification pass | ✅ |

### Check 2 — Diagram ↔ Definition Cross-Check
| Task | Depends on (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | start | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T4,T5 | T5→T6 | ✅ |
| T7 | T4,T5 | T5→T7 | ✅ |
| T8 | T5,T6,T7 | T6,T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | T9,T10 | T10→T11 | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T11 | T11→T13 | ✅ |
| T14 | T8,T9 | T9,T8→T14 | ✅ |
| T15 | T5 | T5→T15 | ✅ |
| T16 | T5 | T5→T16 | ✅ |
| T17 | T9 | T9→T17 | ✅ |
| T18 | T4,T10 | T4→T18 | ✅ |
| T19 | T15 | T15→T19 | ✅ |
| T20 | T17,T18,T19 | T19→T20 | ✅ |
| T21 | T16,T17,T18 | →T21 | ✅ |
| T22 | T15,T17 | →T22 | ✅ |
| T23 | T15 | T15→T23 | ✅ |
| T24 | T20,T21,T22,T23 | →T24 | ✅ |
| T25 | T11,T10 | T11→T25 | ✅ |
| T26 | T25 | T25→T26 | ✅ |
| T27 | None | start (FE) | ✅ |
| T28 | T27 | T27→T28 | ✅ |
| T29 | T28 | T28→T29 | ✅ |
| T30 | T29 | T29→T30 | ✅ |
| T31 | T28,T29 | T29→T31 | ✅ |
| T32 | T27,T29 | T29→T32 | ✅ |
| T33 | T24,T26,T30,T31,T32 | all→T33 | ✅ |

Parallel-safety: `[P]` tasks in a phase share no mutable state (distinct files) and their tests (none, or T18's isolated unit test) are parallel-safe.

### Check 3 — Test Co-location
| Task | Layer | Matrix requires | Task says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T4–T17,T19–T22,T24,T25,T26 | backend (entities/repos/services/controllers/migrations) | none (gap) | none | ✅ |
| T18 | backend security (pure logic) | none (gap) | **unit** | ✅ exceeds minimum (security-critical, pure logic; precedent = generator test) |
| T23 | backend service (generator) | none (gap) | unit (existing) | ✅ updates existing tests |
| T27–T32 | frontend features/hooks/services | none (gap) | none | ✅ |
| T3,T14,T33 | runtime verification | none | none (+ runtime E2E) | ✅ |

**All three checks pass.** No task ships unverified: pure logic is unit-tested; DB/HTTP behaviour is compile-gated then driven end-to-end in T33 (the documented pattern for this test-infra-less backend).

---

## Part 2 — Pre-Approval Validation (T34–T52)

### Check 1 — Granularity
| Task | Scope | Status |
| ---- | ----- | ------ |
| T34 | DTO + 1 service method (1 concern) | ✅ |
| T35 | 1 dashboard UI area | ✅ |
| T36 | query + DTO + service field (1 aggregation) | ✅ |
| T37 | 1 dashboard view | ✅ |
| T38 | 2 cohesive service methods | ✅ |
| T39 | 2 endpoints (1 controller) | ✅ |
| T40 | 2 hooks (1 concern) | ✅ |
| T41 | 1 component modify | ✅ |
| T42 | soft-delete foundation: V4 + entity field + read-path filtering (1 cross-cutting concern) | ✅ |
| T43 | rename+soft-delete (1 service, cohesive) | ✅ |
| T44 | leave+transfer (1 service, cohesive) | ✅ |
| T45 | 4 lifecycle endpoints (1 controller) | ✅ |
| T46 | 4 lifecycle hooks (1 concern) | ✅ |
| T47 | lifecycle UI (1 feature area) | ⚠️ OK if kept minimal; split if it grows |
| T48 | expiry (enum+service+exception, 1 concern) | ✅ |
| T49 | 2 endpoints (1 controller) | ✅ |
| T50 | 2 hooks (1 concern) | ✅ |
| T51 | invites list + expiry input (1 area) | ⚠️ OK if kept minimal; split if it grows |
| T52 | 1 verification pass | ✅ |

### Check 2 — Diagram ↔ Definition Cross-Check
| Task | Depends on (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T34 | P1 baseline | Phase 8 start | ✅ |
| T35 | T34 | T34→T35 | ✅ |
| T36 | P1 baseline | Phase 9 start | ✅ |
| T37 | T36 | T36→T37 | ✅ |
| T38 | P1 baseline | Phase 10 start | ✅ |
| T39 | T38 | T38→T39 | ✅ |
| T40 | T39 | T39→T40 | ✅ |
| T41 | T40 | T40→T41 | ✅ |
| T42 | P1 baseline | Phase 11 start | ✅ |
| T43 | T42 | T42→T43 | ✅ |
| T44 | T43 | T43→T44 | ✅ |
| T45 | T43,T44 | T44→T45 | ✅ |
| T46 | T45 | T45→T46 | ✅ |
| T47 | T46 | T46→T47 | ✅ |
| T48 | P1 baseline | Phase 12 start | ✅ |
| T49 | T48 | T48→T49 | ✅ |
| T50 | T49 | T49→T50 | ✅ |
| T51 | T50 | T50→T51 | ✅ |
| T52 | T35,T37,T41,T47,T51 | slices→T52 | ✅ |

No `[P]` tasks in Part 2 (each phase is a linear be→fe chain; T43/T44 share `PlanService.java` so are intentionally sequential, and T42 must precede them). No parallel-safety conflicts.

### Check 3 — Test Co-location
| Task | Layer | Matrix requires | Task says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T34,T36,T38,T39,T43,T44,T45,T48,T49 | backend (services/controllers/DTOs) | none (gap) | none | ✅ |
| T42 | backend migration + entity + finders (runtime-boot) | none (gap) | none (+ boot) | ✅ |
| T35,T37,T40,T41,T46,T47,T50,T51 | frontend (features/hooks/services) | none (gap) | none | ✅ |
| T52 | runtime verification | none | none (+ runtime E2E) | ✅ |

**All three checks pass for Part 2.** Consistent with P1: no backend test infra, so DB/HTTP behaviour is compile-gated per task and driven end-to-end in T52. The one schema task (T42) is additionally boot-verified (Flyway V4 + `validate`), matching the T8/T14 migration precedent. (No new pure-logic helper here rises to the security-critical bar that earned T18 its unit tests; the limit math in T34 is trivial and covered by T52.)
