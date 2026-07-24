// Test stand-in for expo-secure-store: an in-memory key/value map with the
// same async surface vaultStore uses.
const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? store.get(key)! : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

/** Test-only: wipe all stored keys between tests. */
export function __reset(): void {
  store.clear();
}
