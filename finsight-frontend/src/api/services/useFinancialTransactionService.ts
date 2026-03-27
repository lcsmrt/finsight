import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  CreateFinancialTransactionRequest,
  FinancialTransaction,
  FinancialTransactionSortBy,
  PagedFinancialTransactionsFilter,
  PagedRequest,
  PagedResponse,
  UpdateFinancialTransactionRequest,
} from "../dtos";
import { MutationOptions } from "../types/mutationOptions";
import { QueryOptions } from "../types/queryOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";
import { buildPagedQuery } from "../utils/buildPagedQuery";

const getFinancialTransactions = async (
  params?: PagedRequest<
    PagedFinancialTransactionsFilter,
    FinancialTransactionSortBy
  >,
): Promise<PagedResponse<FinancialTransaction>> => {
  const query = buildPagedQuery(params);
  const { data } = await finsightApi.get(`/financial-transaction?${query}`);
  return data;
};

export const useGetFinancialTransactions = (
  params?: PagedRequest<
    PagedFinancialTransactionsFilter,
    FinancialTransactionSortBy
  >,
  options?: QueryOptions<PagedResponse<FinancialTransaction>>,
) => {
  return useQuery({
    queryFn: () => getFinancialTransactions(params),
    queryKey: ["financialTransactions", params],
    ...options,
  });
};

const createFinancialTransaction = async (
  payload: CreateFinancialTransactionRequest,
): Promise<FinancialTransaction> => {
  const { data } = await finsightApi.post(
    "/financial-transaction",
    payload.body,
  );
  return data;
};

export const useCreateFinancialTransaction = (
  options?: MutationOptions<
    FinancialTransaction,
    CreateFinancialTransactionRequest
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinancialTransaction,
    ...buildMutationOptions({ successMessage: "Transação criada com sucesso." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const updateFinancialTransaction = async (
  payload: UpdateFinancialTransactionRequest,
): Promise<FinancialTransaction> => {
  const { params, body } = payload;
  const { data } = await finsightApi.put(
    `/financial-transaction/${params.id}`,
    body,
  );
  return data;
};

export const useUpdateFinancialTransaction = (
  options?: MutationOptions<
    FinancialTransaction,
    UpdateFinancialTransactionRequest
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFinancialTransaction,
    ...buildMutationOptions({ successMessage: "Transação atualizada com sucesso." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const deleteFinancialTransaction = async (id: number): Promise<void> => {
  await finsightApi.delete(`/financial-transaction/${id}`);
};

export const useDeleteFinancialTransaction = (
  options?: MutationOptions<void, number>,
) => {
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
