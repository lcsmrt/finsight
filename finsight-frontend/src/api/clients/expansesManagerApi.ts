import { getItemFromStorage, STORAGE_KEYS } from "@/lib/storage";
import axios from "axios";

export const finsightApi = axios.create({
  baseURL: import.meta.env.VITE_FINSIGHT_API_URL,
});

finsightApi.interceptors.request.use(
  (config) => {
    const accessToken = getItemFromStorage(STORAGE_KEYS.accessToken);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

finsightApi.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);
