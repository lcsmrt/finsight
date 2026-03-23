import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/finsightApi";
import { User } from "../dtos/user";
import { MutationOptions } from "../types/mutationOptions";
import { buildMutationOptions } from "../utils/buildMutationOptions";

type LoginRequestParams = {
  email: string;
  password: string;
};

type LoginResponse = { token: string };

/**
 * Sends login request.
 * @param params Login credentials.
 * @returns Login response with token.
 */
const login = async (params: LoginRequestParams): Promise<LoginResponse> => {
  const { data } = await finsightApi.post("/auth/login", params);
  return data;
};

/**
 * Hook for performing user login.
 */
export const useLogin = (
  options?: MutationOptions<LoginResponse, LoginRequestParams>,
) => {
  return useMutation({
    mutationFn: login,
    ...buildMutationOptions({ successMessage: "Login realizado com sucesso." }, options),
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

type RegisterUserReqParams = {
  name: string;
  email: string;
  password: string;
};

/**
 * Sends a user registration request.
 * @param params Registration data.
 * @returns Created user.
 */
const registerUser = async (params: RegisterUserReqParams): Promise<User> => {
  const { data } = await finsightApi.post("/users", params);
  return data;
};

/**
 * Hook for performing user registration.
 */
export const useRegisterUser = (options?: MutationOptions<User, RegisterUserReqParams>) => {
  return useMutation({
    mutationFn: registerUser,
    ...buildMutationOptions({ successMessage: "Usuário cadastrado com sucesso." }, options),
  });
};
