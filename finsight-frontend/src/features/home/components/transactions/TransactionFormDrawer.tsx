import {
  FinancialTransaction,
  ParticipantInput,
  RecurrenceDefinitionResponse,
  SplitMode,
} from "@/api/dtos/financialTransaction";
import {
  useCreateFinancialTransaction,
  useCreateFinancialTransactionSeries,
  useFinancialTransactionSeries,
  useUpdateFinancialTransaction,
  useUpdateFinancialTransactionSeries,
} from "@/api/services/useFinancialTransactionService";
import { useGetPlanMembers } from "@/api/services/usePlanService";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePlanContext } from "@/app/providers/PlanProvider";
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
import { formatCurrency } from "@/utils/string/formatters";
import { maskCurrency } from "@/utils/string/masks";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format } from "date-fns";
import { PlusIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AttributionFields } from "./AttributionFields";
import { CategoryCombobox } from "./CategoryCombobox";
import { useSeriesScope } from "./SeriesScopeDialog";
import { TransactionTypeToggle } from "./TransactionTypeToggle";

const transactionFormSchema = z
  .object({
    type: z.enum(["DEBIT", "CREDIT"]),
    description: z.string().min(1, "Description is required"),
    amount: z.string().refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length > 0 && parseInt(digits, 10) > 0;
    }, "Amount must be positive"),
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
    seriesEdit: z.boolean(),
    recurrenceMode: z.enum(["INSTALLMENT", "RECURRING"]).optional(),
    parcelsNumber: z.string().optional(),
    currentParcel: z.string().optional(),
    endDate: z.date().optional(),
    attributionMode: z.enum(["ME", "SOMEONE", "SPLIT"]),
    splitMode: z.enum(["EQUAL", "EXACT"]),
    participants: z.array(
      z.object({
        memberId: z.number(),
        memberName: z.string(),
        shareAmount: z.string().optional(),
      }),
    ),
    items: z.array(
      z.object({
        description: z.string().min(1, "Description is required"),
        amount: z.string().refine((v) => {
          const digits = v.replace(/\D/g, "");
          return digits.length > 0 && parseInt(digits, 10) > 0;
        }, "Amount must be positive"),
        category: z
          .object({
            id: z.number(),
            type: z.enum(["DEBIT", "CREDIT"]),
            description: z.string(),
            spendingLimit: z.number().nullish(),
          })
          .nullable()
          .optional(),
      }),
    ),
  })
  .superRefine((values, ctx) => {
    if (values.items.length > 0) {
      const totalDigits = values.amount.replace(/\D/g, "");
      const totalCents = totalDigits.length > 0 ? parseInt(totalDigits, 10) : 0;
      const itemsCents = values.items.reduce((sum, item) => {
        const digits = item.amount.replace(/\D/g, "");
        return sum + (digits.length > 0 ? parseInt(digits, 10) : 0);
      }, 0);

      if (itemsCents > totalCents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Items cannot exceed the transaction total",
          path: ["items"],
        });
      }
    }

    if (
      values.attributionMode === "SPLIT" &&
      values.splitMode === "EXACT" &&
      values.participants.length > 0
    ) {
      const totalDigits = values.amount.replace(/\D/g, "");
      const totalCents = totalDigits.length > 0 ? parseInt(totalDigits, 10) : 0;
      const sumCents = values.participants.reduce((sum, participant) => {
        const digits = (participant.shareAmount ?? "").replace(/\D/g, "");
        return sum + (digits.length > 0 ? parseInt(digits, 10) : 0);
      }, 0);

      if (sumCents !== totalCents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shares must add up to the total amount",
          path: ["participants"],
        });
      }
    }

    if (values.seriesEdit) {
      if (values.recurrenceMode === "INSTALLMENT") {
        const digits = (values.parcelsNumber ?? "").replace(/\D/g, "");
        const total = digits.length > 0 ? parseInt(digits, 10) : 0;
        if (digits.length === 0 || total < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter at least 2 installments",
            path: ["parcelsNumber"],
          });
        }
      }
      if (values.recurrenceMode === "RECURRING" && !values.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the end date",
          path: ["endDate"],
        });
      }
      return;
    }

    if (!values.recurring) return;

    if (!values.recurrenceMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select installment or recurring",
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
          message: "Enter at least 2 installments",
          path: ["parcelsNumber"],
        });
      }

      const currentDigits = (values.currentParcel ?? "").replace(/\D/g, "");
      if (currentDigits.length > 0) {
        const current = parseInt(currentDigits, 10);
        if (current < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "The current installment must be at least 1",
            path: ["currentParcel"],
          });
        } else if (total >= 2 && current > total) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "The current installment cannot be greater than the total",
            path: ["currentParcel"],
          });
        }
      }
    }

    if (values.recurrenceMode === "RECURRING") {
      if (!values.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the end date",
          path: ["endDate"],
        });
      } else if (values.endDate < values.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "The end date must be after the start date",
          path: ["endDate"],
        });
      }
    }
  });

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinancialTransaction;
  mode: "create" | "edit" | "duplicate";
}

function deriveAttributionMode(
  participants: FinancialTransaction["participants"],
  currentUserId?: number,
): TransactionFormValues["attributionMode"] {
  if (participants.length === 0) return "ME";
  if (participants.length === 1) {
    return participants[0].id === currentUserId ? "ME" : "SOMEONE";
  }
  return "SPLIT";
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

const stripInstallmentSuffix = (description: string) =>
  description.replace(/\s*\(\d+\/\d+\)$/, "");

function attributionToPayload(
  values: TransactionFormValues,
  showAttribution: boolean,
  currentUserId?: number,
): { participants?: ParticipantInput[]; splitMode?: SplitMode } {
  if (!showAttribution) {
    return { participants: undefined, splitMode: undefined };
  }

  if (values.attributionMode === "ME") {
    return currentUserId != null
      ? { participants: [{ memberId: currentUserId }], splitMode: "EQUAL" }
      : { participants: undefined, splitMode: undefined };
  }

  if (values.attributionMode === "SOMEONE") {
    const person = values.participants[0];
    return person
      ? { participants: [{ memberId: person.memberId }], splitMode: "EQUAL" }
      : { participants: undefined, splitMode: undefined };
  }

  return {
    participants: values.participants.map((participant) => ({
      memberId: participant.memberId,
      shareAmount:
        values.splitMode === "EXACT"
          ? parseInt((participant.shareAmount ?? "").replace(/\D/g, ""), 10) /
            100
          : undefined,
    })),
    splitMode: values.splitMode,
  };
}

function buildDefaultValues(
  transaction?: FinancialTransaction,
  currentUserId?: number,
  definition?: RecurrenceDefinitionResponse,
): TransactionFormValues {
  if (transaction) {
    const attributionMode = deriveAttributionMode(
      transaction.participants,
      currentUserId,
    );
    const isSeriesEdit = !!definition;
    return {
      type: transaction.type,
      description: isSeriesEdit
        ? stripInstallmentSuffix(transaction.description)
        : transaction.description,
      amount: maskCurrency(String(Math.round(transaction.amount * 100))),
      category: transaction.category ?? null,
      date: parseLocalDate(transaction.startDate),
      recurring: false,
      seriesEdit: isSeriesEdit,
      recurrenceMode: isSeriesEdit ? definition.mode : undefined,
      parcelsNumber:
        isSeriesEdit && definition.mode === "INSTALLMENT"
          ? String(definition.parcelsNumber ?? "")
          : undefined,
      endDate:
        isSeriesEdit && definition.mode === "RECURRING" && definition.endDate
          ? parseLocalDate(definition.endDate)
          : undefined,
      attributionMode,
      splitMode: transaction.splitMode === "EXACT" ? "EXACT" : "EQUAL",
      participants:
        attributionMode === "ME"
          ? []
          : transaction.participants.map((participant) => ({
              memberId: participant.id,
              memberName: participant.name,
              shareAmount: maskCurrency(
                String(Math.round(participant.shareAmount * 100)),
              ),
            })),
      items: isSeriesEdit
        ? []
        : transaction.items.map((item) => ({
            description: item.description,
            amount: maskCurrency(String(Math.round(item.amount * 100))),
            category: item.category ?? null,
          })),
    };
  }
  return {
    type: "DEBIT",
    description: "",
    amount: "",
    category: null,
    date: new Date(),
    recurring: false,
    seriesEdit: false,
    attributionMode: "ME",
    splitMode: "EQUAL",
    participants: [],
    items: [],
  };
}

export const TransactionFormDrawer = ({
  open,
  onOpenChange,
  transaction,
  mode,
}: TransactionFormDrawerProps) => {
  const isEditing = mode === "edit";
  const isSeriesEdit = isEditing && !!transaction?.seriesId;

  const { activePlanId, activePlan } = usePlanContext();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { data: members = [] } = useGetPlanMembers(activePlanId ?? undefined);
  const canAttributeToOthers =
    activePlan?.myRole === "OWNER" || activePlan?.myRole === "EDITOR";
  const showAttribution = canAttributeToOthers && members.length > 1;

  const chooseScope = useSeriesScope();

  const { data: definition } = useFinancialTransactionSeries(
    transaction?.seriesId,
    { enabled: open && isSeriesEdit },
  );

  const title = isSeriesEdit
    ? "Edit series"
    : mode === "duplicate"
      ? "Duplicate Transaction"
      : mode === "edit"
        ? "Edit Transaction"
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
    defaultValues: buildDefaultValues(transaction, currentUserId, definition),
  });

  const originalParcelsNumberRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    reset(buildDefaultValues(transaction, currentUserId, definition));
    originalParcelsNumberRef.current =
      definition?.mode === "INSTALLMENT"
        ? String(definition.parcelsNumber ?? "")
        : undefined;
  }, [transaction, open, reset, currentUserId, definition]);

  const parcelsNumberValue = watch("parcelsNumber");
  const parcelsNumberChanged =
    isSeriesEdit &&
    definition?.mode === "INSTALLMENT" &&
    parcelsNumberValue !== originalParcelsNumberRef.current;

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

  const {
    mutate: updateFinancialTransactionSeries,
    isPending: isUpdatingFinancialTransactionSeries,
  } = useUpdateFinancialTransactionSeries({
    onSuccess: () => onOpenChange(false),
  });

  const isPending =
    isCreatingFinancialTransaction ||
    isUpdatingFinancialTransaction ||
    isCreatingFinancialTransactionSeries ||
    isUpdatingFinancialTransactionSeries;

  const onSubmit = async (values: TransactionFormValues) => {
    const amount = parseInt(values.amount.replace(/\D/g, ""), 10) / 100;
    const { participants, splitMode } = attributionToPayload(
      values,
      showAttribution,
      currentUserId,
    );

    if (isSeriesEdit) {
      if (!transaction?.seriesId || !definition) return;

      const scope = parcelsNumberChanged
        ? "ALL"
        : await chooseScope({ title: "Edit series" });
      if (!scope) return;

      updateFinancialTransactionSeries({
        params: { seriesId: transaction.seriesId },
        body: {
          type: definition.type,
          amount,
          description: values.description,
          categoryId: values.category?.id,
          mode: definition.mode,
          startDate: definition.startDate,
          parcelsNumber:
            definition.mode === "INSTALLMENT"
              ? parseInt((values.parcelsNumber ?? "").replace(/\D/g, ""), 10)
              : undefined,
          interval: definition.interval,
          endDate:
            definition.mode === "RECURRING" && values.endDate
              ? format(values.endDate, "yyyy-MM-dd")
              : undefined,
          splitMode,
          participants,
          scope,
          pivotOccurrenceId: transaction.id,
        },
      });
      return;
    }

    const startDate = format(values.date, "yyyy-MM-dd");

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
          splitMode,
          participants,
        },
      });
      return;
    }

    const items = values.items.map((item) => ({
      description: item.description,
      amount: parseInt(item.amount.replace(/\D/g, ""), 10) / 100,
      categoryId: item.category?.id,
    }));

    const body = {
      type: values.type,
      description: values.description,
      amount,
      categoryId: values.category?.id,
      startDate,
      splitMode,
      participants,
      items,
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

        {isSeriesEdit && !definition && (
          <p className="text-muted-foreground px-4 text-sm">Loading…</p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-2"
        >
          <FieldGroup>
            {!isSeriesEdit && (
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
            )}

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

            {!isSeriesEdit && (
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
            )}

            {!isSeriesEdit && (
              <Field>
                <FieldLabel>Items</FieldLabel>
                <div className="flex flex-col gap-2">
                  {watch("items").map((item, index) => {
                    const items = watch("items");
                    return (
                      <div
                        key={index}
                        className="border-border flex flex-col gap-2 rounded-md border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Item description"
                            className="flex-1"
                            disabled={isPending}
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index] = {
                                ...updated[index],
                                description: e.target.value,
                              };
                              setValue("items", updated);
                            }}
                          />
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            className="w-28"
                            disabled={isPending}
                            value={item.amount}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index] = {
                                ...updated[index],
                                amount: maskCurrency(e.target.value),
                              };
                              setValue("items", updated);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={isPending}
                            onClick={() =>
                              setValue(
                                "items",
                                items.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <CategoryCombobox
                          value={item.category ?? null}
                          onValueChange={(v) => {
                            const updated = [...items];
                            updated[index] = {
                              ...updated[index],
                              category: v ?? null,
                            };
                            setValue("items", updated);
                          }}
                          type={watch("type")}
                          disabled={isPending}
                        />
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      setValue("items", [
                        ...watch("items"),
                        { description: "", amount: "", category: null },
                      ])
                    }
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add item
                  </Button>
                </div>
                {watch("items").length > 0 &&
                  (() => {
                    const totalDigits = watch("amount").replace(/\D/g, "");
                    const totalCents =
                      totalDigits.length > 0 ? parseInt(totalDigits, 10) : 0;
                    const itemsCents = watch("items").reduce((sum, item) => {
                      const digits = item.amount.replace(/\D/g, "");
                      return sum + (digits.length > 0 ? parseInt(digits, 10) : 0);
                    }, 0);
                    const remainderCents = totalCents - itemsCents;
                    return (
                      <p
                        className={cn(
                          "text-sm",
                          remainderCents < 0
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        Remainder: {formatCurrency(remainderCents / 100, "BRL")}
                      </p>
                    );
                  })()}
                <FieldError errors={[errors.items]} />
              </Field>
            )}

            {showAttribution && (
              <AttributionFields
                watch={watch}
                setValue={setValue}
                errors={errors}
                members={members}
                currentUserId={currentUserId}
                disabled={isPending}
              />
            )}

            {isSeriesEdit && definition?.mode === "INSTALLMENT" && (
              <Field>
                <FieldLabel htmlFor="transaction-parcels">
                  Number of installments
                </FieldLabel>
                {(() => {
                  const { onChange, ...parcelsRest } = register("parcelsNumber");
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
                        e.target.value = e.target.value.replace(/\D/g, "");
                        onChange(e);
                      }}
                    />
                  );
                })()}
                <FieldError errors={[errors.parcelsNumber]} />
                <p className="text-muted-foreground text-sm">
                  Currently: parcel {definition.firstParcel ?? 1} of{" "}
                  {definition.parcelsNumber}
                </p>
                {parcelsNumberChanged && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Changing the number of parcels updates the whole series.
                  </p>
                )}
              </Field>
            )}

            {isSeriesEdit && definition?.mode === "RECURRING" && (
              <Field>
                <FieldLabel htmlFor="transaction-end-date">End date</FieldLabel>
                <DatePicker
                  id="transaction-end-date"
                  value={watch("endDate")}
                  onChange={(v) =>
                    v && setValue("endDate", v, { shouldValidate: true })
                  }
                  disabled={isPending}
                  className="w-full"
                />
                <FieldError errors={[errors.endDate]} />
              </Field>
            )}

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
                    Repeat or split into installments?
                  </FieldLabel>
                </Field>

                {watch("recurring") && (
                  <>
                    <Field>
                      <FieldLabel>Mode</FieldLabel>
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
                          Installments
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
                          Recurring
                        </Button>
                      </div>
                      <FieldError errors={[errors.recurrenceMode]} />
                    </Field>

                    {watch("recurrenceMode") === "INSTALLMENT" && (
                      <>
                        <Field>
                          <FieldLabel htmlFor="transaction-parcels-create">
                            Number of installments
                          </FieldLabel>
                          {(() => {
                            const { onChange, ...parcelsRest } =
                              register("parcelsNumber");
                            return (
                              <Input
                                id="transaction-parcels-create"
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
                            Current installment
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
                              Last installment: {total}/{total} —{" "}
                              {format(lastMonth, "MM/yyyy")}
                            </p>
                          );
                        })()}
                      </>
                    )}

                    {watch("recurrenceMode") === "RECURRING" && (
                      <Field>
                        <FieldLabel htmlFor="transaction-create-end-date">
                          End date
                        </FieldLabel>
                        <DatePicker
                          id="transaction-create-end-date"
                          value={watch("endDate")}
                          onChange={(v) =>
                            v && setValue("endDate", v, { shouldValidate: true })
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
            disabled={isSeriesEdit && !definition}
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
