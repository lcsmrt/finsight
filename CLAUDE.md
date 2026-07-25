# finSight

Personal-finance app: Spring Boot API (`finsight-backend`) + React/TS SPA (`finsight-frontend`).

> Prescriptive write-time standards. Detailed procedures live in the skills; descriptive maps in
> `.specs/codebase/`. This file overrides inference — if a rule is missing, ask rather than infer.
> Lives at the monorepo root and governs both apps.

---

## General

- **English only** — code, UI, comments, specs. Never leak Portuguese into artifacts.
- Follow the written standard; if a rule is missing, **ask — don't infer**.
- Research how it's usually solved before reinventing; prefer established patterns.
- Consistency and clarity over cleverness. No premature abstraction, no junk.

---

## Backend (`finsight-backend`)

- Layered: **controller → service → repository**. Controller resolves identity, delegates one call,
  wraps in a response DTO — no business logic.
- Status: `201` create, `204` delete, `200` read/update (`HttpStatus.CREATED`, not raw `201`).
- Identity: `PlanContext` for plan-scoped endpoints, `@AuthenticationPrincipal` otherwise. `@Valid` on
  every body.
- Services: `@Transactional` (`readOnly` for reads). Ownership mismatch → **not-found (privacy)**, not
  403. Roles via `PlanAuthorization`. Throw typed `XxxExceptions`.
- DTOs (**no Lombok, no MapStruct**): `XxxRequestDto` with Bean Validation; `XxxResponseDto` immutable,
  built from the entity; map by hand.
- Exceptions: nested in `XxxExceptions`, one per semantic, each mapped in `GlobalExceptionHandler` with an
  explicit status. Error bodies use RFC 7807 `ProblemDetail` (own `type` URIs, field errors under an
  `errors` extension). _finsight migration pending — see `.specs/quick/error-contract-problemdetail-migration.md`._
- Constructor injection only (no field `@Autowired`). Routes as `ApiRoutes` constants. All user-data
  queries plan-scoped.
- Tests: unit `*Test` / integration `*IT` — see `.specs/codebase/TESTING.md`.
- Skills: `/backend-endpoint`, `/backend-exceptions`.

---

## Frontend (`finsight-frontend`)

React + TS, feature-oriented. Detailed procedures live in the frontend skills. Essentials:

- Components: `export const Foo = (props: FooProps) => {}` — arrow, named export, module-scope `type`
  props. Never default export, never `React.FC`. `cn()` for classNames, `cva` for variants. Don't modify
  shadcn primitives; shared components (`src/components/`) are presentational (no data hooks).
- Strict TS: avoid `any`, `@ts-ignore`, forced `as`. `type` over `interface` for props.
- Naming: files `PascalCase.tsx` / `useXxx.ts`; request types `CreateXxxRequest`/`UpdateXxxRequest`;
  form types `XxxFormValues`; props `<Component>Props`. `XxxResponse` = API wire shape (may differ from
  the entity; keep it in the service layer).
- Data: axios + TanStack Query via **service hooks** in `src/api/services/` (raw fn + `useXxx` wrapper).
  Components never call the HTTP client. Query key `["entity", params]`; mutations via
  `buildMutationOptions` + `invalidateQueries`.
- Forms: react-hook-form + zod. Container by complexity: Sheet / Page / Dialog / Popover.
- Imports: `@/` cross-folder, relative within a feature.
- Skills: `/component-creation`, `/form-creation`, `/api-integration`, `/feature-structure`.
