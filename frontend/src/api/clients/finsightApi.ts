import { getItemFromStorage, STORAGE_KEYS } from "@/lib/storage";
import axios from "axios";

let getAccessToken = () => getItemFromStorage(STORAGE_KEYS.accessToken);

export const setAccessTokenAccessor = (accessor: () => string | null) => {
  getAccessToken = accessor;
};

// In production the SPA is served by the same nginx that proxies /api to the API,
// so a same-origin path is all it needs — no build-time configuration. The env var
// only exists for development, where Vite serves the app and the API is elsewhere.
export const finsightApi = axios.create({
  baseURL: import.meta.env.VITE_FINSIGHT_API_URL ?? "/api/finsight",
});

finsightApi.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();

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
