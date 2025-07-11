import { useMutation } from "@tanstack/react-query";
import { finsightApi } from "../clients/expansesManagerApi";

type LoginParams = {
  email: string;
  password: string;
};

const login = async (params: LoginParams) => {
  const response = await finsightApi.post("/auth/login", params);
  return response;
};

export const useLogin = () => {
  return useMutation({
    mutationFn: login,
  });
};

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
