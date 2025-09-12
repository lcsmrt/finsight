import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/expansesManagerApi";
import { FinancialTransaction } from "../types/financialTransaction";

// BUSCA TODAS AS TRANSAÇÕES
const getFinancialTransactions = async (): Promise<FinancialTransaction[]> => {
  const { data } = await finsightApi.get("/financial-transaction");
  return data;
};

export const useGetFinancialTransactions = (
  options?: Omit<UseQueryOptions<FinancialTransaction[]>, "queryKey">,
) => {
  return useQuery({
    queryFn: getFinancialTransactions,
    queryKey: ["financialTransactions"],
    ...options,
  });
};
