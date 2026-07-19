import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  AcceptInvitationResponse,
  CreateInvitationRequest,
  Invitation,
  InvitationPreview,
  RevokeInvitationRequest,
} from "../dtos";
import { MutationOptions } from "../types/mutationOptions";
import { QueryOptions } from "../types/queryOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";

const createInvitation = async (
  payload: CreateInvitationRequest,
): Promise<Invitation> => {
  const { data } = await finsightApi.post<Invitation>(
    `/plans/${payload.params.planId}/invitations`,
    payload.body,
  );
  return data;
};

export const useCreateInvitation = (
  options?: MutationOptions<Invitation, CreateInvitationRequest>,
) => {
  return useMutation({
    mutationFn: createInvitation,
    ...buildMutationOptions(
      { successMessage: "Invitation created successfully." },
      options,
    ),
  });
};

const getInvitationPreview = async (
  token: string,
): Promise<InvitationPreview> => {
  const { data } = await finsightApi.get<InvitationPreview>(
    `/invitations/${token}`,
  );
  return data;
};

export const useGetInvitationPreview = (
  token?: string,
  options?: QueryOptions<InvitationPreview>,
) => {
  return useQuery({
    queryFn: () => getInvitationPreview(token!),
    queryKey: ["invitationPreview", token],
    enabled: token != null,
    retry: false,
    ...options,
  });
};

const getPlanInvitations = async (planId: number): Promise<Invitation[]> => {
  const { data } = await finsightApi.get<Invitation[]>(
    `/plans/${planId}/invitations`,
  );
  return data;
};

export const useGetPlanInvitations = (
  planId?: number,
  options?: QueryOptions<Invitation[]>,
) => {
  return useQuery({
    queryFn: () => getPlanInvitations(planId!),
    queryKey: ["invitations", planId],
    enabled: planId != null,
    ...options,
  });
};

const revokeInvitation = async (
  payload: RevokeInvitationRequest,
): Promise<void> => {
  await finsightApi.delete(
    `/plans/${payload.params.planId}/invitations/${payload.params.invitationId}`,
  );
};

export const useRevokeInvitation = (
  options?: MutationOptions<void, RevokeInvitationRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeInvitation,
    ...buildMutationOptions(
      { successMessage: "Invitation revoked successfully." },
      {
        ...options,
        onSuccess: (data, variables) => {
          queryClient.invalidateQueries({
            queryKey: ["invitations", variables.params.planId],
          });
          options?.onSuccess?.(data, variables);
        },
      },
    ),
  });
};

const acceptInvitation = async (
  token: string,
): Promise<AcceptInvitationResponse> => {
  const { data } = await finsightApi.post<AcceptInvitationResponse>(
    `/invitations/${token}/accept`,
  );
  return data;
};

export const useAcceptInvitation = (
  options?: MutationOptions<AcceptInvitationResponse, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    ...buildMutationOptions(
      { successMessage: "Invitation accepted successfully." },
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
