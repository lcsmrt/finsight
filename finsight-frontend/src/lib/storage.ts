export const STORAGE_KEYS = {
  accessToken: "accessToken",
  user: "user",
} as const;

/**
 * Stores a value in Local Storage.
 * @param key Storage key.
 * @param value Value to be stored.
 */
export function storeItem<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
}

/**
 * Retrieves a value from Local Storage.
 * @param key Storage key.
 * @returns Parsed value or null if not found.
 */
export function getItemFromStorage<T>(
  key: keyof typeof STORAGE_KEYS,
): T | null {
  const value = localStorage.getItem(STORAGE_KEYS[key]);
  return value ? JSON.parse(value) : null;
}

/**
 * Removes a value from Local Storage.
 * @param key Storage key.
 */
export function removeItemFromStorage(key: keyof typeof STORAGE_KEYS): void {
  localStorage.removeItem(STORAGE_KEYS[key]);
}

/**
 * Clears all Local Storage entries.
 */
export function clearStorage(): void {
  localStorage.clear();
}
