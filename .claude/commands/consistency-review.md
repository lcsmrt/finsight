---
description: Audit finsight (backend Java + frontend TS) for drift against the documented standards. Report-only, findings ranked by confidence.
argument-hint: [scope — e.g. "backend", "frontend", a path, or blank for full]
---

Run a consistency review of the finsight codebase against the **written** standards. This is a
**report-only** audit — do NOT fix anything in this pass; reporting and fixing are separate steps.

## Scope

$ARGUMENTS

If a scope is given above, limit the review to it (a layer, a feature, a path, or the current diff).
If blank, run a full review.

## Golden rule

Audit against **documented** standards only. Never invent or infer a rule from majority code patterns.
If code is inconsistent but no written rule governs it, report it under **Undocumented — needs a
decision**, not as a violation. Inferred "standards" are not standards — surfacing the gap is the
correct output, not a made-up verdict.

## Sources of truth (priority order)

1. `CLAUDE.md` (root) — general + backend + frontend rules.
2. `.claude/skills/` — detailed procedures: frontend (`api-integration`, `component-creation`,
   `form-creation`, `feature-structure`) and backend (`backend-endpoint`, `backend-exceptions`).
3. `.specs/codebase/CONVENTIONS.md` + siblings — descriptive context only; defer to `CLAUDE.md` on conflict.

## Method

- **Full review:** dispatch parallel sub-audits — one `Explore`/`general-purpose` agent per dimension
  below — each reading the relevant files in full and checking them against the cited standard.
  Consolidate into one ranked report. (Scales, and keeps each agent focused on a narrow surface.)
- **Scoped review:** run only the relevant dimensions, inline, on the named files.

## Dimensions

**Backend**
- Controllers — status codes (`201`/`204`/`200`, `HttpStatus.CREATED` not raw `201`), `@Valid` on
  bodies, param order (path → body → identity last), `PlanContext` vs `@AuthenticationPrincipal`, layer
  boundary (no business logic), constructor injection.
- Services — `@Transactional(readOnly)` for reads, ownership → not-found for privacy, `PlanAuthorization`
  for roles, typed `XxxExceptions`, pass `Long` ids (not entities) when the entity isn't needed.
- DTOs — `XxxRequestDto` Bean Validation, `XxxResponseDto` immutable from the entity, no Lombok/MapStruct,
  naming.
- Exceptions — nested in `XxxExceptions`, every one wired into `GlobalExceptionHandler` with an explicit
  status, one exception per semantic.
- Repositories/routing — plan-scoped queries, JPA Specifications for filtering, `ApiRoutes` constants
  (no inline route strings).

**Frontend**
- Components — arrow fn + named export + module-scope `type` Props, never default/`React.FC`, `cn()`/`cva`.
- Types/DTOs — `CreateXxxRequest`/`UpdateXxxRequest`, `XxxFormValues`; `XxxResponse` = wire shape (may
  differ from the entity; belongs in the service layer); `type` over `interface` for props; no `any`/
  `@ts-ignore`/forced `as`.
- Service hooks — raw fn + `useXxx` wrapper, query key `["entity", params]`, `buildMutationOptions`,
  `invalidateQueries` on list-affecting mutations, components never call the HTTP client directly.
- Forms — react-hook-form + zod, module-scope schema/type, container by complexity.
- Imports — `@/` cross-folder, relative within a feature.

## Output

One consolidated report, findings ranked:

- **Clear violation** — unambiguously contradicts a written rule. Cite `file:line` + the rule.
- **Judgment call** — plausibly justified; worth a second look. Cite `file:line` + why.
- **Undocumented — needs a decision** — inconsistent code with no governing rule; surface as a question,
  not a verdict.

Each finding: `file:line`, what's wrong, and what the standard says (or that it's silent). Note which
dimensions were checked clean, so the report shows coverage, not just hits.
