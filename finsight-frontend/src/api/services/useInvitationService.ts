import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import {
  AcceptInvitationResponse,
  CreateInvitationRequest,
  Invitation,
  InvitationPreview,
} from "../dtos";
import { MutationOptions } from "../types/mutationOptions";
import { QueryOptions } from "../types/queryOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";

const createInvitation = async (
  payload: CreateInvitationRequest,
): Promise<Invitation> => {
  const { data } = await finsightApi.post(
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
      { successMessage: "Convite criado com sucesso." },
      options,
    ),
  });
};

const getInvitationPreview = async (
  token: string,
): Promise<InvitationPreview> => {
  const { data } = await finsightApi.get(`/invitations/${token}`);
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

const acceptInvitation = async (
  token: string,
): Promise<AcceptInvitationResponse> => {
  const { data } = await finsightApi.post(`/invitations/${token}/accept`);
  return data;
};

export const useAcceptInvitation = (
  options?: MutationOptions<AcceptInvitationResponse, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    ...buildMutationOptions(
      { successMessage: "Convite aceito com sucesso." },
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
