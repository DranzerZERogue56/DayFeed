import { initDb } from '../connection';
import { createFlopNote, deleteFlopNote } from '../flopNotes';
import {
  addFlopAttachment,
  deleteFlopAttachment,
  getFlopAttachment,
  getFlopAttachmentNames,
  getFlopAttachments,
  getFlopSubtreeAttachmentUris,
  setFlopAttachmentText,
} from '../flopAttachments';

let clock: number;
beforeEach(async () => {
  clock = new Date(2026, 7, 2).getTime();
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  const db = await initDb();
  await db.execAsync('DELETE FROM flop_attachments;');
  await db.execAsync('DELETE FROM flop_notes;');
});

afterEach(() => {
  jest.restoreAllMocks();
});

const rootNote = () => createFlopNote({ relation: 'root', type: 'text', content: 'Root' });

const file = (name: string, extractedText: string | null = null) => ({
  name,
  uri: `file:///docs/${name}`,
  mime: 'application/octet-stream',
  size: 1024,
  extractedText,
});

describe('addFlopAttachment / getFlopAttachments', () => {
  it('stores a document against its note', async () => {
    const note = await rootNote();
    await addFlopAttachment(note.id, file('spec.docx', 'the spec text'));

    const [row] = await getFlopAttachments(note.id);
    expect(row.name).toBe('spec.docx');
    expect(row.uri).toBe('file:///docs/spec.docx');
    expect(row.size).toBe(1024);
    expect(row.extracted_text).toBe('the spec text');
  });

  it('defaults the optional fields to null', async () => {
    const note = await rootNote();
    await addFlopAttachment(note.id, { name: 'a.pdf', uri: 'file:///docs/a.pdf' });

    const [row] = await getFlopAttachments(note.id);
    expect(row.mime).toBeNull();
    expect(row.size).toBeNull();
    expect(row.extracted_text).toBeNull();
  });

  it('returns attachments oldest first', async () => {
    const note = await rootNote();
    await addFlopAttachment(note.id, file('first.txt'));
    await addFlopAttachment(note.id, file('second.txt'));

    expect((await getFlopAttachments(note.id)).map((a) => a.name)).toEqual([
      'first.txt',
      'second.txt',
    ]);
  });

  it('keeps one note’s attachments separate from another’s', async () => {
    const a = await rootNote();
    const b = await rootNote();
    await addFlopAttachment(a.id, file('a.txt'));

    expect(await getFlopAttachments(b.id)).toEqual([]);
  });

  it('returns an empty list for a note with no files', async () => {
    const note = await rootNote();
    expect(await getFlopAttachments(note.id)).toEqual([]);
  });
});

describe('setFlopAttachmentText', () => {
  it('fills in text extracted after the row was inserted', async () => {
    const note = await rootNote();
    const row = await addFlopAttachment(note.id, file('late.docx'));
    expect(row.extracted_text).toBeNull();

    await setFlopAttachmentText(row.id, 'extracted later');
    expect((await getFlopAttachment(row.id))?.extracted_text).toBe('extracted later');
  });

  it('can clear text back to null', async () => {
    const note = await rootNote();
    const row = await addFlopAttachment(note.id, file('x.txt', 'some text'));

    await setFlopAttachmentText(row.id, null);
    expect((await getFlopAttachment(row.id))?.extracted_text).toBeNull();
  });
});

describe('deleteFlopAttachment', () => {
  it('removes one attachment and leaves the others', async () => {
    const note = await rootNote();
    const gone = await addFlopAttachment(note.id, file('gone.txt'));
    await addFlopAttachment(note.id, file('kept.txt'));

    await deleteFlopAttachment(gone.id);

    expect((await getFlopAttachments(note.id)).map((a) => a.name)).toEqual(['kept.txt']);
    expect(await getFlopAttachment(gone.id)).toBeNull();
  });
});

describe('cascade with the note', () => {
  it('drops attachment rows when their note is deleted', async () => {
    const note = await rootNote();
    await addFlopAttachment(note.id, file('doomed.txt'));

    await deleteFlopNote(note.id);

    expect(await getFlopAttachments(note.id)).toEqual([]);
  });
});

describe('getFlopSubtreeAttachmentUris', () => {
  it('collects files from the note and its whole subtree, for cleanup', async () => {
    const root = await rootNote();
    const child = await createFlopNote({
      parent_id: root.id,
      relation: 'support',
      type: 'text',
      content: 'Child',
    });
    const grandchild = await createFlopNote({
      parent_id: child.id,
      relation: 'idea',
      type: 'text',
      content: 'Grandchild',
    });

    await addFlopAttachment(root.id, file('root.txt'));
    await addFlopAttachment(child.id, file('child.txt'));
    await addFlopAttachment(grandchild.id, file('grandchild.txt'));

    const uris = await getFlopSubtreeAttachmentUris(root.id);
    expect(uris.sort()).toEqual([
      'file:///docs/child.txt',
      'file:///docs/grandchild.txt',
      'file:///docs/root.txt',
    ]);
  });

  it('does not reach into a sibling subtree', async () => {
    const a = await rootNote();
    const b = await rootNote();
    await addFlopAttachment(a.id, file('mine.txt'));
    await addFlopAttachment(b.id, file('theirs.txt'));

    expect(await getFlopSubtreeAttachmentUris(a.id)).toEqual(['file:///docs/mine.txt']);
  });

  it('returns empty for a note with no files anywhere in its subtree', async () => {
    const note = await rootNote();
    expect(await getFlopSubtreeAttachmentUris(note.id)).toEqual([]);
  });
});

describe('getFlopAttachmentNames', () => {
  it('lists just the display names, for an export', async () => {
    const note = await rootNote();
    await addFlopAttachment(note.id, file('one.docx'));
    await addFlopAttachment(note.id, file('two.pdf'));

    expect(await getFlopAttachmentNames(note.id)).toEqual(['one.docx', 'two.pdf']);
  });
});
