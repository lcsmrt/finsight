import {
  FinancialTransaction,
  FinancialTransactionSortBy,
} from "@/api/dtos/financialTransaction";
import { Sorting } from "@/components/table/components/TableHeader";
import { formatCurrency, formatDate } from "@/utils/string/formatters";
import { useEffect, useMemo, useState } from "react";
import { AppliedFilters } from "../components/transactions/TransactionFilterPopover";

const SORTABLE_FIELDS: Record<string, FinancialTransactionSortBy> = {
  startDate: "startDate",
  amount: "amount",
  description: "description",
};

export const useTransactionFilters = () => {
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    filter: {},
    categoryForDisplay: null,
  });
  const [description, setDescription] = useState("");
  const [debouncedDescription, setDebouncedDescription] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<Sorting<FinancialTransaction>[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDescription(description);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [description]);

  const queryParams = useMemo(() => {
    const activeSort = sorting[0];
    const sortBy = activeSort
      ? SORTABLE_FIELDS[activeSort.by as string]
      : undefined;
    return {
      page,
      size: pageSize,
      filter: {
        ...appliedFilters.filter,
        ...(debouncedDescription ? { description: debouncedDescription } : {}),
      },
      ...(sortBy
        ? { sort: { by: sortBy, direction: activeSort.direction } }
        : {}),
    };
  }, [page, pageSize, appliedFilters.filter, debouncedDescription, sorting]);

  const chips = useMemo(() => {
    const { filter, categoryForDisplay } = appliedFilters;
    const result: { key: string; label: string; onRemove: () => void }[] = [];

    if (filter.type) {
      result.push({
        key: "type",
        label: filter.type === "CREDIT" ? "Credit" : "Debit",
        onRemove: () => {
          setAppliedFilters((p) => ({
            ...p,
            filter: { ...p.filter, type: undefined },
          }));
          setPage(0);
        },
      });
    }
    if (filter.categoryId != null && categoryForDisplay) {
      result.push({
        key: "category",
        label: categoryForDisplay.description,
        onRemove: () => {
          setAppliedFilters((p) => ({
            filter: { ...p.filter, categoryId: undefined },
            categoryForDisplay: null,
          }));
          setPage(0);
        },
      });
    }
    if (filter.startDateFrom || filter.startDateTo) {
      const from = filter.startDateFrom
        ? formatDate(filter.startDateFrom, "dd/MM/yyyy")
        : null;
      const to = filter.startDateTo
        ? formatDate(filter.startDateTo, "dd/MM/yyyy")
        : null;
      const label =
        from && to ? `${from} – ${to}` : from ? `From ${from}` : `Until ${to!}`;
      result.push({
        key: "date",
        label,
        onRemove: () => {
          setAppliedFilters((p) => ({
            ...p,
            filter: {
              ...p.filter,
              startDateFrom: undefined,
              startDateTo: undefined,
            },
          }));
          setPage(0);
        },
      });
    }
    if (filter.amountMin != null || filter.amountMax != null) {
      const min =
        filter.amountMin != null
          ? formatCurrency(filter.amountMin, "BRL")
          : null;
      const max =
        filter.amountMax != null
          ? formatCurrency(filter.amountMax, "BRL")
          : null;
      const label =
        min && max ? `${min} – ${max}` : min ? `≥ ${min}` : `≤ ${max!}`;
      result.push({
        key: "amount",
        label,
        onRemove: () => {
          setAppliedFilters((p) => ({
            ...p,
            filter: { ...p.filter, amountMin: undefined, amountMax: undefined },
          }));
          setPage(0);
        },
      });
    }

    return result;
  }, [appliedFilters]);

  const onApplyFilters = (filters: AppliedFilters) => {
    setAppliedFilters(filters);
    setPage(0);
  };

  const onClearFilters = () => {
    setAppliedFilters({ filter: {}, categoryForDisplay: null });
    setPage(0);
  };

  const onPageChange = (p: number) => setPage(p);

  const onPageSizeChange = (s: number) => {
    setPageSize(s);
    setPage(0);
  };

  return {
    queryParams,
    chips,
    description,
    setDescription,
    appliedFilters,
    onApplyFilters,
    onClearFilters,
    onPageChange,
    onPageSizeChange,
    sorting,
    onSortChange: setSorting,
  };
};
