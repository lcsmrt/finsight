import { getItemFromStorage, STORAGE_KEYS } from "./storage";

/**
 * Checks if the user is authenticated by verifying the token in Local Storage.
 * @returns True if token exists, false otherwise.
 */
export const isAuthenticated = (): boolean => {
  const token = getItemFromStorage(STORAGE_KEYS.accessToken);
  return !!token;
};
