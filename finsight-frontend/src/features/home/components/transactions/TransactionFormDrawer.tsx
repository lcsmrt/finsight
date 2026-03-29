import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import {
  useCreateFinancialTransaction,
  useUpdateFinancialTransaction,
} from "@/api/services/useFinancialTransactionService";
import { Button } from "@/components/button/Button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/input/base/Field";
import { Input } from "@/components/input/base/Input";
import { DatePicker } from "@/components/input/DatePicker";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/sheet/Sheet";
import { maskCurrency } from "@/utils/string/masks";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { SaveIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CategoryCombobox } from "./CategoryCombobox";
import { TransactionTypeToggle } from "./TransactionTypeToggle";

const transactionFormSchema = z.object({
  type: z.enum(["DEBIT", "CREDIT"]),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length > 0 && parseInt(digits, 10) > 0;
  }, "O valor deve ser positivo"),
  category: z
    .object({
      id: z.number(),
      type: z.enum(["DEBIT", "CREDIT"]),
      description: z.string(),
      spendingLimit: z.number().nullish(),
    })
    .nullable()
    .optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinancialTransaction;
  mode?: "create" | "edit" | "duplicate";
}

function buildDefaultValues(
  transaction?: FinancialTransaction,
): TransactionFormValues {
  if (transaction) {
    return {
      type: transaction.type,
      description: transaction.description,
      amount: maskCurrency(String(Math.round(transaction.amount * 100))),
      category: transaction.category ?? null,
      date: (() => {
        const [year, month, day] = transaction.startDate
          .split("T")[0]
          .split("-")
          .map(Number);
        return new Date(year, month - 1, day);
      })(),
    };
  }
  return {
    type: "DEBIT",
    description: "",
    amount: "",
    category: null,
    date: new Date(),
  };
}

export const TransactionFormDrawer = ({
  open,
  onOpenChange,
  transaction,
  mode,
}: TransactionFormDrawerProps) => {
  const isEditing = !!transaction && mode === "edit";

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

  useEffect(() => {
    reset(buildDefaultValues(transaction));
  }, [transaction, open, reset]);

  const {
    mutate: createFinancialTransaction,
    isPending: isCreatingFinancialTransaction,
  } = useCreateFinancialTransaction({
    onSuccess: () => onOpenChange(false),
  });

  const {
    mutate: updateFinancialTransaction,
    isPending: isUpdatingFinancialTransaction,
  } = useUpdateFinancialTransaction({
    onSuccess: () => onOpenChange(false),
  });

  const isPending =
    isCreatingFinancialTransaction || isUpdatingFinancialTransaction;

  const onSubmit = (values: TransactionFormValues) => {
    const startDate = format(values.date, "yyyy-MM-dd");
    const amount = parseInt(values.amount.replace(/\D/g, ""), 10) / 100;
    const body = {
      type: values.type,
      description: values.description,
      amount,
      categoryId: values.category?.id,
      startDate,
    };

    if (isEditing) {
      updateFinancialTransaction({ params: { id: transaction.id }, body });
    } else {
      createFinancialTransaction({ body });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-2"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="transaction-type">Type</FieldLabel>
              <TransactionTypeToggle
                value={watch("type")}
                onChange={(v) => {
                  setValue("type", v);
                  setValue("category", null);
                }}
                disabled={isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="transaction-description">
                Description
              </FieldLabel>
              <Input
                id="transaction-description"
                placeholder="e.g., Rent, Salary, Groceries"
                disabled={isPending}
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="transaction-amount">Amount</FieldLabel>
              {(() => {
                const { onChange, ...amountRest } = register("amount");
                return (
                  <Input
                    id="transaction-amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    disabled={isPending}
                    aria-invalid={!!errors.amount}
                    {...amountRest}
                    onChange={(e) => {
                      e.target.value = maskCurrency(e.target.value);
                      onChange(e);
                    }}
                  />
                );
              })()}
              <FieldError errors={[errors.amount]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="transaction-category">Category</FieldLabel>
              <CategoryCombobox
                id="transaction-category"
                value={watch("category") ?? null}
                onValueChange={(v) => setValue("category", v)}
                type={watch("type")}
                disabled={isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="transaction-date">Date</FieldLabel>
              <DatePicker
                id="transaction-date"
                value={watch("date")}
                onChange={(v) =>
                  v && setValue("date", v, { shouldValidate: true })
                }
                disabled={isPending}
                className="w-full"
              />
              <FieldError errors={[errors.date]} />
            </Field>
          </FieldGroup>
        </form>

        <SheetFooter>
          <Button
            variant="outline"
            type="button"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            <SaveIcon className="h-4 w-4" />
            {isEditing ? "Save" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
