import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import { RegisterUserRequest, User } from "../dtos/user";
import { MutationOptions } from "../types/mutationOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";
import { LoginRequest, LoginResponse } from "../dtos";

/**
 * Sends login request.
 * @param params Login credentials.
 * @returns Login response with token.
 */
const login = async (params: LoginRequest): Promise<LoginResponse> => {
  const { body } = params;
  const { data } = await finsightApi.post("/auth/login", body);
  return data;
};

/**
 * Hook for performing user login.
 */
export const useLogin = (
  options?: MutationOptions<LoginResponse, LoginRequest>,
) => {
  return useMutation({
    mutationFn: login,
    ...buildMutationOptions({ showSuccessToast: false }, options),
  });
};

/**
 * Fetches the authenticated user's profile.
 * @returns User data.
 */
const getUserProfile = async (): Promise<User> => {
  const { data } = await finsightApi.get("/auth/profile");
  return data;
};

/**
 * Hook for fetching the authenticated user's profile.
 */
export const useGetUserProfile = (
  options?: Omit<UseQueryOptions<User>, "queryKey">,
) => {
  return useQuery({
    queryFn: getUserProfile,
    queryKey: ["profile"],
    ...options,
  });
};

/**
 * Sends a user registration request.
 * @param params Registration data.
 * @returns Created user.
 */
const registerUser = async (params: RegisterUserRequest): Promise<User> => {
  const { body } = params;
  const { data } = await finsightApi.post("/users", body);
  return data;
};

/**
 * Hook for performing user registration.
 */
export const useRegisterUser = (
  options?: MutationOptions<User, RegisterUserRequest>,
) => {
  return useMutation({
    mutationFn: registerUser,
    ...buildMutationOptions(
      { successMessage: "Usuário cadastrado com sucesso." },
      options,
    ),
  });
};
