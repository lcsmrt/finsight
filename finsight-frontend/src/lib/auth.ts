import { getItemFromStorage, STORAGE_KEYS } from "./storage";

/**
 * Verifica se o usuário está logado checando a presença do token no Local Storage.
 * @returns Verdadeiro ou falso.
 */
export const isAuthenticated = (): boolean => {
  const token = getItemFromStorage(STORAGE_KEYS.accessToken);
  return !!token;
};
