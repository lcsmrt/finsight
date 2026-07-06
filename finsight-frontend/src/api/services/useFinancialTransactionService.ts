import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  CreateFinancialTransactionRequest,
  CreateFinancialTransactionSeriesRequest,
  FinancialTransaction,
  FinancialTransactionSeriesResponse,
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
    ...buildMutationOptions({ successMessage: "Transaction created successfully." }, {
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
    ...buildMutationOptions({ successMessage: "Transaction updated successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const importNubankCsv = async (file: File): Promise<{ imported: number }> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await finsightApi.post("/financial-transaction/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const useImportNubankCsv = (
  options?: MutationOptions<{ imported: number }, File>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importNubankCsv,
    ...buildMutationOptions({ successMessage: "Transactions imported successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const createFinancialTransactionSeries = async (
  payload: CreateFinancialTransactionSeriesRequest,
): Promise<FinancialTransactionSeriesResponse> => {
  const { data } = await finsightApi.post(
    "/financial-transaction/series",
    payload.body,
  );
  return data;
};

export const useCreateFinancialTransactionSeries = (
  options?: MutationOptions<
    FinancialTransactionSeriesResponse,
    CreateFinancialTransactionSeriesRequest
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinancialTransactionSeries,
    ...buildMutationOptions({ successMessage: "Series created successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const deleteFinancialTransactionSeries = async (
  seriesId: string,
): Promise<void> => {
  await finsightApi.delete(`/financial-transaction/series/${seriesId}`);
};

export const useDeleteFinancialTransactionSeries = (
  options?: MutationOptions<void, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFinancialTransactionSeries,
    ...buildMutationOptions({ successMessage: "Series deleted successfully." }, {
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
    ...buildMutationOptions({ successMessage: "Transaction deleted successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};
