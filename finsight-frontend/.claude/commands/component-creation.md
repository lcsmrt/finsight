Create or modify a React component: $ARGUMENTS

---

## Anatomy

Every custom component follows this exact structure:

```tsx
import { cn } from "@/lib/mergeClasses";

type StatusBadgeProps = {
  label: string;
  active: boolean;
  className?: string;
};

export const StatusBadge = ({ label, active, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
};
```

**Non-negotiable rules:**
- `export const Foo = (...) => {}` — arrow function, named export, always
- `type FooProps = { ... }` — named type alias at module scope, above the component
- Never `React.FC`, `React.FunctionComponent`, or inline prop types (`({ label }: { label: string })`)
- No default exports
- `className` accepted and forwarded via `cn()` whenever the component renders a root element
- `cn()` from `@/lib/mergeClasses` — never string concatenation or template literals

---

## Scopes

| Scope         | Location                      | Rule                                                    |
| ------------- | ----------------------------- | ------------------------------------------------------- |
| Shared        | `src/components/`             | Purely presentational. Never calls data hooks.          |
| Feature-level | `features/<name>/components/` | Used within one feature. May call data hooks directly.  |

Move a feature component to `src/components/` only when it is actually reused in 2+ different features AND has no feature-specific domain types in its props.

Do not modify or replicate the existing shadcn primitives in `src/components/` (Button, Input, Dialog, Sheet, Popover, Select, Badge, etc.).

---

## Style Variants

When a component needs visual variants, use `cva` + `VariantProps`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/mergeClasses";

const alertVariants = cva("rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-background",
      destructive: "border-destructive/50 bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

export const Alert = ({ className, variant, ...props }: AlertProps) => (
  <div className={cn(alertVariants({ variant }), className)} {...props} />
);
```

---

## Compound Components

**Static siblings** — when sub-parts don't share state (structural composition only):

```tsx
type CardProps = React.ComponentProps<"div">;
type CardContentProps = React.ComponentProps<"div">;

export const Card = ({ className, ...props }: CardProps) => (
  <div className={cn("rounded-lg border bg-card p-4", className)} {...props} />
);

export const CardContent = ({ className, ...props }: CardContentProps) => (
  <div className={cn("pt-2", className)} {...props} />
);
```

**Context-based** — when children need data from the root (escalate only when necessary):

```tsx
import { createContext, useContext, type ReactNode } from "react";

type TableContextType = { selectedIds: number[]; onToggle: (id: number) => void };
const TableContext = createContext<TableContextType | null>(null);

export const useTable = () => {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("useTable deve ser usado dentro de Table");
  return ctx;
};

export const Table = ({ children, selectedIds, onToggle }: TableProps) => (
  <TableContext.Provider value={{ selectedIds, onToggle }}>
    {children}
  </TableContext.Provider>
);
```

Rules: context initialized to `null`, guarded with a throw, hook exported alongside root, sub-parts as individual named exports (not `Table.Row`).

---

## Feature Components — Hook Extraction

Feature components may call TanStack Query and mutation hooks directly:

```tsx
export const UserCard = ({ userId }: UserCardProps) => {
  const { data: user } = useGetUserById(userId);
  const { mutate: updateUser } = useUpdateUser();
  // ...
};
```

**Extract to a hook when:**
- The same state + effects + handlers appear in more than one component
- The component body is large enough that logic obscures the JSX structure

**Keep inline when:**
- Used in only this component
- Trivial enough that extraction adds indirection without clarity

```tsx
// Extract — clear inputs/outputs, could be reused
const { filters, chips, pagination, queryParams } = useTransactionFilters();

// Keep inline — trivial, one-off
const [isOpen, setIsOpen] = useState(false);
```

---

## Feature Components — Sub-component Extraction

Extracting a piece of JSX into its own component within a feature is a different decision from hook extraction.

**Extract to a sub-component when:**
- The same markup appears in more than one place within the feature
- The component body is long enough that the visual structure becomes hard to follow

**Keep inline when:**
- Used in exactly one place
- Would require passing many props just for that one usage (high coupling, no reuse benefit)
- The extraction adds a file and indirection without making the parent clearer

The cost of a premature sub-component is real: more files, prop drilling, and a reader who must jump between files to understand one feature. The benefit only materialises when there is actual reuse or genuine readability gain.

Moving a feature sub-component to `src/components/` follows the same rule as always: only when reused across 2+ features AND props contain no feature-specific domain types.

---

## Multi-Mode Overlay State

When a Sheet/Dialog/Drawer can be opened in multiple modes (create, edit, duplicate, view…), use a **discriminated union** instead of separate `useState` calls.

**Why:** multiple related states (`isOpen`, `mode`, `editingItem`) can silently diverge — you can have `mode === "edit"` with `editingItem === undefined` and TypeScript won't complain. A union makes invalid combinations unrepresentable.

```tsx
type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit" | "duplicate"; item: Item };

const [drawerState, setDrawerState] = useState<DrawerState>({ open: false });

// Handlers are single-line — state shape enforces correctness
const handleCreate = () => setDrawerState({ open: true, mode: "create" });
const handleEdit = (item: Item) => setDrawerState({ open: true, mode: "edit", item });
const handleDuplicate = (item: Item) => setDrawerState({ open: true, mode: "duplicate", item });
```

Passing into the child component:
```tsx
<ItemFormDrawer
  open={drawerState.open}
  onOpenChange={(open) => { if (!open) setDrawerState({ open: false }); }}
  item={drawerState.open && drawerState.mode !== "create" ? drawerState.item : undefined}
  mode={drawerState.open ? drawerState.mode : "create"}
/>
```

**Use this pattern when** the overlay has 2+ modes that differ in title, submit label, initial values, or which mutations fire.

**Keep separate `useState`** when the overlay has only a single purpose (e.g., a confirm dialog that only opens/closes).

---

## UI Container Choice

Before creating a modal/overlay, pick the right container:

| Container   | When to use                                                      |
| ----------- | ---------------------------------------------------------------- |
| **Sheet**   | Create/edit forms with simple to moderate fields                 |
| **Page**    | Create/edit forms with many fields, nested data, complex flow    |
| **Dialog**  | Confirmations and small auxiliary actions — not for CRUD forms   |
| **Popover** | Anchored contextual overlays (filter panels, pickers, quick actions) |
