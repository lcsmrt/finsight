---
name: api-integration
description: Create or modify an API integration in a React frontend that uses axios + TanStack Query wrapped in custom service hooks. Covers DTOs/types, query keys, mutations with automatic toasts, query invalidation, and paginated queries. Use when adding or changing frontend data-fetching — a new endpoint hook, a DTO/request-response type, a query/mutation, or wiring cache invalidation. Triggers on "api integration", "service hook", "useQuery", "useMutation", "TanStack Query", "DTO", "fetch data", "invalidate query", "paginated endpoint".
metadata:
  type: reference
---

# API Integration

API communication uses **axios** + **TanStack Query** wrapped in custom service hooks.
Components never call the HTTP client directly — always through service hooks.

> Paths and helper names below (`apiClient`, `buildMutationOptions`, `buildPagedQuery`,
> `QueryOptions`, `MutationOptions`) are conventions. Adapt them to your project's names.

---

## File Locations

| Thing              | Location                                        |
| ------------------ | ----------------------------------------------- |
| HTTP client        | `src/api/clients/apiClient.ts`                  |
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
// dtos/product.ts

export type ProductStatus = "ACTIVE" | "ARCHIVED";

export type Product = {
  id: number;
  name: string;
  price: number;
  status: ProductStatus;
  category?: Category;
};

export type CreateProductRequest = {
  body: {
    name: string;
    price: number;
    status: ProductStatus;
    categoryId?: number;
  };
};

export type UpdateProductRequest = {
  params: { id: number };
  body: Partial<CreateProductRequest["body"]>;
};
```

For paginated endpoints, use shared paged types:
```ts
import { PagedRequest, PagedResponse } from "@/api/dtos";

// Filter shape for a specific entity
export type ProductSortBy = "name" | "price" | "status";

export interface PagedProductsFilter {
  status?: ProductStatus;
  categoryId?: number;
  name?: string;
  priceMin?: number;
  priceMax?: number;
}
```

---

## Query Hooks

```ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../clients/apiClient";
import { QueryOptions } from "../types/queryOptions";

// 1. Raw async function — HTTP only, no hooks
const getProducts = async (
  params?: PagedRequest<PagedProductsFilter, ProductSortBy>,
): Promise<PagedResponse<Product>> => {
  const query = buildPagedQuery(params);
  const { data } = await apiClient.get(`/product?${query}`);
  return data;
};

// 2. Hook — wraps the function, accepts options
export const useGetProducts = (
  params?: PagedRequest<PagedProductsFilter, ProductSortBy>,
  options?: QueryOptions<PagedResponse<Product>>,
) => {
  return useQuery({
    queryFn: () => getProducts(params),
    queryKey: ["products", params],
    ...options,
  });
};
```

**Query key rules:**
- Format: `["entityName", params]` — always an array
- Include all params the query depends on (TanStack Query handles deep equality)
- Entity-level list: `["products"]` or `["products", params]`
- Single item: `["product", id]`

**Conditional queries** — use `enabled`, not `useEffect`:
```ts
queryKey: ["product", id],
queryFn: () => getProductById(id!),
enabled: id != null,
```

---

## Mutation Hooks

```ts
import { useMutation } from "@tanstack/react-query";
import { buildMutationOptions } from "../utils/buildMutationOptions";
import { MutationOptions } from "../types/mutationOptions";

const createProduct = async (
  payload: CreateProductRequest,
): Promise<Product> => {
  const { data } = await apiClient.post("/product", payload.body);
  return data;
};

export const useCreateProduct = (
  options?: MutationOptions<Product, CreateProductRequest>,
) => {
  return useMutation({
    mutationFn: createProduct,
    ...buildMutationOptions(
      { successMessage: "Product created successfully." },
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

export const useDeleteProduct = (options?: MutationOptions<void, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    ...buildMutationOptions({ successMessage: "Product deleted successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};
```

---

## Paginated Queries — buildPagedQuery

A `buildPagedQuery` helper converts a `PagedRequest` to a URL query string, skipping
undefined/null/"" values automatically.

```ts
// Input
{ page: 0, size: 10, filter: { status: "ACTIVE", name: "phone" }, sort: { by: "name", direction: "desc" } }

// Output
"page=0&size=10&status=ACTIVE&name=phone&sortBy=name&sortDirection=desc"
```

Use it whenever building a paginated GET endpoint.
