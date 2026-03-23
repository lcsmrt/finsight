Use this skill to propose a structure for a new React web feature: $ARGUMENTS

Read `.github/skills/feature-structure/SKILL.md` and its reference files for the full rules, then apply them.

Keep the feature small and cohesive.
Do not over-engineer.
Do not create folders that are not needed.

## Folder roles

- `pages/`: route-level pages and page-specific components
- `components/`: UI components used only by this feature
- `hooks/`: feature-specific logic hooks
- `api/`: DTOs and service hooks for this feature's API calls
- `utils/`: pure helper functions used only by this feature
- `mock/`: mock data or fixtures (optional — only when needed during development)

## Core rules

- keep code inside the feature by default
- move to shared `src/*` only after real reuse across multiple features
- if something has domain language in its name, it probably stays inside the feature
- a feature may have one or many pages
- do not split into multiple features only because one page navigates to another
- related features should be grouped under a module folder

## Feature complexity levels

| Level         | Folders                           | Examples                  |
| ------------- | --------------------------------- | ------------------------- |
| Minimal       | `pages/`                          | auth, permissions         |
| Standard      | `pages/` + `components/` + `api/` | role, client, environment |
| Enhanced      | Standard + `hooks/`               | user, checklist           |
| Comprehensive | Enhanced + `utils/`               | dashboard                 |

Do not start at Comprehensive. Start at the appropriate level and grow only when needed.

## Expected output

1. propose the smallest valid feature tree
2. explain which folders are needed
3. do not add unnecessary folders
4. keep feature-specific code local
5. call out anything that should move to shared `src/*` only if reuse is clear
6. export pages from `index.ts` for easy routing imports
