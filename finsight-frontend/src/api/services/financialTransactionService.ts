import { useQuery } from "@tanstack/react-query";
import { finsightApi } from "../clients/expansesManagerApi";

// BUSCA TODAS AS TRANSAÇÕES
const getFinancialTransactions = async () => {
  const response = await finsightApi.get("/financial-transaction");
  return response;
};

export const useGetFinancialTransactions = () => {
  return useQuery({
    queryFn: getFinancialTransactions,
    queryKey: ["financialTransactions"],
  });
};
