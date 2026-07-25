---
name: form-creation
description: Create a form component in a React frontend using react-hook-form + zod + @hookform/resolvers/zod. Covers module-scope schema/type inference, buildDefaultValues, native vs controlled vs masked input binding, a Field/FieldGroup/FieldLabel/FieldError layout, edit-mode reset, a required explicit mode prop, and submit with a toPayload mapper. Use when building or editing any form — a create/edit drawer, a login/register form, or a validated input flow. Triggers on "create a form", "form component", "react-hook-form", "zod schema", "zodResolver", "form validation", "form drawer", "edit form", "submit handler".
metadata:
  type: reference
---

# Form Creation

Forms use **react-hook-form** + **zod** + **@hookform/resolvers/zod**.
Field layout uses `Field`, `FieldGroup`, `FieldLabel`, `FieldError` components.
Forms live inside a **Dialog** (small/simple), **Sheet** (moderate), or **Page** (complex, nested
data) — pick by form size and complexity, not by whether the action is create/edit. See
`component-creation`'s UI Container Choice section for the full guidance.

---

## Schema

Define a zod schema and infer the TypeScript type from it at module scope:

```tsx
import { z } from "zod";

const productFormSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  name: z.string().min(1, "Required"),
  price: z.string().min(1, "Required"),
  date: z.date({ required_error: "Required" }),
  category: z.object({ id: z.number(), name: z.string() }).nullable().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;
```

Keep schema and type in the same file as the form unless reused elsewhere.
(`z.date({ required_error })` is the zod v3 API; on zod v4 use `z.date({ error })`.)

---

## Form Setup

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export const ProductFormDrawer = ({ open, onOpenChange, product }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: buildDefaultValues(product),
  });
  // ...
};
```

Use a `buildDefaultValues` helper when mapping entity → form state is non-trivial:

```tsx
function buildDefaultValues(product?: Product): Partial<ProductFormValues> {
  if (!product) return { status: "ACTIVE" };
  return {
    status: product.status,
    name: product.name,
    price: String(product.price),
    date: parseISO(product.date),
    category: product.category ?? null,
  };
}
```

---

## Input Binding

**Native inputs** — spread `register()` directly:
```tsx
<Input {...register("name")} aria-invalid={!!errors.name} />
```

**Custom/controlled inputs** — use `watch()` + `setValue()`:
```tsx
<DatePicker
  value={watch("date")}
  onChange={(date) => setValue("date", date, { shouldValidate: true })}
/>
<StandardCombobox
  value={watch("category")}
  onValueChange={(v) => setValue("category", v, { shouldValidate: true })}
  items={categories}
  itemLabel={(c) => c.name}
/>
```

**Masked inputs** — destructure register, intercept onChange:
```tsx
const { onChange, ...priceRest } = register("price");
<Input
  {...priceRest}
  onChange={(e) => {
    e.target.value = maskCurrency(e.target.value);
    onChange(e);
  }}
/>
```

---

## Field Layout

```tsx
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/input/base/Field";

<FieldGroup>
  <Field>
    <FieldLabel>Name</FieldLabel>
    <Input {...register("name")} aria-invalid={!!errors.name} />
    <FieldError errors={[errors.name]} />
  </Field>
  <Field>
    <FieldLabel>Price</FieldLabel>
    <Input {/* masked binding */} aria-invalid={!!errors.price} />
    <FieldError errors={[errors.price]} />
  </Field>
</FieldGroup>
```

---

## Edit Mode

Reset the form whenever the entity or the open state changes:

```tsx
useEffect(() => {
  reset(buildDefaultValues(product));
}, [product, open, reset]);
```

The `open` dependency ensures the form resets to a clean state on every open, not just when the entity changes.

---

## Modes

When a form drawer supports multiple operations (create / edit / duplicate), accept an explicit `mode` prop — required, never optional. Derive all UI labels from it; never infer mode from the presence of an entity prop.

```tsx
type ProductFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  mode: "create" | "edit" | "duplicate";
};

const isEditing = mode === "edit";

const title =
  mode === "edit"
    ? "Edit Product"
    : mode === "duplicate"
      ? "Duplicate Product"
      : "New Product";

const submitLabel = mode === "edit" ? "Save" : "Create";
```

**Why required:** an optional `mode?` allows callers to omit it, silently falling back to create behavior when editing — TypeScript won't catch the bug.

**Why derive labels:** avoids dead branches where a mode is accepted but never differentiated in the UI.

---

## Submit

**Simple** — inline `onSubmit` for sheet/dialog forms:

```tsx
const createMutation = useCreateProduct({
  onSuccess: () => { onOpenChange(false); reset(); },
});
const updateMutation = useUpdateProduct({
  onSuccess: () => { onOpenChange(false); },
});

const onSubmit = (values: ProductFormValues) => {
  if (isEditing) {
    updateMutation.mutate({ params: { id: product!.id }, body: toPayload(values) });
  } else {
    createMutation.mutate({ body: toPayload(values) });
  }
};

// In JSX:
<Button onClick={handleSubmit(onSubmit)} disabled={isPending}>Save</Button>
```

**Complex** — extract a `useXxxFormSubmit` hook when the submit involves multiple mutations, multi-step logic, or significant branching.

Use a `toPayload` helper to map form values → API request body:

```tsx
function toPayload(values: ProductFormValues): CreateProductRequest["body"] {
  return {
    status: values.status,
    name: values.name,
    price: parseCurrencyToNumber(values.price),
    categoryId: values.category?.id,
  };
}
```

---

## Mutation Toasts

A `buildMutationOptions` helper (used inside service hooks) handles success/error toasts automatically. Override per-call only when needed:

```tsx
const mutation = useCreateEntity({
  showSuccessToast: false,   // suppress if handling manually
  onSuccess: (data) => { /* custom behavior */ },
});
```
