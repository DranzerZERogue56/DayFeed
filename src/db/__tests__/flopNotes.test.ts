import { initDb } from '../connection';
import {
  countFlopDescendants,
  countFlopNotes,
  createFlopNote,
  deleteFlopNote,
  getFlopAncestors,
  getFlopChildCounts,
  getFlopChildren,
  getFlopNote,
  getFlopSubtreeAudioUris,
  getRootFlopNotes,
  moveFlopNote,
  setFlopRelation,
  setFlopTranscript,
  updateFlopNote,
} from '../flopNotes';

// Date.now drives created_at/updated_at ordering; make it strictly monotonic so
// same-millisecond inserts can't produce ties.
let clock: number;
beforeEach(async () => {
  clock = new Date(2026, 6, 19).getTime();
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  const db = await initDb();
  await db.execAsync('DELETE FROM flop_notes;');
});

afterEach(() => {
  jest.restoreAllMocks();
});

const root = (content: string) => createFlopNote({ relation: 'root', type: 'text', content });

describe('creation and sort order', () => {
  it('forces relation to root when there is no parent', async () => {
    const r = await createFlopNote({ relation: 'support', type: 'text', content: 'top' });
    expect(r.parent_id).toBeNull();
    expect(r.relation).toBe('root');
  });

  it('appends each child to the end of its parent+relation sibling group', async () => {
    const r = await root('thesis');
    const s1 = await createFlopNote({ parent_id: r.id, relation: 'support', type: 'text', content: 's1' });
    const s2 = await createFlopNote({ parent_id: r.id, relation: 'support', type: 'text', content: 's2' });
    const o1 = await createFlopNote({ parent_id: r.id, relation: 'oppose', type: 'text', content: 'o1' });

    expect([s1.sort_order, s2.sort_order]).toEqual([0, 1]);
    expect(o1.sort_order).toBe(0); // each relation group numbers independently

    const children = await getFlopChildren(r.id);
    expect(children).toHaveLength(3);
  });
});

describe('roots and counts', () => {
  it('lists roots newest-touched first with per-relation child counts', async () => {
    const a = await root('A');
    const b = await root('B');
    await createFlopNote({ parent_id: a.id, relation: 'support', type: 'text', content: 'x' });
    await createFlopNote({ parent_id: a.id, relation: 'idea', type: 'text', content: 'y' });

    let roots = await getRootFlopNotes();
    expect(roots.map((r) => r.content)).toEqual(['B', 'A']); // B created later
    expect(roots[1].counts).toEqual({ support: 1, idea: 1, oppose: 0 });
    expect(roots[0].counts).toEqual({ support: 0, idea: 0, oppose: 0 });

    // Editing A bumps updated_at and reorders the list.
    await updateFlopNote(a.id, 'A edited');
    roots = await getRootFlopNotes();
    expect(roots.map((r) => r.content)).toEqual(['A edited', 'B']);
  });

  it('getFlopChildCounts groups by relation', async () => {
    const r = await root('thesis');
    await createFlopNote({ parent_id: r.id, relation: 'oppose', type: 'text', content: 'o1' });
    await createFlopNote({ parent_id: r.id, relation: 'oppose', type: 'text', content: 'o2' });
    expect(await getFlopChildCounts(r.id)).toEqual({ support: 0, idea: 0, oppose: 2 });
  });
});

describe('tree queries', () => {
  it('getFlopAncestors walks root-first, excluding the note itself', async () => {
    const r = await root('root title\nbody');
    const child = await createFlopNote({ parent_id: r.id, relation: 'idea', type: 'text', content: 'child' });
    const grand = await createFlopNote({ parent_id: child.id, relation: 'support', type: 'text', content: 'grand' });

    const crumbs = await getFlopAncestors(grand.id);
    expect(crumbs.map((c) => c.title)).toEqual(['root title', 'child']);
    expect(await getFlopAncestors(r.id)).toEqual([]);
  });

  it('counts descendants across the whole subtree', async () => {
    const r = await root('r');
    const c = await createFlopNote({ parent_id: r.id, relation: 'support', type: 'text', content: 'c' });
    await createFlopNote({ parent_id: c.id, relation: 'idea', type: 'text', content: 'gc' });
    expect(await countFlopDescendants(r.id)).toBe(2);
    expect(await countFlopDescendants(c.id)).toBe(1);
  });

  it('collects audio uris from the whole subtree including the note itself', async () => {
    const r = await createFlopNote({ relation: 'root', type: 'voice', audio_uri: 'file:///r.wav' });
    await createFlopNote({ parent_id: r.id, relation: 'idea', type: 'voice', audio_uri: 'file:///c.wav' });
    await createFlopNote({ parent_id: r.id, relation: 'idea', type: 'text', content: 'no audio' });
    expect((await getFlopSubtreeAudioUris(r.id)).sort()).toEqual(['file:///c.wav', 'file:///r.wav']);
  });

  it('deleting a note cascades to its entire subtree', async () => {
    const r = await root('r');
    const c = await createFlopNote({ parent_id: r.id, relation: 'support', type: 'text', content: 'c' });
    await createFlopNote({ parent_id: c.id, relation: 'idea', type: 'text', content: 'gc' });
    const other = await root('survivor');

    await deleteFlopNote(r.id);
    expect(await countFlopNotes()).toBe(1);
    expect(await getFlopNote(other.id)).not.toBeNull();
    expect(await getFlopNote(c.id)).toBeNull();
  });
});

describe('editing and reordering', () => {
  it('setFlopTranscript stores the transcript', async () => {
    const v = await createFlopNote({ relation: 'root', type: 'voice', audio_uri: 'file:///v.wav' });
    await setFlopTranscript(v.id, 'spoken words');
    expect((await getFlopNote(v.id))?.transcript).toBe('spoken words');
  });

  it('setFlopRelation moves a child to the end of its new group and never retypes roots', async () => {
    const r = await root('r');
    await createFlopNote({ parent_id: r.id, relation: 'oppose', type: 'text', content: 'o1' });
    const s = await createFlopNote({ parent_id: r.id, relation: 'support', type: 'text', content: 's' });

    await setFlopRelation(s.id, 'oppose');
    const moved = await getFlopNote(s.id);
    expect(moved?.relation).toBe('oppose');
    expect(moved?.sort_order).toBe(1); // after the existing oppose child

    await setFlopRelation(r.id, 'support'); // roots are ignored
    expect((await getFlopNote(r.id))?.relation).toBe('root');
  });

  it('moveFlopNote swaps with its neighbour and clamps at the edges', async () => {
    const r = await root('r');
    const a = await createFlopNote({ parent_id: r.id, relation: 'idea', type: 'text', content: 'a' });
    const b = await createFlopNote({ parent_id: r.id, relation: 'idea', type: 'text', content: 'b' });
    const c = await createFlopNote({ parent_id: r.id, relation: 'idea', type: 'text', content: 'c' });

    await moveFlopNote(b.id, 'up');
    let order = (await getFlopChildren(r.id)).map((n) => n.content);
    expect(order).toEqual(['b', 'a', 'c']);

    await moveFlopNote(b.id, 'up'); // already first — no-op
    order = (await getFlopChildren(r.id)).map((n) => n.content);
    expect(order).toEqual(['b', 'a', 'c']);

    await moveFlopNote(a.id, 'down');
    order = (await getFlopChildren(r.id)).map((n) => n.content);
    expect(order).toEqual(['b', 'c', 'a']);

    await moveFlopNote(c.id, 'up');
    order = (await getFlopChildren(r.id)).map((n) => n.content);
    expect(order).toEqual(['c', 'b', 'a']);
  });
});
