export const STORAGE_KEYS = {
  accessToken: "accessToken",
  user: "user",
} as const;

/**
 * Armazena um valor no Local Storage.
 * @param key Chave do valor armazenado.
 * @param value Valor armazenado.
 */
export function storeItem<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
}

/**
 * Busca um valor do Local Storage.
 * @param key Chave do valor a buscar.
 * @returns Valor armazenado.
 */
export function getItemFromStorage<T>(
  key: keyof typeof STORAGE_KEYS,
): T | null {
  const value = localStorage.getItem(STORAGE_KEYS[key]);
  return value ? JSON.parse(value) : null;
}

/**
 * Remove um valor do Local Storage.
 * @param key Chave do valor a remover.
 */
export function removeItemFromStorage(key: keyof typeof STORAGE_KEYS): void {
  localStorage.removeItem(STORAGE_KEYS[key]);
}

/**
 * Limpa tudo do Local Storage.
 */
export function clearStorage(): void {
  localStorage.clear();
}
