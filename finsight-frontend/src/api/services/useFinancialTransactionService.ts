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
  RecurrenceDefinitionResponse,
  DeleteFinancialTransactionSeriesRequest,
  UpdateFinancialTransactionSeriesRequest,
  UpdateFinancialTransactionRequest,
} from "../dtos";
import { MutationOptions } from "../types/mutationOptions";
import { QueryOptions } from "../types/queryOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";
import { buildPagedQuery } from "../utils/buildPagedQuery";
import { usePlanContext } from "@/app/providers/PlanProvider";

const getFinancialTransactions = async (
  planId: number,
  params?: PagedRequest<
    PagedFinancialTransactionsFilter,
    FinancialTransactionSortBy
  >,
): Promise<PagedResponse<FinancialTransaction>> => {
  const query = buildPagedQuery(params);
  const { data } = await finsightApi.get(
    `/plans/${planId}/financial-transaction?${query}`,
  );
  return data;
};

export const useGetFinancialTransactions = (
  params?: PagedRequest<
    PagedFinancialTransactionsFilter,
    FinancialTransactionSortBy
  >,
  options?: QueryOptions<PagedResponse<FinancialTransaction>>,
) => {
  const { activePlanId } = usePlanContext();
  return useQuery({
    queryFn: () => getFinancialTransactions(activePlanId!, params),
    queryKey: ["financialTransactions", activePlanId, params],
    ...options,
    enabled: activePlanId != null && (options?.enabled ?? true),
  });
};

const createFinancialTransaction = async (
  planId: number,
  payload: CreateFinancialTransactionRequest,
): Promise<FinancialTransaction> => {
  const { data } = await finsightApi.post(
    `/plans/${planId}/financial-transaction`,
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
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (payload: CreateFinancialTransactionRequest) =>
      createFinancialTransaction(activePlanId!, payload),
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
  planId: number,
  payload: UpdateFinancialTransactionRequest,
): Promise<FinancialTransaction> => {
  const { params, body } = payload;
  const { data } = await finsightApi.put(
    `/plans/${planId}/financial-transaction/${params.id}`,
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
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (payload: UpdateFinancialTransactionRequest) =>
      updateFinancialTransaction(activePlanId!, payload),
    ...buildMutationOptions({ successMessage: "Transaction updated successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const importNubankCsv = async (
  planId: number,
  file: File,
): Promise<{ imported: number }> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await finsightApi.post(
    `/plans/${planId}/financial-transaction/import`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
};

export const useImportNubankCsv = (
  options?: MutationOptions<{ imported: number }, File>,
) => {
  const queryClient = useQueryClient();
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (file: File) => importNubankCsv(activePlanId!, file),
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
  planId: number,
  payload: CreateFinancialTransactionSeriesRequest,
): Promise<FinancialTransactionSeriesResponse> => {
  const { data } = await finsightApi.post(
    `/plans/${planId}/financial-transaction/series`,
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
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (payload: CreateFinancialTransactionSeriesRequest) =>
      createFinancialTransactionSeries(activePlanId!, payload),
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
  planId: number,
  { seriesId, scope, pivotOccurrenceId }: DeleteFinancialTransactionSeriesRequest,
): Promise<void> => {
  const query = new URLSearchParams({ scope });
  if (pivotOccurrenceId != null) {
    query.set("pivotOccurrenceId", String(pivotOccurrenceId));
  }
  await finsightApi.delete(
    `/plans/${planId}/financial-transaction/series/${seriesId}?${query}`,
  );
};

export const useDeleteFinancialTransactionSeries = (
  options?: MutationOptions<void, DeleteFinancialTransactionSeriesRequest>,
) => {
  const queryClient = useQueryClient();
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (payload: DeleteFinancialTransactionSeriesRequest) =>
      deleteFinancialTransactionSeries(activePlanId!, payload),
    ...buildMutationOptions({ successMessage: "Series deleted successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        queryClient.invalidateQueries({
          queryKey: [
            "financialTransactionSeries",
            activePlanId,
            variables.seriesId,
          ],
        });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const getFinancialTransactionSeries = async (
  planId: number,
  seriesId: string,
): Promise<RecurrenceDefinitionResponse> => {
  const { data } = await finsightApi.get(
    `/plans/${planId}/financial-transaction/series/${seriesId}`,
  );
  return data;
};

export const useGetFinancialTransactionSeries = (
  seriesId: string | undefined,
  options?: QueryOptions<RecurrenceDefinitionResponse>,
) => {
  const { activePlanId } = usePlanContext();
  return useQuery({
    queryFn: () => getFinancialTransactionSeries(activePlanId!, seriesId!),
    queryKey: ["financialTransactionSeries", activePlanId, seriesId],
    ...options,
    enabled:
      activePlanId != null && seriesId != null && (options?.enabled ?? true),
  });
};

const updateFinancialTransactionSeries = async (
  planId: number,
  payload: UpdateFinancialTransactionSeriesRequest,
): Promise<FinancialTransactionSeriesResponse> => {
  const { params, body } = payload;
  const { data } = await finsightApi.put(
    `/plans/${planId}/financial-transaction/series/${params.seriesId}`,
    body,
  );
  return data;
};

export const useUpdateFinancialTransactionSeries = (
  options?: MutationOptions<
    FinancialTransactionSeriesResponse,
    UpdateFinancialTransactionSeriesRequest
  >,
) => {
  const queryClient = useQueryClient();
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (payload: UpdateFinancialTransactionSeriesRequest) =>
      updateFinancialTransactionSeries(activePlanId!, payload),
    ...buildMutationOptions({ successMessage: "Series updated successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        queryClient.invalidateQueries({
          queryKey: ["financialTransactionSeries", activePlanId, variables.params.seriesId],
        });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};

const deleteFinancialTransaction = async (
  planId: number,
  id: number,
): Promise<void> => {
  await finsightApi.delete(`/plans/${planId}/financial-transaction/${id}`);
};

export const useDeleteFinancialTransaction = (
  options?: MutationOptions<void, number>,
) => {
  const queryClient = useQueryClient();
  const { activePlanId } = usePlanContext();
  return useMutation({
    mutationFn: (id: number) => deleteFinancialTransaction(activePlanId!, id),
    ...buildMutationOptions({ successMessage: "Transaction deleted successfully." }, {
      ...options,
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
        options?.onSuccess?.(data, variables);
      },
    }),
  });
};
