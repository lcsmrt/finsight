import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { finsightApi } from "../clients/expansesManagerApi";
import { User } from "../types/user";

// LOGIN
type LoginReqParams = {
  email: string;
  password: string;
};

type LoginRes = { token: string };

const login = async (params: LoginReqParams): Promise<LoginRes> => {
  const { data } = await finsightApi.post("/auth/login", params);
  return data;
};

export const useLogin = () => {
  return useMutation({
    mutationFn: login,
  });
};

// BUSCA PERFIL DO USUÁRIO
const getUserProfile = async (): Promise<User> => {
  const { data } = await finsightApi.get("/auth/profile");
  return data;
};

export const useGetUserProfile = (
  options?: Omit<UseQueryOptions<User>, "queryKey">,
) => {
  return useQuery({
    queryFn: getUserProfile,
    queryKey: ["profile"],
    ...options,
  });
};

// CADASTRO DE USUÁRIO
type RegisterUserReqParams = {
  name: string;
  email: string;
  password: string;
};

const registerUser = async (params: RegisterUserReqParams): Promise<User> => {
  const { data } = await finsightApi.post("/users", params);
  return data;
};

export const useRegisterUser = () => {
  return useMutation({
    mutationFn: registerUser,
  });
};
