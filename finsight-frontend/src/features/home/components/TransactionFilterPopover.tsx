import type {
  FinancialTransactionType,
  PagedFinancialTransactionsFilter,
  FinancialTransactionCategory,
} from "@/api/dtos";
import { useGetFinancialTransactionCategories } from "@/api/services/useFinancialTransactionCategoryService";
import { Button } from "@/components/button/Button";
import { DateRangePicker } from "@/components/input/DatePicker";
import { Input } from "@/components/input/base/Input";
import { Field, FieldLabel } from "@/components/input/base/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/base/Select";
import { StandardCombobox } from "@/components/input/StandardCombobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/popover/Popover";
import { format, parseISO } from "date-fns";
import { SlidersHorizontalIcon } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { maskCurrency } from "@/utils/string/masks";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

const ISO = "yyyy-MM-dd";
const TYPE_ALL = "ALL" as const;

const TYPE_LABELS: Record<FinancialTransactionType | typeof TYPE_ALL, string> = {
  ALL: "All",
  CREDIT: "Credit",
  DEBIT: "Debit",
};

type FilterDraft = {
  type: FinancialTransactionType | typeof TYPE_ALL;
  category: FinancialTransactionCategory | null;
  dateRange: DateRange | undefined;
  amountMin: string;
  amountMax: string;
};

export type AppliedFilters = {
  filter: PagedFinancialTransactionsFilter;
  categoryForDisplay: FinancialTransactionCategory | null;
};

function toDraft(applied: AppliedFilters): FilterDraft {
  const { filter, categoryForDisplay } = applied;
  return {
    type: filter.type ?? TYPE_ALL,
    category: categoryForDisplay,
    dateRange:
      filter.startDateFrom || filter.startDateTo
        ? {
            from: filter.startDateFrom
              ? parseISO(filter.startDateFrom)
              : undefined,
            to: filter.startDateTo ? parseISO(filter.startDateTo) : undefined,
          }
        : undefined,
    amountMin: filter.amountMin != null ? maskCurrency(String(Math.round(filter.amountMin * 100))) : "",
    amountMax: filter.amountMax != null ? maskCurrency(String(Math.round(filter.amountMax * 100))) : "",
  };
}

function fromDraft(draft: FilterDraft): AppliedFilters {
  const filter: PagedFinancialTransactionsFilter = {};
  if (draft.type !== TYPE_ALL) filter.type = draft.type;
  if (draft.category) filter.categoryId = draft.category.id;
  if (draft.dateRange?.from)
    filter.startDateFrom = format(draft.dateRange.from, ISO);
  if (draft.dateRange?.to) filter.startDateTo = format(draft.dateRange.to, ISO);
  const minDigits = draft.amountMin.replace(/\D/g, "");
  const maxDigits = draft.amountMax.replace(/\D/g, "");
  if (minDigits) filter.amountMin = parseInt(minDigits, 10) / 100;
  if (maxDigits) filter.amountMax = parseInt(maxDigits, 10) / 100;
  return { filter, categoryForDisplay: draft.category };
}

export function countActiveFilters(
  filter: PagedFinancialTransactionsFilter,
): number {
  let n = 0;
  if (filter.type) n++;
  if (filter.categoryId != null) n++;
  if (filter.startDateFrom || filter.startDateTo) n++;
  if (filter.amountMin != null || filter.amountMax != null) n++;
  return n;
}

interface TransactionFilterPopoverProps {
  appliedFilters: AppliedFilters;
  onApply: (filters: AppliedFilters) => void;
}

export const TransactionFilterPopover = ({
  appliedFilters,
  onApply,
}: TransactionFilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(() =>
    toDraft(appliedFilters),
  );
  const [categorySearch, setCategorySearch] = useState("");
  const debouncedCategorySearch = useDebounce(categorySearch);

  const { data: categoriesData, isFetching: isFetchingCategories } =
    useGetFinancialTransactionCategories({
      filter: { description: debouncedCategorySearch.trim() || undefined },
    });
  const categories = categoriesData?.content ?? [];

  const handleOpenChange = (o: boolean) => {
    if (o) setDraft(toDraft(appliedFilters));
    setOpen(o);
  };

  const handleApply = () => {
    onApply(fromDraft(draft));
    setOpen(false);
  };

  const handleReset = () => {
    onApply({ filter: {}, categoryForDisplay: null });
    setOpen(false);
  };

  const activeCount = countActiveFilters(appliedFilters.filter);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        <SlidersHorizontalIcon className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
            {activeCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-1rem))]">
        <div className="flex flex-col gap-4 p-1">
          <Field>
            <FieldLabel>Type</FieldLabel>
            <Select
              value={draft.type}
              onValueChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  type: v as FinancialTransactionType | typeof TYPE_ALL,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) => TYPE_LABELS[v as FinancialTransactionType | typeof TYPE_ALL]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TYPE_ALL}>All</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
                <SelectItem value="DEBIT">Debit</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Category</FieldLabel>
            <StandardCombobox
              items={categories}
              value={draft.category}
              onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}
              itemLabel={(c) => c.description}
              placeholder="All categories"
              clearable
              searchValue={categorySearch}
              onSearchChange={setCategorySearch}
              loading={isFetchingCategories || categorySearch !== debouncedCategorySearch}
            />
          </Field>

          <Field>
            <FieldLabel>Date</FieldLabel>
            <DateRangePicker
              value={draft.dateRange}
              onChange={(r) => setDraft((d) => ({ ...d, dateRange: r }))}
            />
          </Field>

          <Field>
            <FieldLabel>Amount</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={draft.amountMin}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amountMin: maskCurrency(e.target.value) }))
                }
              />
              <span className="text-muted-foreground hidden shrink-0 sm:block">–</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={draft.amountMax}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amountMax: maskCurrency(e.target.value) }))
                }
              />
            </div>
          </Field>

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button type="button" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
