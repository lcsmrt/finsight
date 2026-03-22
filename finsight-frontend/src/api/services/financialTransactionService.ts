import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import { FinancialTransaction } from "../dtos/financialTransaction";

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
