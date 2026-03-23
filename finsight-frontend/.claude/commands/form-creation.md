Use this skill to create or modify a form: $ARGUMENTS

Read `.github/skills/form-creation/SKILL.md` and its reference files for the full patterns, then apply them.

This project builds forms using **react-hook-form** with **zod** schema validation and **@hookform/resolvers**.

## Stack

| Library                   | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `react-hook-form`         | Form state, registration, validation triggers |
| `zod`                     | Schema definition and type inference          |
| `@hookform/resolvers/zod` | Connects zod schema to react-hook-form        |

## Architecture Overview

1. **Schema** — defined at module scope with `z.object()`. Type inferred via `z.infer<>`. Default values constant alongside. See `.github/skills/form-creation/references/schema.md`.

2. **Anatomy** — forms use the `Field`, `FieldLabel`, `FieldError`, `FieldGroup` base components for layout. Error display and submit button state follow a consistent pattern. See `.github/skills/form-creation/references/anatomy.md`.

3. **Input binding** — native inputs use `register()`. Custom inputs (combobox, date picker, checkbox) use `watch()` + `setValue()`. See `.github/skills/form-creation/references/input-binding.md`.

4. **Edit mode** — populate the form from remote data using a `useEffect` with `reset()`. See `.github/skills/form-creation/references/edit-mode.md`.

5. **Submit** — two escalating patterns:
   - **Simple** (sheet/dialog form): inline `onSubmit` calling `mutateAsync` directly
   - **Complex** (full page, multi-mutation): extracted `useXxxFormSubmit` hook
   See `.github/skills/form-creation/references/submit-patterns.md`.

## When to use

- Creating a new **form component** (sheet, dialog, or page)
- Adding fields to an existing form
- Implementing **edit mode** for an existing entity
- Extracting a submit hook for complex multi-mutation flows
- Ensuring consistent form patterns across features

Always read the reference files before introducing custom variations.
