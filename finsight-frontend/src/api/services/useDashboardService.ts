import { useQuery } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import { DashboardFilter, DashboardSummaryResponse } from "../dtos";
import { QueryOptions } from "../types/queryOptions";
import { usePlanContext } from "@/features/plans/PlanProvider";

const getDashboardSummary = async (
  planId: number,
  params: DashboardFilter,
): Promise<DashboardSummaryResponse> => {
  const { data } = await finsightApi.get(`/plans/${planId}/dashboard`, {
    params,
  });
  return data;
};

export const useGetDashboardSummary = (
  params: DashboardFilter,
  options?: QueryOptions<DashboardSummaryResponse>,
) => {
  const { activePlanId } = usePlanContext();
  return useQuery({
    queryFn: () => getDashboardSummary(activePlanId!, params),
    queryKey: ["dashboardSummary", activePlanId, params],
    ...options,
    enabled: activePlanId != null && (options?.enabled ?? true),
  });
};
