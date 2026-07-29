import { addEntry, deleteEntry, listEntries, updateEntry } from '../vaultStore';
import { __reset } from '../../../test/mocks/expo-secure-store';

describe('vaultStore', () => {
  beforeEach(() => {
    __reset();
  });

  it('adds an entry and lists it back with its secrets', async () => {
    const entry = await addEntry('Bank of America', 'jdoe', 'hunter2');
    const all = await listEntries();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: entry.id,
      label: 'Bank of America',
      username: 'jdoe',
      password: 'hunter2',
    });
  });

  it('lists newest entries first', async () => {
    const first = await addEntry('First', 'a', '1');
    await new Promise((r) => setTimeout(r, 2));
    const second = await addEntry('Second', 'b', '2');
    const all = await listEntries();
    expect(all.map((e) => e.id)).toEqual([second.id, first.id]);
  });

  it('updates the label without touching the secret', async () => {
    const entry = await addEntry('Old label', 'a', '1');
    await updateEntry(entry.id, { label: 'New label' });
    const all = await listEntries();
    const updated = all.find((e) => e.id === entry.id)!;
    expect(updated.label).toBe('New label');
    expect(updated.username).toBe('a');
    expect(updated.password).toBe('1');
  });

  it('updates the username/password without touching the label', async () => {
    const entry = await addEntry('Site', 'old-user', 'old-pass');
    await updateEntry(entry.id, { username: 'new-user', password: 'new-pass' });
    const all = await listEntries();
    const updated = all.find((e) => e.id === entry.id)!;
    expect(updated.label).toBe('Site');
    expect(updated.username).toBe('new-user');
    expect(updated.password).toBe('new-pass');
  });

  it('deletes an entry and its secret', async () => {
    const entry = await addEntry('Gone soon', 'a', '1');
    const before = await listEntries();
    expect(before.some((e) => e.id === entry.id)).toBe(true);
    await deleteEntry(entry.id);
    const after = await listEntries();
    expect(after.some((e) => e.id === entry.id)).toBe(false);
  });
});
