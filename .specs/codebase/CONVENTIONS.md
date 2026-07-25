# Code Conventions

Two codebases with distinct but internally-consistent conventions. Frontend conventions are codified in `frontend/CLAUDE.md` and the `.claude/skills/` frontend skills (`api-integration`, `component-creation`, `feature-structure`, `form-creation`) as source of truth; backend conventions are inferred from the source.

## Naming Conventions

**Frontend files:**

- Components: `PascalCase.tsx` — `SectionHeader.tsx`, `Field.tsx`
- Pages: `PascalCasePage.tsx` — `HomePage.tsx`, `LoginPage.tsx`
- Hooks: `useXxx.ts` — `useTransactionFilters.ts`, `useDebounce.ts`
- Service hooks: `useXxxService.ts` — `useFinancialTransactionService.ts`
- Utilities: `camelCase.ts` — `buildPagedQuery.ts`, `mergeClasses.ts`

**Frontend components:** always `export const Foo = (props: FooProps) => {}` — arrow function, named export, **never** default. A named `type FooProps = {...}` sits at module scope above the component. Never `React.FC`, `React.FunctionComponent`, or inline prop types. Props type is `<ComponentName>Props`.

**Frontend types:** Request types `CreateXxxRequest` / `UpdateXxxRequest`; form value types `XxxFormValues`; entity types plain PascalCase (`FinancialTransaction`).

**Backend files/classes:** PascalCase classes suffixed by role — `XxxController`, `XxxService`, `XxxRepository`. Entities in `models/` are unsuffixed (`FinancialTransaction`, `User`); enums too (`FinancialTransactionType`). DTOs suffixed `Dto` in `dtos/request` (`FinancialTransactionRequestDto`, `FinancialTransactionFilterDto`) and `dtos/response` (`FinancialTransactionResponseDto`).

**Backend methods/fields:** camelCase (`findAllByUserPaged`, `financialTransactionRepository`). Route constants UPPER_SNAKE in `utils/ApiRoutes.java` (`FINANCIAL_TRANSACTION`), all built from a `BASE` constant.

## Code Organization

**Frontend imports:** Use `@/` for all cross-folder/cross-feature imports; relative (`./`, `../`) only within the same feature or module. Example from `Field.tsx`:

```ts
import { Label } from "@/components/input/base/Label";
import { cn } from "@/lib/mergeClasses";
import { cva, type VariantProps } from "class-variance-authority";
```

Components never call `finsightApi` directly — always through a service hook in `src/api/services/`. Service hooks split each operation into a raw async function (HTTP only) plus an exported `useGetXxx` / `useCreateXxx` hook wrapping it.

**Backend imports:** grouped project imports then framework/`jakarta` imports. Dependencies injected via constructor (no field `@Autowired`, no Lombok). Layer boundary is strict: controller resolves the logged-in `User`, delegates to service, wraps the result in a response DTO.

**Frontend styling:** `className` accepted and merged via `cn()` from `@/lib/mergeClasses` whenever a component renders a root element — never string concatenation or template literals. Visual variants use `cva` + `VariantProps` from `class-variance-authority` (see `fieldVariants` in `Field.tsx`). Shared shadcn primitives in `src/components/` are not modified or replicated.

## Type Safety / Documentation

**Frontend:** Strict TypeScript. Avoid `any`, `@ts-ignore`, and forced `as T` assertions; never bypass a TS error without explaining why. Prefer `type` aliases over interfaces for props. zod schema + inferred type (`z.infer`) at module scope for forms. Multi-mode overlays modeled as discriminated unions to make invalid states unrepresentable.

**Backend:** Plain Java — no Lombok, no MapStruct. Entities are mutable POJOs with hand-written getters/setters; response DTOs are immutable (`final` fields set in a constructor taking the entity, e.g. `new FinancialTransactionResponseDto(transaction)`). Mapping entity ↔ DTO is done manually. Bean Validation annotations (`@NotNull`, `@NotBlank`) on request DTOs, enforced by `@Valid` at the controller.

## Error Handling

**Backend:** Centralized in `exceptions/GlobalExceptionHandler` (`@ControllerAdvice extends ResponseEntityExceptionHandler`). Validation failures → `ErrorResponseDto` with per-field `FieldErrorDto` list (400); `BadCredentialsException` → 401. Domain errors thrown as nested typed exceptions (e.g. `FinancialTransactionExceptions.FinancialTransactionNotFoundException`). Services enforce ownership by throwing not-found when a record's user id differs from the logged-in user. `@Transactional` on service methods (`readOnly = true` for reads).

**Frontend:** Mutation success/error toasts handled centrally by `buildMutationOptions` inside service hooks; per-call overrides (`showSuccessToast`, `onSuccess`) supported. List-affecting mutations call `queryClient.invalidateQueries({ queryKey: ["financialTransactions"] })` in `onSuccess`. Conditional queries use `enabled`, not `useEffect`.

## Forms (Frontend)

react-hook-form + zod + `@hookform/resolvers/zod`. Schema and inferred `XxxFormValues` type at module scope. Field layout uses `Field` / `FieldGroup` / `FieldLabel` / `FieldError` from `@/components/input/base/Field`. Native inputs spread `register()`; controlled inputs use `watch()` + `setValue()`. Container chosen by complexity: **Sheet** (simple/moderate create-edit), **Page** (complex), **Dialog** (confirm/auxiliary), **Popover** (filter/pickers). Multi-operation forms take a **required** `mode` prop (`"create" | "edit" | "duplicate"`); UI labels derived from it, never inferred from entity presence. Form values mapped to the API body via a `toPayload` helper; entity → form via `buildDefaultValues`.

## API Hooks (Frontend)

Live **globally** in `src/api/services/` (one `useXxxService.ts` per domain), not inside features. Query key format `["entityName", params]` — always an array, single item as `["entity", id]`. Mutations built with `buildMutationOptions`. Paginated GETs use `buildPagedQuery` to serialize `PagedRequest`.

## Comments / Documentation

Frontend: no comments except JSDoc — clean code is expected to be self-documenting; comments (JSDoc) written in English. No premature abstractions or helpers; extract hooks/sub-components only on real reuse or genuine readability gain. Backend: minimal comments; Swagger `@Operation` / `@Tag` annotations document endpoints instead of prose.
