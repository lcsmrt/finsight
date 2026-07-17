import {
  ParticipantInput,
  PlanMember,
  RecurrenceDefinitionResponse,
  SeriesEditScope,
  SplitMode,
} from "@/api/dtos";
import { useGetFinancialTransactionCategories } from "@/api/services/useFinancialTransactionCategoryService";
import {
  useFinancialTransactionSeries,
  useUpdateFinancialTransactionSeries,
} from "@/api/services/useFinancialTransactionService";
import { useGetPlanMembers } from "@/api/services/usePlanService";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePlanContext } from "@/app/providers/PlanProvider";
import { Badge } from "@/components/badge/Badge";
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
import { StandardCombobox } from "@/components/input/StandardCombobox";
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
import { format } from "date-fns";
import { SaveIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CategoryCombobox } from "./CategoryCombobox";

const seriesEditFormSchema = z
  .object({
    mode: z.enum(["INSTALLMENT", "RECURRING"]),
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
    attributionMode: z.enum(["ME", "SOMEONE", "SPLIT"]),
    splitMode: z.enum(["EQUAL", "EXACT"]),
    participants: z.array(
      z.object({
        memberId: z.number(),
        memberName: z.string(),
        shareAmount: z.string().optional(),
      }),
    ),
    parcelsNumber: z.string().optional(),
    endDate: z.date().optional(),
  })
  .superRefine((values, ctx) => {
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

    if (values.mode === "INSTALLMENT") {
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

    if (values.mode === "RECURRING" && !values.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the end date",
        path: ["endDate"],
      });
    }
  });

type SeriesEditFormValues = z.infer<typeof seriesEditFormSchema>;

type SeriesEditDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string | undefined;
  initialScope: SeriesEditScope;
  pivotOccurrenceId: number;
};

const scopeLabels: Record<SeriesEditScope, string> = {
  THIS_ONE: "Editing: This one",
  THIS_AND_FOLLOWING: "Editing: This and following",
  ALL: "Editing: All",
};

function deriveAttributionMode(
  participants: RecurrenceDefinitionResponse["participants"],
  currentUserId?: number,
): SeriesEditFormValues["attributionMode"] {
  if (participants.length === 0) return "ME";
  if (participants.length === 1) {
    return participants[0].memberId === currentUserId ? "ME" : "SOMEONE";
  }
  return "SPLIT";
}

function buildDefaultValues(
  definition: RecurrenceDefinitionResponse | undefined,
  currentUserId: number | undefined,
  members: PlanMember[],
): SeriesEditFormValues {
  if (!definition) {
    return {
      mode: "INSTALLMENT",
      description: "",
      amount: "",
      category: null,
      attributionMode: "ME",
      splitMode: "EQUAL",
      participants: [],
      parcelsNumber: undefined,
      endDate: undefined,
    };
  }

  const attributionMode = deriveAttributionMode(
    definition.participants,
    currentUserId,
  );
  const memberName = (memberId: number) =>
    members.find((member) => member.userId === memberId)?.name ?? "";

  return {
    mode: definition.mode,
    description: definition.description,
    amount: maskCurrency(String(Math.round(definition.amount * 100))),
    category: null,
    attributionMode,
    splitMode: definition.splitMode === "EXACT" ? "EXACT" : "EQUAL",
    participants:
      attributionMode === "ME"
        ? []
        : definition.participants.map((participant) => ({
            memberId: participant.memberId,
            memberName: memberName(participant.memberId),
            shareAmount: maskCurrency(
              String(Math.round(participant.shareAmount * 100)),
            ),
          })),
    parcelsNumber:
      definition.mode === "INSTALLMENT"
        ? String(definition.parcelsNumber ?? "")
        : undefined,
    endDate:
      definition.mode === "RECURRING" && definition.endDate
        ? (() => {
            const [year, month, day] = definition.endDate!
              .split("T")[0]
              .split("-")
              .map(Number);
            return new Date(year, month - 1, day);
          })()
        : undefined,
  };
}

export const SeriesEditDrawer = ({
  open,
  onOpenChange,
  seriesId,
  initialScope,
  pivotOccurrenceId,
}: SeriesEditDrawerProps) => {
  const { activePlanId, activePlan } = usePlanContext();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { data: members = [] } = useGetPlanMembers(activePlanId ?? undefined);
  const canAttributeToOthers =
    activePlan?.myRole === "OWNER" || activePlan?.myRole === "EDITOR";
  const showAttribution = canAttributeToOthers && members.length > 1;
  const otherMembers = members.filter(
    (member) => member.userId !== currentUserId,
  );

  const { data: definition } = useFinancialTransactionSeries(seriesId, {
    enabled: open && !!seriesId,
  });

  const { data: categoriesPage } = useGetFinancialTransactionCategories(
    { filter: { type: definition?.type }, size: 100 },
    { enabled: open && definition?.categoryId != null },
  );
  const prefilledCategory = useMemo(() => {
    if (definition?.categoryId == null) return null;
    return (
      categoriesPage?.content.find((cat) => cat.id === definition.categoryId) ??
      null
    );
  }, [categoriesPage, definition?.categoryId]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SeriesEditFormValues>({
    resolver: zodResolver(seriesEditFormSchema),
    defaultValues: buildDefaultValues(definition, currentUserId, members),
  });

  const [effectiveScope, setEffectiveScope] =
    useState<SeriesEditScope>(initialScope);
  const originalParcelsNumberRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    reset(buildDefaultValues(definition, currentUserId, members));
    originalParcelsNumberRef.current =
      definition?.mode === "INSTALLMENT"
        ? String(definition.parcelsNumber ?? "")
        : undefined;
    setEffectiveScope(initialScope);
  }, [definition, members, currentUserId, initialScope, open, seriesId, reset]);

  useEffect(() => {
    if (prefilledCategory) {
      setValue("category", prefilledCategory);
    }
  }, [prefilledCategory, setValue]);

  const parcelsNumberValue = watch("parcelsNumber");
  const parcelsNumberChanged =
    definition?.mode === "INSTALLMENT" &&
    parcelsNumberValue !== originalParcelsNumberRef.current;

  useEffect(() => {
    if (parcelsNumberChanged) {
      setEffectiveScope("ALL");
    }
  }, [parcelsNumberChanged]);

  const attributionMode = watch("attributionMode");

  const handleAttributionModeChange = (
    next: SeriesEditFormValues["attributionMode"],
  ) => {
    setValue("attributionMode", next);
    setValue("splitMode", "EQUAL");
    if (next === "ME") {
      setValue("participants", []);
    } else if (next === "SOMEONE") {
      const kept = watch("participants").filter(
        (p) => p.memberId !== currentUserId,
      );
      setValue("participants", kept.slice(0, 1));
    } else {
      const current = watch("participants");
      if (current.length < 2) {
        setValue(
          "participants",
          members.map((member) => ({
            memberId: member.userId,
            memberName: member.name,
            shareAmount: undefined,
          })),
        );
      }
    }
  };

  const { mutate: updateFinancialTransactionSeries, isPending } =
    useUpdateFinancialTransactionSeries({
      onSuccess: () => onOpenChange(false),
    });

  const onSubmit = (values: SeriesEditFormValues) => {
    if (!definition || !seriesId) return;

    const amount = parseInt(values.amount.replace(/\D/g, ""), 10) / 100;

    const { participants, splitMode } = ((): {
      participants: ParticipantInput[] | undefined;
      splitMode: SplitMode | undefined;
    } => {
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
    })();

    updateFinancialTransactionSeries({
      params: { seriesId },
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
        scope: effectiveScope,
        pivotOccurrenceId,
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit series</SheetTitle>
          <Badge variant="secondary" className="w-fit">
            {scopeLabels[effectiveScope]}
          </Badge>
        </SheetHeader>

        {!definition && (
          <p className="text-muted-foreground px-4 text-sm">Loading…</p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-2"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="series-edit-description">
                Description
              </FieldLabel>
              <Input
                id="series-edit-description"
                placeholder="e.g., Rent, Salary, Groceries"
                disabled={isPending}
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="series-edit-amount">Amount</FieldLabel>
              {(() => {
                const { onChange, ...amountRest } = register("amount");
                return (
                  <Input
                    id="series-edit-amount"
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
              <FieldLabel htmlFor="series-edit-category">Category</FieldLabel>
              <CategoryCombobox
                id="series-edit-category"
                value={watch("category") ?? null}
                onValueChange={(v) => setValue("category", v)}
                type={definition?.type}
                disabled={isPending}
              />
            </Field>

            {showAttribution && (
              <>
                <Field>
                  <FieldLabel>Attributed to</FieldLabel>
                  <div className="flex w-full gap-2">
                    {(
                      [
                        ["ME", "Me"],
                        ["SOMEONE", "Someone else"],
                        ["SPLIT", "Split"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleAttributionModeChange(value)}
                        className={cn(
                          "flex-1 border",
                          attributionMode === value
                            ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-transparent",
                        )}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </Field>

                {attributionMode === "SOMEONE" && (
                  <Field>
                    <FieldLabel htmlFor="series-edit-attributed-person">
                      Person
                    </FieldLabel>
                    <StandardCombobox
                      id="series-edit-attributed-person"
                      items={otherMembers.map((member) => ({
                        id: member.userId,
                        name: member.name,
                      }))}
                      value={(() => {
                        const person = watch("participants")[0];
                        return person
                          ? { id: person.memberId, name: person.memberName }
                          : null;
                      })()}
                      onValueChange={(value) =>
                        setValue(
                          "participants",
                          value
                            ? [
                                {
                                  memberId: value.id,
                                  memberName: value.name,
                                  shareAmount: undefined,
                                },
                              ]
                            : [],
                        )
                      }
                      itemLabel={(member) => member.name}
                      placeholder="Select a person"
                      disabled={isPending}
                    />
                    <FieldError errors={[errors.participants]} />
                  </Field>
                )}

                {attributionMode === "SPLIT" && (
                  <>
                    <Field>
                      <FieldLabel>Split mode</FieldLabel>
                      <div className="flex w-full gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => setValue("splitMode", "EQUAL")}
                          className={cn(
                            "flex-1 border",
                            watch("splitMode") === "EQUAL"
                              ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-transparent",
                          )}
                        >
                          Equal
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => setValue("splitMode", "EXACT")}
                          className={cn(
                            "flex-1 border",
                            watch("splitMode") === "EXACT"
                              ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-transparent",
                          )}
                        >
                          Exact
                        </Button>
                      </div>
                    </Field>

                    <Field>
                      <FieldLabel>Participants</FieldLabel>
                      <div className="flex flex-col gap-2">
                        {members.map((member) => {
                          const participants = watch("participants");
                          const index = participants.findIndex(
                            (p) => p.memberId === member.userId,
                          );
                          const checked = index !== -1;

                          return (
                            <div
                              key={member.userId}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  if (isChecked) {
                                    setValue("participants", [
                                      ...participants,
                                      {
                                        memberId: member.userId,
                                        memberName: member.name,
                                        shareAmount: undefined,
                                      },
                                    ]);
                                  } else {
                                    setValue(
                                      "participants",
                                      participants.filter(
                                        (p) => p.memberId !== member.userId,
                                      ),
                                    );
                                  }
                                }}
                                disabled={isPending}
                              />
                              <span className="flex-1 text-sm">
                                {member.name}
                              </span>
                              {watch("splitMode") === "EXACT" && checked && (
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="R$ 0,00"
                                  className="h-8 w-28 text-sm"
                                  value={participants[index]?.shareAmount ?? ""}
                                  onChange={(e) => {
                                    const masked = maskCurrency(e.target.value);
                                    const updated = [...participants];
                                    updated[index] = {
                                      ...updated[index],
                                      shareAmount: masked,
                                    };
                                    setValue("participants", updated);
                                  }}
                                  disabled={isPending}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <FieldError errors={[errors.participants]} />
                    </Field>
                  </>
                )}
              </>
            )}

            {definition?.mode === "INSTALLMENT" && (
              <Field>
                <FieldLabel htmlFor="series-edit-parcels">
                  Number of installments
                </FieldLabel>
                {(() => {
                  const { onChange, ...parcelsRest } =
                    register("parcelsNumber");
                  return (
                    <Input
                      id="series-edit-parcels"
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

            {definition?.mode === "RECURRING" && (
              <Field>
                <FieldLabel htmlFor="series-edit-end-date">
                  End date
                </FieldLabel>
                <DatePicker
                  id="series-edit-end-date"
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
            disabled={!definition}
            onClick={handleSubmit(onSubmit)}
          >
            <SaveIcon className="h-4 w-4" />
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
