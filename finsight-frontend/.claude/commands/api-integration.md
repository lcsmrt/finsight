Use this skill to create or modify API integrations: $ARGUMENTS

Read `.github/skills/api-integration/SKILL.md` and its reference files for the full patterns, then apply them.

This project integrates backend APIs using **TanStack Query wrapped in custom hooks**.

## Architecture Overview

All API communication follows this structure:

1. **API functions**
   - Responsible only for performing HTTP requests.
   - Located in `src/api/clients`.

2. **React Query hooks**
   - Wrap API functions.
   - Provide caching, invalidation, and configuration.
   - Located inside the feature: `features/<name>/api/services/useXxxService.ts`
   - Only hooks reused across multiple features go in `src/hooks`

3. **Components**
   - Must **only use hooks**
   - Must **never call `apiClient` directly**

## Reference files

- **Types** — `QueryOptions<T>`, `MutationOptions`, `ApiRequestParams`, `ApiPaginatedResponse`. See `.github/skills/api-integration/references/types.md`.

- **Rules** — architectural constraints, folder structure, query key guidelines. See `.github/skills/api-integration/references/rules.md`.

- **Query patterns** — basic, parameterized, paginated queries, `enabled` usage. See `.github/skills/api-integration/references/query-patterns.md`.

- **Mutation patterns** — mutation structure, query invalidation, error toasts, `showToast` opt-out. See `.github/skills/api-integration/references/mutation-patterns.md`.

- **Query keys** — query key conventions. See `.github/skills/api-integration/references/query-keys.md`.

## When to use

- Implementing a **new API integration**
- Creating **React Query hooks**
- Adding **queries or mutations**
- Implementing **paginated data fetching**
- Refactoring existing API calls to match the project architecture
- Ensuring **consistent TanStack Query usage**

Always read the reference files before introducing custom variations.
