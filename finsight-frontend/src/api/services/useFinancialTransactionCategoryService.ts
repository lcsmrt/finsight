import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  CreateFinancialTransactionCategoryRequest,
  FinancialTransactionCategory,
  FinancialTransactionCategorySortBy,
  PagedFinancialTransactionCategoriesFilter,
  PagedRequest,
  PagedResponse,
  UpdateFinancialTransactionCategoryRequest,
} from "../dtos";
import { MutationOptions } from "../types/mutationOptions";
import { QueryOptions } from "../types/queryOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";
import { buildPagedQuery } from "../utils/buildPagedQuery";

const getFinancialTransactionCategories = async (
  params?: PagedRequest<PagedFinancialTransactionCategoriesFilter, FinancialTransactionCategorySortBy>,
): Promise<PagedResponse<FinancialTransactionCategory>> => {
  const query = buildPagedQuery(params);
  const { data } = await finsightApi.get(`/financial-transaction-category?${query}`);
  return data;
};

export const useGetFinancialTransactionCategories = (
  params?: PagedRequest<PagedFinancialTransactionCategoriesFilter, FinancialTransactionCategorySortBy>,
  options?: QueryOptions<PagedResponse<FinancialTransactionCategory>>,
) => {
  return useQuery({
    queryFn: () => getFinancialTransactionCategories(params),
    queryKey: ["financialTransactionCategories", params],
    ...options,
  });
};

const createFinancialTransactionCategory = async (
  payload: CreateFinancialTransactionCategoryRequest,
): Promise<FinancialTransactionCategory> => {
  const { data } = await finsightApi.post("/financial-transaction-category", payload.body);
  return data;
};

export const useCreateFinancialTransactionCategory = (
  options?: MutationOptions<
    FinancialTransactionCategory,
    CreateFinancialTransactionCategoryRequest
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinancialTransactionCategory,
    ...buildMutationOptions({ successMessage: "Categoria criada com sucesso." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactionCategories"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const updateFinancialTransactionCategory = async (
  payload: UpdateFinancialTransactionCategoryRequest,
): Promise<FinancialTransactionCategory> => {
  const { params, body } = payload;
  const { data } = await finsightApi.put(
    `/financial-transaction-category/${params.id}`,
    body,
  );
  return data;
};

export const useUpdateFinancialTransactionCategory = (
  options?: MutationOptions<
    FinancialTransactionCategory,
    UpdateFinancialTransactionCategoryRequest
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFinancialTransactionCategory,
    ...buildMutationOptions({ successMessage: "Categoria atualizada com sucesso." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactionCategories"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const deleteFinancialTransactionCategory = async (id: number): Promise<void> => {
  await finsightApi.delete(`/financial-transaction-category/${id}`);
};

export const useDeleteFinancialTransactionCategory = (
  options?: MutationOptions<void, number>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFinancialTransactionCategory,
    ...buildMutationOptions({ successMessage: "Category deleted successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactionCategories"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};
