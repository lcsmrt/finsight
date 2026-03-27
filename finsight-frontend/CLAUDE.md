# finSight Frontend

React + TypeScript SPA for personal finance management. Feature-oriented architecture.

---

## Project Structure

```
src/
  api/          HTTP client, DTOs, TanStack Query service hooks, shared API utilities
  app/          App bootstrap (providers, router, App.tsx)
  components/   Shared UI primitives and composites (reused across 2+ features)
  features/     Feature modules (pages, components, hooks — feature-specific)
  hooks/        Global reusable hooks
  lib/          Shared logic (cn, auth, storage)
  utils/        Pure utility functions (formatters, masks)
```

Typical feature layout:
```
features/home/
  components/   Feature-level components (may call data hooks)
  hooks/        Feature-level custom hooks
  HomePage.tsx  Page component
```

---

## Component Rules

- **Always** `export const Foo = (...) => {}` — arrow function, named export, never default
- **Always** a named `type FooProps = { ... }` at module scope above the component
- **Never** `React.FC`, `React.FunctionComponent`, or inline prop types
- `className` accepted and merged via `cn()` whenever the component renders a root element
- `cn()` from `@/lib/mergeClasses` — never string concatenation or template literals
- Style variants use `cva` + `VariantProps` from `class-variance-authority`
- **Do not** modify or replicate shadcn primitives in `src/components/` (Button, Input, Dialog, Sheet, Popover, etc.)
- Shared components (`src/components/`) are purely presentational — no data hooks
- Feature components (`features/<name>/components/`) may call data hooks directly

---

## UI Container Patterns

| Container  | When to use                                                     |
| ---------- | --------------------------------------------------------------- |
| **Sheet**  | Create/edit forms with simple to moderate fields                |
| **Page**   | Create/edit forms with many fields, nested data, complex flow   |
| **Dialog** | Confirmations and small auxiliary actions — not for CRUD forms  |
| **Popover** | Anchored contextual overlays (filter panels, date pickers, etc.) |

---

## Hook Extraction

Extract component logic into a hook when:
- The same state + effects + handlers appear in more than one component
- The component body is long enough that the logic obscures the JSX

Keep inline when:
- Used in only one component
- Trivial enough that a hook adds more indirection than clarity

---

## TypeScript

- Strict typing required — avoid `any`, `@ts-ignore`, forced `as T` assertions
- Prefer type aliases (`type`) over interfaces for component props
- Use generics (`T`, `TData`, `TFilters`) for reusable utilities
- Never bypass TypeScript errors without explaining why

---

## Naming Conventions

| Thing               | Convention                                    |
| ------------------- | --------------------------------------------- |
| Component files     | `PascalCase.tsx` — e.g. `SectionHeader.tsx`   |
| Page files          | `PascalCasePage.tsx` — e.g. `HomePage.tsx`    |
| Hook files          | `useXxx.ts` — e.g. `useTransactionFilters.ts` |
| Service hook files  | `useXxxService.ts`                            |
| Utility files       | `camelCase.ts` — e.g. `buildPagedQuery.ts`    |
| Props types         | `<ComponentName>Props`                        |
| Request types       | `CreateXxxRequest`, `UpdateXxxRequest`        |
| Form value types    | `XxxFormValues`                               |

---

## Import Paths

Use `@/` for all cross-feature and cross-folder imports:
```ts
import { cn } from "@/lib/mergeClasses";
import { Button } from "@/components/button/Button";
import { formatCurrency } from "@/utils/formatters";
```

Use relative imports only within the same feature.

---

## Data Fetching

- API client and DTOs live in `src/api/`
- Service hooks (`useGetXxx`, `useCreateXxx`, etc.) live in `src/api/services/`
- Components never call `finsightApi` directly — always through service hooks
- Wrap TanStack Query calls in named hooks, never inline in components
- Query key format: `["entityName", params]`
- Mutations use `buildMutationOptions` for toast handling

---

## Code Quality

- No comments except JSDoc; when code is clean, comments are not needed
- No unnecessary abstractions or premature helpers
- No large components — extract hooks or sub-components when things grow
- Comments written in Brazilian Portuguese when needed (JSDoc only)

---

## Available Skills

- `/component-creation` — create React components following project conventions
- `/form-creation` — create forms with react-hook-form + zod
- `/api-integration` — create TanStack Query hooks and API integrations
- `/feature-structure` — plan folder layout for a new feature
