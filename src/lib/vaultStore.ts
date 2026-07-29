import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

// Password vault storage. Entries never touch the SQLite notes DB — each
// secret is its own expo-secure-store item (AES-encrypted at rest via Android
// Keystore / iOS Keychain), keyed by id, so no single item can grow past
// SecureStore's per-value size ceiling. A separate small index tracks which
// entries exist (id/label/created_at) so the list can be ordered/renamed
// without decrypting every secret.
const INDEX_KEY = 'vault_index';
const secretKey = (id: string) => `vault_secret_${id}`;

export interface VaultEntryMeta {
  id: string;
  /** What the entry is for, e.g. "Bank of America". */
  label: string;
  created_at: number;
}

export interface VaultEntry extends VaultEntryMeta {
  username: string;
  password: string;
}

async function readIndex(): Promise<VaultEntryMeta[]> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  return raw ? (JSON.parse(raw) as VaultEntryMeta[]) : [];
}

async function writeIndex(entries: VaultEntryMeta[]): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(entries));
}

/** All vault entries, newest first, secrets included. */
export async function listEntries(): Promise<VaultEntry[]> {
  const metas = await readIndex();
  const entries = await Promise.all(
    metas.map(async (meta) => {
      const raw = await SecureStore.getItemAsync(secretKey(meta.id));
      if (!raw) return null;
      const { username, password } = JSON.parse(raw) as { username: string; password: string };
      return { ...meta, username, password };
    }),
  );
  return entries
    .filter((e): e is VaultEntry => e !== null)
    .sort((a, b) => b.created_at - a.created_at);
}

export async function addEntry(
  label: string,
  username: string,
  password: string,
): Promise<VaultEntry> {
  const meta: VaultEntryMeta = { id: randomUUID(), label, created_at: Date.now() };
  await SecureStore.setItemAsync(secretKey(meta.id), JSON.stringify({ username, password }));
  const metas = await readIndex();
  await writeIndex([...metas, meta]);
  return { ...meta, username, password };
}

export async function updateEntry(
  id: string,
  fields: { label?: string; username?: string; password?: string },
): Promise<void> {
  if (fields.username !== undefined || fields.password !== undefined) {
    const raw = await SecureStore.getItemAsync(secretKey(id));
    const current = raw ? (JSON.parse(raw) as { username: string; password: string }) : null;
    if (current) {
      await SecureStore.setItemAsync(
        secretKey(id),
        JSON.stringify({
          username: fields.username ?? current.username,
          password: fields.password ?? current.password,
        }),
      );
    }
  }
  if (fields.label !== undefined) {
    const metas = await readIndex();
    await writeIndex(metas.map((m) => (m.id === id ? { ...m, label: fields.label! } : m)));
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const metas = await readIndex();
  await writeIndex(metas.filter((m) => m.id !== id));
  await SecureStore.deleteItemAsync(secretKey(id));
}
