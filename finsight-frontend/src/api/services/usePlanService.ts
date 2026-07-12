import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  CreatePlanRequest,
  Plan,
  PlanMember,
  PlanRole,
  RemoveMemberRequest,
  UpdateMemberRoleRequest,
} from "../dtos";
import { MutationOptions } from "../types/mutationOptions";
import { QueryOptions } from "../types/queryOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";

type RawPlan = {
  id: number;
  name: string;
  default: boolean;
  myRole: PlanRole;
};

const mapPlan = (raw: RawPlan): Plan => ({
  id: raw.id,
  name: raw.name,
  isDefault: raw.default,
  myRole: raw.myRole,
});

const getPlans = async (): Promise<Plan[]> => {
  const { data } = await finsightApi.get<RawPlan[]>("/plans");
  return data.map(mapPlan);
};

export const useGetPlans = (options?: QueryOptions<Plan[]>) => {
  return useQuery({
    queryFn: getPlans,
    queryKey: ["plans"],
    ...options,
  });
};

const getPlan = async (id: number): Promise<Plan> => {
  const { data } = await finsightApi.get<RawPlan>(`/plans/${id}`);
  return mapPlan(data);
};

export const useGetPlan = (id?: number, options?: QueryOptions<Plan>) => {
  return useQuery({
    queryFn: () => getPlan(id!),
    queryKey: ["plan", id],
    enabled: id != null,
    ...options,
  });
};

const getPlanMembers = async (planId: number): Promise<PlanMember[]> => {
  const { data } = await finsightApi.get<PlanMember[]>(
    `/plans/${planId}/members`,
  );
  return data;
};

export const useGetPlanMembers = (
  planId?: number,
  options?: QueryOptions<PlanMember[]>,
) => {
  return useQuery({
    queryFn: () => getPlanMembers(planId!),
    queryKey: ["planMembers", planId],
    enabled: planId != null,
    ...options,
  });
};

const createPlan = async (payload: CreatePlanRequest): Promise<Plan> => {
  const { data } = await finsightApi.post<RawPlan>("/plans", payload.body);
  return mapPlan(data);
};

export const useCreatePlan = (
  options?: MutationOptions<Plan, CreatePlanRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    ...buildMutationOptions(
      { successMessage: "Plano criado com sucesso." },
      {
        ...options,
        onSuccess: (data, variables) => {
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          options?.onSuccess?.(data, variables);
        },
      },
    ),
  });
};

const updateMemberRole = async (
  payload: UpdateMemberRoleRequest,
): Promise<PlanMember> => {
  const { data } = await finsightApi.put<PlanMember>(
    `/plans/${payload.params.planId}/members/${payload.params.userId}`,
    payload.body,
  );
  return data;
};

export const useUpdateMemberRole = (
  options?: MutationOptions<PlanMember, UpdateMemberRoleRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMemberRole,
    ...buildMutationOptions(
      { successMessage: "Papel do membro atualizado com sucesso." },
      {
        ...options,
        onSuccess: (data, variables) => {
          queryClient.invalidateQueries({
            queryKey: ["planMembers", variables.params.planId],
          });
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          options?.onSuccess?.(data, variables);
        },
      },
    ),
  });
};

const removeMember = async (payload: RemoveMemberRequest): Promise<void> => {
  await finsightApi.delete(
    `/plans/${payload.params.planId}/members/${payload.params.userId}`,
  );
};

export const useRemoveMember = (
  options?: MutationOptions<void, RemoveMemberRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMember,
    ...buildMutationOptions(
      { successMessage: "Membro removido com sucesso." },
      {
        ...options,
        onSuccess: (data, variables) => {
          queryClient.invalidateQueries({
            queryKey: ["planMembers", variables.params.planId],
          });
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          options?.onSuccess?.(data, variables);
        },
      },
    ),
  });
};
