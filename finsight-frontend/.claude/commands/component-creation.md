Use this skill to create or modify a React component: $ARGUMENTS

Read `.github/skills/component-creation/SKILL.md` and its reference files for the full patterns, then apply them.

This project builds components as **named arrow function exports** with **typed props** and **`cn`-based className merging**.

The base UI primitives (buttons, inputs, dialogs, etc.) come from shadcn/ui — do not modify or replicate their conventions. This skill covers **custom components** created for the application.

## Two scopes

| Scope         | Location                      | Purpose                                                |
| ------------- | ----------------------------- | ------------------------------------------------------ |
| Shared        | `src/components/`             | Reused across 2+ features, purely presentational       |
| Feature-level | `features/<name>/components/` | Used only within a single feature, may call data hooks |

## Architecture Overview

1. **Anatomy** — props type, arrow function, inline named export, `cn` merging. See `.github/skills/component-creation/references/anatomy.md`.

2. **Variants** — style variants with `cva` and `VariantProps`. See `.github/skills/component-creation/references/variants.md`.

3. **Compound patterns** — static siblings for structural composition; context-based for shared state. See `.github/skills/component-creation/references/compound-patterns.md`.

4. **Feature components** — can call data hooks; props stay inside the feature. See `.github/skills/component-creation/references/feature-components.md`.

## When to use

- Creating a new **shared UI component** in `src/components/`
- Creating a new **feature component** in `features/<name>/components/`
- Adding **style variants** to an existing component
- Composing a **compound component** (e.g. card with header/body/footer)
- Deciding whether a component should be shared or stay inside a feature

Always read the reference files before introducing custom variations.
