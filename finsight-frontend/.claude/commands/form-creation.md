Create a form component: $ARGUMENTS

Forms use **react-hook-form** + **zod** + **@hookform/resolvers/zod**.
Field layout uses the project's `Field`, `FieldGroup`, `FieldLabel`, `FieldError` components.
Forms live inside a **Sheet** (create/edit), **Dialog** (small auxiliary), or **Page** (complex).

---

## Schema

Define a zod schema and infer the TypeScript type from it at module scope:

```tsx
import { z } from "zod";

const transactionFormSchema = z.object({
  type: z.enum(["DEBIT", "CREDIT"]),
  description: z.string().min(1, "Obrigatório"),
  amount: z.string().min(1, "Obrigatório"),
  date: z.date({ required_error: "Obrigatório" }),
  category: z.object({ id: z.number(), description: z.string() }).nullable().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;
```

Keep schema and type in the same file as the form unless reused elsewhere.

---

## Form Setup

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export const TransactionFormDrawer = ({ open, onOpenChange, transaction }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: buildDefaultValues(transaction),
  });
  // ...
};
```

Use a `buildDefaultValues` helper when mapping entity → form state is non-trivial:

```tsx
function buildDefaultValues(transaction?: FinancialTransaction): Partial<TransactionFormValues> {
  if (!transaction) return { type: "DEBIT" };
  return {
    type: transaction.type,
    description: transaction.description,
    amount: String(transaction.amount),
    date: parseISO(transaction.startDate),
    category: transaction.category ?? null,
  };
}
```

---

## Input Binding

**Native inputs** — spread `register()` directly:
```tsx
<Input {...register("description")} aria-invalid={!!errors.description} />
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
  itemLabel={(c) => c.description}
/>
```

**Masked inputs** — destructure register, intercept onChange:
```tsx
const { onChange, ...amountRest } = register("amount");
<Input
  {...amountRest}
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
    <FieldLabel>Description</FieldLabel>
    <Input {...register("description")} aria-invalid={!!errors.description} />
    <FieldError errors={[errors.description]} />
  </Field>
  <Field>
    <FieldLabel>Amount</FieldLabel>
    <Input {/* masked binding */} aria-invalid={!!errors.amount} />
    <FieldError errors={[errors.amount]} />
  </Field>
</FieldGroup>
```

---

## Edit Mode

Reset the form whenever the entity or the open state changes:

```tsx
useEffect(() => {
  reset(buildDefaultValues(transaction));
}, [transaction, open, reset]);
```

The `open` dependency ensures the form resets to a clean state on every open, not just when the entity changes.

---

## Submit

**Simple** — inline `onSubmit` for sheet/dialog forms:

```tsx
const createMutation = useCreateFinancialTransaction({
  onSuccess: () => { onOpenChange(false); reset(); },
});
const updateMutation = useUpdateFinancialTransaction({
  onSuccess: () => { onOpenChange(false); },
});

const onSubmit = (values: TransactionFormValues) => {
  if (transaction) {
    updateMutation.mutate({ params: { id: transaction.id }, body: toPayload(values) });
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
function toPayload(values: TransactionFormValues): CreateFinancialTransactionRequest["body"] {
  return {
    type: values.type,
    description: values.description,
    amount: parseCurrencyToNumber(values.amount),
    categoryId: values.category?.id,
    startDate: format(values.date, "yyyy-MM-dd"),
  };
}
```

---

## Mutation Toasts

`buildMutationOptions` (used inside service hooks) handles success/error toasts automatically. Override per-call only when needed:

```tsx
const mutation = useCreateEntity({
  showSuccessToast: false,   // suppress if handling manually
  onSuccess: (data) => { /* custom behavior */ },
});
```
