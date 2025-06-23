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
