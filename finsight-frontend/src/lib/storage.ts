export const STORAGE_KEYS = {
  accessToken: "accessToken",
  user: "user",
} as const;

export function storeItem<T>(key: keyof typeof STORAGE_KEYS, value: T) {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
}

export function getItemFromStorage<T>(
  key: keyof typeof STORAGE_KEYS,
): T | null {
  const value = localStorage.getItem(STORAGE_KEYS[key]);
  return value ? JSON.parse(value) : null;
}

export function removeItemFromStorage(key: keyof typeof STORAGE_KEYS) {
  localStorage.removeItem(STORAGE_KEYS[key]);
}

export function clearStorage() {
  localStorage.clear();
}
