import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/expansesManagerApi";
import { User } from "../types/user";

// LOGIN
type LoginReqParams = {
  email: string;
  password: string;
};

type LoginRes = { token: string };

/**
 * Sends login request.
 * @param params Login credentials.
 * @returns Login response with token.
 */
const login = async (params: LoginReqParams): Promise<LoginRes> => {
  const { data } = await finsightApi.post("/auth/login", params);
  return data;
};

/**
 * Hook for performing user login.
 */
export const useLogin = () => {
  return useMutation({
    mutationFn: login,
  });
};

// GET USER PROFILE
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

// USER REGISTRATION
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
export const useRegisterUser = () => {
  return useMutation({
    mutationFn: registerUser,
  });
};
