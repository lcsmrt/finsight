import { useQuery } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import { DashboardFilter, DashboardSummaryResponse } from "../dtos";
import { QueryOptions } from "../types/queryOptions";

const getDashboardSummary = async (
  params: DashboardFilter,
): Promise<DashboardSummaryResponse> => {
  const { data } = await finsightApi.get(`/dashboard`, { params });
  return data;
};

export const useGetDashboardSummary = (
  params: DashboardFilter,
  options?: QueryOptions<DashboardSummaryResponse>,
) => {
  return useQuery({
    queryFn: () => getDashboardSummary(params),
    queryKey: ["dashboardSummary", params],
    ...options,
  });
};
