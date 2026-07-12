import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import {
  useCreateFinancialTransaction,
  useCreateFinancialTransactionSeries,
  useUpdateFinancialTransaction,
} from "@/api/services/useFinancialTransactionService";
import { Button } from "@/components/button/Button";
import { Checkbox } from "@/components/input/base/Checkbox";
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
import { cn } from "@/lib/mergeClasses";
import { maskCurrency } from "@/utils/string/masks";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format } from "date-fns";
import { SaveIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CategoryCombobox } from "./CategoryCombobox";
import { TransactionTypeToggle } from "./TransactionTypeToggle";

const transactionFormSchema = z
  .object({
    type: z.enum(["DEBIT", "CREDIT"]),
    description: z.string().min(1, "Description is required"),
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
    date: z.date({ required_error: "Date is required" }),
    recurring: z.boolean(),
    recurrenceMode: z.enum(["INSTALLMENT", "RECURRING"]).optional(),
    parcelsNumber: z.string().optional(),
    currentParcel: z.string().optional(),
    endDate: z.date().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.recurring) return;

    if (!values.recurrenceMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione parcelado ou recorrente",
        path: ["recurrenceMode"],
      });
      return;
    }

    if (values.recurrenceMode === "INSTALLMENT") {
      const digits = (values.parcelsNumber ?? "").replace(/\D/g, "");
      const total = digits.length > 0 ? parseInt(digits, 10) : 0;
      if (digits.length === 0 || total < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe ao menos 2 parcelas",
          path: ["parcelsNumber"],
        });
      }

      const currentDigits = (values.currentParcel ?? "").replace(/\D/g, "");
      if (currentDigits.length > 0) {
        const current = parseInt(currentDigits, 10);
        if (current < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A parcela atual deve ser ao menos 1",
            path: ["currentParcel"],
          });
        } else if (total >= 2 && current > total) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A parcela atual não pode ser maior que o total",
            path: ["currentParcel"],
          });
        }
      }
    }

    if (values.recurrenceMode === "RECURRING") {
      if (!values.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe a data final",
          path: ["endDate"],
        });
      } else if (values.endDate < values.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A data final deve ser posterior à data inicial",
          path: ["endDate"],
        });
      }
    }
  });

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinancialTransaction;
  mode: "create" | "edit" | "duplicate";
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
      recurring: false,
    };
  }
  return {
    type: "DEBIT",
    description: "",
    amount: "",
    category: null,
    date: new Date(),
    recurring: false,
  };
}

export const TransactionFormDrawer = ({
  open,
  onOpenChange,
  transaction,
  mode,
}: TransactionFormDrawerProps) => {
  const isEditing = mode === "edit";

  const title =
    mode === "edit"
      ? "Edit Transaction"
      : mode === "duplicate"
        ? "Duplicate Transaction"
        : "New Transaction";

  const submitLabel = mode === "edit" ? "Save" : "Create";

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

  const {
    mutate: createFinancialTransactionSeries,
    isPending: isCreatingFinancialTransactionSeries,
  } = useCreateFinancialTransactionSeries({
    onSuccess: () => onOpenChange(false),
  });

  const isPending =
    isCreatingFinancialTransaction ||
    isUpdatingFinancialTransaction ||
    isCreatingFinancialTransactionSeries;

  const onSubmit = (values: TransactionFormValues) => {
    const startDate = format(values.date, "yyyy-MM-dd");
    const amount = parseInt(values.amount.replace(/\D/g, ""), 10) / 100;

    if (mode === "create" && values.recurring && values.recurrenceMode) {
      createFinancialTransactionSeries({
        body: {
          type: values.type,
          description: values.description,
          amount,
          categoryId: values.category?.id,
          mode: values.recurrenceMode,
          startDate,
          parcelsNumber:
            values.recurrenceMode === "INSTALLMENT"
              ? parseInt(values.parcelsNumber!.replace(/\D/g, ""), 10)
              : undefined,
          currentParcel: (() => {
            if (values.recurrenceMode !== "INSTALLMENT") return undefined;
            const digits = (values.currentParcel ?? "").replace(/\D/g, "");
            const current = digits.length > 0 ? parseInt(digits, 10) : 1;
            return current > 1 ? current : undefined;
          })(),
          interval:
            values.recurrenceMode === "RECURRING" ? "MONTHLY" : undefined,
          endDate:
            values.recurrenceMode === "RECURRING"
              ? format(values.endDate!, "yyyy-MM-dd")
              : undefined,
        },
      });
      return;
    }

    const body = {
      type: values.type,
      description: values.description,
      amount,
      categoryId: values.category?.id,
      startDate,
    };

    if (isEditing) {
      updateFinancialTransaction({ params: { id: transaction!.id }, body });
    } else {
      createFinancialTransaction({ body });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
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

            {mode === "create" && (
              <>
                <Field orientation="horizontal">
                  <Checkbox
                    id="transaction-recurring"
                    checked={watch("recurring")}
                    onCheckedChange={(checked) => {
                      setValue("recurring", checked);
                      if (!checked) {
                        setValue("recurrenceMode", undefined);
                        setValue("parcelsNumber", undefined);
                        setValue("currentParcel", undefined);
                        setValue("endDate", undefined);
                      }
                    }}
                    disabled={isPending}
                  />
                  <FieldLabel htmlFor="transaction-recurring">
                    Repetir ou parcelar?
                  </FieldLabel>
                </Field>

                {watch("recurring") && (
                  <>
                    <Field>
                      <FieldLabel>Modo</FieldLabel>
                      <div className="flex w-full gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => {
                            setValue("recurrenceMode", "INSTALLMENT", {
                              shouldValidate: true,
                            });
                            setValue("endDate", undefined);
                          }}
                          className={cn(
                            "flex-1 border",
                            watch("recurrenceMode") === "INSTALLMENT"
                              ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-transparent",
                          )}
                        >
                          Parcelado
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => {
                            setValue("recurrenceMode", "RECURRING", {
                              shouldValidate: true,
                            });
                            setValue("parcelsNumber", undefined);
                            setValue("currentParcel", undefined);
                          }}
                          className={cn(
                            "flex-1 border",
                            watch("recurrenceMode") === "RECURRING"
                              ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-transparent",
                          )}
                        >
                          Recorrente
                        </Button>
                      </div>
                      <FieldError errors={[errors.recurrenceMode]} />
                    </Field>

                    {watch("recurrenceMode") === "INSTALLMENT" && (
                      <>
                        <Field>
                          <FieldLabel htmlFor="transaction-parcels">
                            Número de parcelas
                          </FieldLabel>
                          {(() => {
                            const { onChange, ...parcelsRest } =
                              register("parcelsNumber");
                            return (
                              <Input
                                id="transaction-parcels"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g., 12"
                                disabled={isPending}
                                aria-invalid={!!errors.parcelsNumber}
                                {...parcelsRest}
                                onChange={(e) => {
                                  e.target.value = e.target.value.replace(
                                    /\D/g,
                                    "",
                                  );
                                  onChange(e);
                                }}
                              />
                            );
                          })()}
                          <FieldError errors={[errors.parcelsNumber]} />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="transaction-current-parcel">
                            Parcela atual
                          </FieldLabel>
                          {(() => {
                            const { onChange, ...currentRest } =
                              register("currentParcel");
                            return (
                              <Input
                                id="transaction-current-parcel"
                                type="text"
                                inputMode="numeric"
                                placeholder="1"
                                disabled={isPending}
                                aria-invalid={!!errors.currentParcel}
                                {...currentRest}
                                onChange={(e) => {
                                  e.target.value = e.target.value.replace(
                                    /\D/g,
                                    "",
                                  );
                                  onChange(e);
                                }}
                              />
                            );
                          })()}
                          <FieldError errors={[errors.currentParcel]} />
                        </Field>

                        {(() => {
                          const total = parseInt(
                            (watch("parcelsNumber") ?? "").replace(/\D/g, ""),
                            10,
                          );
                          const currentDigits = (
                            watch("currentParcel") ?? ""
                          ).replace(/\D/g, "");
                          const current =
                            currentDigits.length > 0
                              ? parseInt(currentDigits, 10)
                              : 1;
                          const date = watch("date");
                          if (
                            !Number.isFinite(total) ||
                            total < 2 ||
                            current < 1 ||
                            current > total ||
                            !date
                          ) {
                            return null;
                          }
                          const lastMonth = addMonths(date, total - current);
                          return (
                            <p className="text-muted-foreground text-sm">
                              Última parcela: {total}/{total} —{" "}
                              {format(lastMonth, "MM/yyyy")}
                            </p>
                          );
                        })()}
                      </>
                    )}

                    {watch("recurrenceMode") === "RECURRING" && (
                      <Field>
                        <FieldLabel htmlFor="transaction-end-date">
                          Data final
                        </FieldLabel>
                        <DatePicker
                          id="transaction-end-date"
                          value={watch("endDate")}
                          onChange={(v) =>
                            v &&
                            setValue("endDate", v, { shouldValidate: true })
                          }
                          disabled={isPending}
                          className="w-full"
                        />
                        <FieldError errors={[errors.endDate]} />
                      </Field>
                    )}
                  </>
                )}
              </>
            )}
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
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
