import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  CreateFinancialTransactionBody,
  CreateFinancialTransactionCategoryBody,
  FinancialTransaction,
  FinancialTransactionCategory,
  UpdateFinancialTransactionCategoryParams,
  UpdateFinancialTransactionParams,
} from "../dtos/financialTransaction";
import { MutationOptions } from "../types/mutationOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";

/**
 * Fetches all financial transactions.
 * @returns List of financial transactions.
 */
const getFinancialTransactions = async (): Promise<FinancialTransaction[]> => {
  const { data } = await finsightApi.get("/financial-transaction");
  return data;
};

/**
 * Hook for fetching financial transactions.
 */
export const useGetFinancialTransactions = (
  options?: Omit<UseQueryOptions<FinancialTransaction[]>, "queryKey">,
) => {
  return useQuery({
    queryFn: getFinancialTransactions,
    queryKey: ["financialTransactions"],
    ...options,
  });
};

/**
 * Fetches all financial transaction categories.
 * @returns List of categories.
 */
const getFinancialTransactionCategories = async (): Promise<
  FinancialTransactionCategory[]
> => {
  const { data } = await finsightApi.get("/financial-transaction-category");
  return data;
};

/**
 * Hook for fetching financial transaction categories.
 */
export const useGetFinancialTransactionCategories = (
  options?: Omit<UseQueryOptions<FinancialTransactionCategory[]>, "queryKey">,
) => {
  return useQuery({
    queryFn: getFinancialTransactionCategories,
    queryKey: ["financialTransactionCategories"],
    ...options,
  });
};

/**
 * Sends a create financial transaction request.
 * @param body Transaction data.
 * @returns Created transaction.
 */
const createFinancialTransaction = async (
  body: CreateFinancialTransactionBody,
): Promise<FinancialTransaction> => {
  const { data } = await finsightApi.post("/financial-transaction", body);
  return data;
};

/**
 * Hook for creating a financial transaction.
 */
export const useCreateFinancialTransaction = (
  options?: MutationOptions<
    FinancialTransaction,
    CreateFinancialTransactionBody
  >,
) => {
  return useMutation({
    mutationFn: createFinancialTransaction,
    ...buildMutationOptions(
      { successMessage: "Transação criada com sucesso." },
      options,
    ),
  });
};

/**
 * Sends an update financial transaction request.
 * @param params Transaction id and updated fields.
 * @returns Updated transaction.
 */
const updateFinancialTransaction = async ({
  id,
  ...body
}: UpdateFinancialTransactionParams): Promise<FinancialTransaction> => {
  const { data } = await finsightApi.put(`/financial-transaction/${id}`, body);
  return data;
};

/**
 * Hook for updating a financial transaction.
 */
export const useUpdateFinancialTransaction = (
  options?: MutationOptions<
    FinancialTransaction,
    UpdateFinancialTransactionParams
  >,
) => {
  return useMutation({
    mutationFn: updateFinancialTransaction,
    ...buildMutationOptions(
      { successMessage: "Transação atualizada com sucesso." },
      options,
    ),
  });
};

/**
 * Sends a delete financial transaction request.
 * @param id Transaction id.
 */
const deleteFinancialTransaction = async (id: number): Promise<void> => {
  await finsightApi.delete(`/financial-transaction/${id}`);
};

/**
 * Hook for deleting a financial transaction.
 */
export const useDeleteFinancialTransaction = (
  options?: MutationOptions<void, number>,
) => {
  return useMutation({
    mutationFn: deleteFinancialTransaction,
    ...buildMutationOptions(
      { successMessage: "Transação excluída com sucesso." },
      options,
    ),
  });
};

/**
 * Sends a create financial transaction category request.
 * @param body Category data.
 * @returns Created category.
 */
const createFinancialTransactionCategory = async (
  body: CreateFinancialTransactionCategoryBody,
): Promise<FinancialTransactionCategory> => {
  const { data } = await finsightApi.post(
    "/financial-transaction-category",
    body,
  );
  return data;
};

/**
 * Hook for creating a financial transaction category.
 */
export const useCreateFinancialTransactionCategory = (
  options?: MutationOptions<
    FinancialTransactionCategory,
    CreateFinancialTransactionCategoryBody
  >,
) => {
  return useMutation({
    mutationFn: createFinancialTransactionCategory,
    ...buildMutationOptions(
      { successMessage: "Categoria criada com sucesso." },
      options,
    ),
  });
};

/**
 * Sends an update financial transaction category request.
 * @param params Category id and updated fields.
 * @returns Updated category.
 */
const updateFinancialTransactionCategory = async ({
  id,
  ...body
}: UpdateFinancialTransactionCategoryParams): Promise<FinancialTransactionCategory> => {
  const { data } = await finsightApi.put(
    `/financial-transaction-category/${id}`,
    body,
  );
  return data;
};

/**
 * Hook for updating a financial transaction category.
 */
export const useUpdateFinancialTransactionCategory = (
  options?: MutationOptions<
    FinancialTransactionCategory,
    UpdateFinancialTransactionCategoryParams
  >,
) => {
  return useMutation({
    mutationFn: updateFinancialTransactionCategory,
    ...buildMutationOptions(
      { successMessage: "Categoria atualizada com sucesso." },
      options,
    ),
  });
};

/**
 * Sends a delete financial transaction category request.
 * @param id Category id.
 */
const deleteFinancialTransactionCategory = async (
  id: number,
): Promise<void> => {
  await finsightApi.delete(`/financial-transaction-category/${id}`);
};

/**
 * Hook for deleting a financial transaction category.
 */
export const useDeleteFinancialTransactionCategory = (
  options?: MutationOptions<void, number>,
) => {
  return useMutation({
    mutationFn: deleteFinancialTransactionCategory,
    ...buildMutationOptions(
      { successMessage: "Categoria excluída com sucesso." },
      options,
    ),
  });
};
