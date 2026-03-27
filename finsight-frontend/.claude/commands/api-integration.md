Create or modify an API integration: $ARGUMENTS

API communication uses **axios** + **TanStack Query** wrapped in custom service hooks.
Components never call `finsightApi` directly — always through service hooks.

---

## File Locations

| Thing              | Location                                        |
| ------------------ | ----------------------------------------------- |
| HTTP client        | `src/api/clients/finsightApi.ts`                |
| DTOs / types       | `src/api/dtos/<entity>.ts`                      |
| Service hooks      | `src/api/services/useXxxService.ts`             |
| Shared API types   | `src/api/types/` (QueryOptions, MutationOptions) |
| API utilities      | `src/api/utils/` (buildPagedQuery, etc.)        |

Service hooks that are global (reused across features) live in `src/api/services/`.
Feature-specific hooks that won't be shared can live in `features/<name>/hooks/`.

---

## DTOs

Define entity types and request/response shapes in `src/api/dtos/`:

```ts
// dtos/financialTransaction.ts

export type FinancialTransactionType = "DEBIT" | "CREDIT";

export type FinancialTransaction = {
  id: number;
  type: FinancialTransactionType;
  amount: number;
  description: string;
  startDate: string;
  category?: FinancialTransactionCategory;
};

export type CreateFinancialTransactionRequest = {
  body: {
    type: FinancialTransactionType;
    amount: number;
    description: string;
    categoryId?: number;
    startDate: string;
    endDate?: string;
  };
};

export type UpdateFinancialTransactionRequest = {
  params: { id: number };
  body: Partial<CreateFinancialTransactionRequest["body"]>;
};
```

For paginated endpoints, use the shared paged types:
```ts
import { PagedRequest, PagedResponse } from "@/api/dtos";

// Filter shape for a specific entity
export type FinancialTransactionSortBy = "startDate" | "amount" | "description";

export interface PagedFinancialTransactionsFilter {
  type?: FinancialTransactionType;
  categoryId?: number;
  description?: string;
  startDateFrom?: string;
  startDateTo?: string;
  amountMin?: number;
  amountMax?: number;
}
```

---

## Query Hooks

```ts
import { useQuery } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import { QueryOptions } from "../types/queryOptions";

// 1. Raw async function — HTTP only, no hooks
const getFinancialTransactions = async (
  params?: PagedRequest<PagedFinancialTransactionsFilter, FinancialTransactionSortBy>,
): Promise<PagedResponse<FinancialTransaction>> => {
  const query = buildPagedQuery(params);
  const { data } = await finsightApi.get(`/financial-transaction?${query}`);
  return data;
};

// 2. Hook — wraps the function, accepts options
export const useGetFinancialTransactions = (
  params?: PagedRequest<PagedFinancialTransactionsFilter, FinancialTransactionSortBy>,
  options?: QueryOptions<PagedResponse<FinancialTransaction>>,
) => {
  return useQuery({
    queryFn: () => getFinancialTransactions(params),
    queryKey: ["financialTransactions", params],
    ...options,
  });
};
```

**Query key rules:**
- Format: `["entityName", params]` — always an array
- Include all params the query depends on (TanStack Query handles deep equality)
- Entity-level list: `["financialTransactions"]` or `["financialTransactions", params]`
- Single item: `["financialTransaction", id]`

**Conditional queries** — use `enabled`, not `useEffect`:
```ts
queryKey: ["financialTransaction", id],
queryFn: () => getFinancialTransactionById(id!),
enabled: id != null,
```

---

## Mutation Hooks

```ts
import { useMutation } from "@tanstack/react-query";
import { buildMutationOptions } from "../utils/buildMutationOptions";
import { MutationOptions } from "../types/mutationOptions";

const createFinancialTransaction = async (
  payload: CreateFinancialTransactionRequest,
): Promise<FinancialTransaction> => {
  const { data } = await finsightApi.post("/financial-transaction", payload.body);
  return data;
};

export const useCreateFinancialTransaction = (
  options?: MutationOptions<FinancialTransaction, CreateFinancialTransactionRequest>,
) => {
  return useMutation({
    mutationFn: createFinancialTransaction,
    ...buildMutationOptions(
      { successMessage: "Transação criada com sucesso." },
      options,
    ),
  });
};
```

`buildMutationOptions` wires success/error toasts automatically. Pass defaults in the first arg; per-call overrides via `options`.

**MutationOptions shape:**
```ts
{
  successMessage?: string | ((data, variables) => string);
  errorMessage?: string;
  showSuccessToast?: boolean;   // default: true
  showErrorToast?: boolean;     // default: true
  onSuccess?: (data, variables) => void;
  onError?: (error) => void;
}
```

---

## Query Invalidation

Invalidate related queries inside `onSuccess` when a mutation changes list data:

```ts
import { useQueryClient } from "@tanstack/react-query";

export const useDeleteFinancialTransaction = (options?: MutationOptions<void, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFinancialTransaction,
    ...buildMutationOptions({ successMessage: "Transação excluída com sucesso." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};
```

---

## Paginated Queries — buildPagedQuery

`buildPagedQuery` converts a `PagedRequest` to a URL query string. It skips undefined/null/"" values automatically.

```ts
// Input
{ page: 0, size: 10, filter: { type: "DEBIT", description: "coffee" }, sort: { by: "startDate", direction: "desc" } }

// Output
"page=0&size=10&type=DEBIT&description=coffee&sortBy=startDate&sortDirection=desc"
```

Use it whenever building a paginated GET endpoint.
