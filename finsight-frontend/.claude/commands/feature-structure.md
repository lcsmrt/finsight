Propose a folder structure for a new feature: $ARGUMENTS

Keep the feature small and cohesive. Do not over-engineer. Do not create folders that don't have content yet.

---

## Folder Roles

| Folder        | What goes here                                              |
| ------------- | ----------------------------------------------------------- |
| `components/` | UI components used only within this feature                 |
| `hooks/`      | Feature-specific logic hooks (state, effects, handlers)     |
| `utils/`      | Pure helper functions used only by this feature             |

For simple features, there may be no subfolders at all — just a `FeaturePage.tsx` at the root.

Note: In finSight, the current `home` feature keeps everything flat (`HomePage.tsx` + `components/`). API service hooks live in `src/api/services/` globally, not inside each feature.

---

## Core Rules

- Keep code inside the feature by default
- Move to `src/components/`, `src/hooks/`, etc. only after real reuse across 2+ features
- If something has domain language in its name, it stays inside the feature
- A feature can have one or many pages; don't split just because pages link to each other
- Group related features under a module folder when they share domain context

---

## Complexity Levels

| Level         | Structure                         | When                                                 |
| ------------- | --------------------------------- | ---------------------------------------------------- |
| Minimal       | `FeaturePage.tsx` only            | Single page, no sub-components, no custom hooks      |
| Standard      | + `components/`                   | Page needs sub-components                            |
| Enhanced      | + `hooks/`                        | Page has enough logic to warrant extraction          |
| Comprehensive | + `utils/`                        | Needs pure helpers not appropriate for a hook        |

Start at the smallest level that fits. Grow only when needed.

---

## Expected Output

1. Propose the smallest valid folder tree for the feature
2. Explain why each folder is included
3. Identify anything that belongs in shared `src/` (only if reuse is certain)
4. Export the page(s) from an `index.ts` for clean routing imports
