import { useMutation, useQuery } from "@tanstack/react-query";
import { finsightApi } from "../clients/expansesManagerApi";

// LOGIN
type LoginParams = {
  email: string;
  password: string;
};

const login = async (params: LoginParams) => {
  const { data } = await finsightApi.post("/auth/login", params);
  return data;
};

export const useLogin = () => {
  return useMutation({
    mutationFn: login,
  });
};

// CADASTRO DE USUÁRIO
type RegisterUserParams = {
  name: string;
  email: string;
  password: string;
};

const registerUser = async (params: RegisterUserParams) => {
  const response = await finsightApi.post("/users", params);
  return response;
};

export const useRegisterUser = () => {
  return useMutation({
    mutationFn: registerUser,
  });
};

// BUSCA PERFIL DO USUÁRIO
const getUserProfile = async () => {
  const { data } = await finsightApi.get("/auth/profile");
  return data;
};

export const useGetUserProfile = () => {
  return useQuery({
    queryFn: getUserProfile,
    queryKey: ["profile"],
  });
};

export const useControlledGetUserProfile = () => {
  return useMutation({
    mutationFn: getUserProfile,
  });
};
