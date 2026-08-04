import { initDb } from '../connection';
import {
  countNotes,
  createNote,
  deleteNote,
  getAllNotes,
  getDayKeysWithNotes,
  getNote,
  getExpiredNotes,
  getNotesByDay,
  setNoteExpiry,
  setTranscript,
} from '../notes';
import {
  addDetectedDates,
  deleteDetectedDatesForNote,
  getAgendaEntries,
  getDayKeysWithAgenda,
  getDetectedDatesForDay,
  getReminderIdsForNote,
  setDetectedDateCompleted,
  setDetectedDateReminder,
} from '../detectedDates';

const at = (y: number, mo: number, d: number, h = 9) => new Date(y, mo - 1, d, h).getTime();

beforeEach(async () => {
  const db = await initDb();
  await db.execAsync('DELETE FROM detected_dates; DELETE FROM notes;');
});

describe('notes CRUD', () => {
  it('derives day_key from created_at and stores defaults', async () => {
    const note = await createNote({ type: 'text', content: 'hello', created_at: at(2026, 7, 19) });
    expect(note.day_key).toBe('2026-07-19');
    expect(note.tags).toBe('[]');
    expect(await getNote(note.id)).toMatchObject({ content: 'hello', day_key: '2026-07-19' });
  });

  it('getNotesByDay returns only that day, oldest-first', async () => {
    await createNote({ type: 'text', content: 'b', created_at: at(2026, 7, 19, 10) });
    await createNote({ type: 'text', content: 'a', created_at: at(2026, 7, 19, 8) });
    await createNote({ type: 'text', content: 'other day', created_at: at(2026, 7, 20) });

    const day = await getNotesByDay('2026-07-19');
    expect(day.map((n) => n.content)).toEqual(['a', 'b']);
  });

  it('getAllNotes filters by type and searches content and transcript', async () => {
    await createNote({ type: 'text', content: 'grocery list', created_at: at(2026, 7, 18) });
    const voice = await createNote({
      type: 'voice',
      audio_uri: 'file:///v.wav',
      duration_ms: 1200,
      created_at: at(2026, 7, 19),
    });
    await setTranscript(voice.id, 'remember the GROCERIES');

    const all = await getAllNotes();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(voice.id); // newest first

    expect(await getAllNotes({ type: 'voice' })).toHaveLength(1);
    // case-insensitive, matches content of one and transcript of the other
    expect(await getAllNotes({ search: 'groc' })).toHaveLength(2);
    expect(await getAllNotes({ type: 'text', search: 'groc' })).toHaveLength(1);
    expect(await getAllNotes({ search: 'nothing here' })).toHaveLength(0);
  });

  it('getDayKeysWithNotes is distinct and ascending', async () => {
    await createNote({ type: 'text', content: 'x', created_at: at(2026, 7, 20) });
    await createNote({ type: 'text', content: 'y', created_at: at(2026, 7, 18) });
    await createNote({ type: 'text', content: 'z', created_at: at(2026, 7, 18, 15) });
    expect(await getDayKeysWithNotes()).toEqual(['2026-07-18', '2026-07-20']);
  });

  it('deleteNote removes the row', async () => {
    const n = await createNote({ type: 'text', content: 'bye' });
    await deleteNote(n.id);
    expect(await getNote(n.id)).toBeNull();
    expect(await countNotes()).toBe(0);
  });
});

describe('detected dates / agenda', () => {
  it('joins agenda entries to their source note, chronological by date_key', async () => {
    const n1 = await createNote({ type: 'text', content: 'ship on Aug 1', created_at: at(2026, 7, 19) });
    const n2 = await createNote({ type: 'text', content: 'review Jul 25', created_at: at(2026, 7, 19, 10) });
    await addDetectedDates(n1.id, [{ date_key: '2026-08-01', snippet: 'ship on Aug 1' }]);
    await addDetectedDates(n2.id, [{ date_key: '2026-07-25', snippet: 'review Jul 25' }]);

    const agenda = await getAgendaEntries();
    expect(agenda.map((e) => e.date_key)).toEqual(['2026-07-25', '2026-08-01']);
    expect(agenda[1].note.content).toBe('ship on Aug 1');

    const day = await getDetectedDatesForDay('2026-07-25');
    expect(day).toHaveLength(1);
    expect(day[0].note.id).toBe(n2.id);

    expect(await getDayKeysWithAgenda()).toEqual(['2026-07-25', '2026-08-01']);
  });

  it('cascade-deletes detected dates when their note is deleted', async () => {
    const n = await createNote({ type: 'text', content: 'dentist on the 25th' });
    await addDetectedDates(n.id, [{ date_key: '2026-07-25', snippet: 'dentist on the 25th' }]);
    expect(await getAgendaEntries()).toHaveLength(1);

    await deleteNote(n.id);
    expect(await getAgendaEntries()).toHaveLength(0);
    expect(await getDayKeysWithAgenda()).toEqual([]);
  });

  it('sets and clears a reminder id, surfacing it on agenda entries', async () => {
    const n = await createNote({ type: 'text', content: 'dentist on the 25th' });
    await addDetectedDates(n.id, [{ date_key: '2026-07-25', snippet: 'dentist on the 25th' }]);
    let [entry] = await getAgendaEntries();
    expect(entry.reminder_id).toBeNull();
    expect(entry.reminder_hour).toBeNull();
    expect(entry.reminder_minute).toBeNull();

    await setDetectedDateReminder(entry.id, 'notif-1', { hour: 14, minute: 30 });
    [entry] = await getAgendaEntries();
    expect(entry.reminder_id).toBe('notif-1');
    expect(entry.reminder_hour).toBe(14);
    expect(entry.reminder_minute).toBe(30);
    expect(await getReminderIdsForNote(n.id)).toEqual(['notif-1']);

    await setDetectedDateReminder(entry.id, null);
    [entry] = await getAgendaEntries();
    expect(entry.reminder_id).toBeNull();
    expect(entry.reminder_hour).toBeNull();
    expect(entry.reminder_minute).toBeNull();
    expect(await getReminderIdsForNote(n.id)).toEqual([]);
  });

  it('addDetectedDates is a no-op on an empty list', async () => {
    const n = await createNote({ type: 'text', content: 'no dates here' });
    await addDetectedDates(n.id, []);
    expect(await getAgendaEntries()).toHaveLength(0);
  });

  it('deleteDetectedDatesForNote clears only that note\'s rows, so re-detecting replaces instead of duplicating', async () => {
    const n1 = await createNote({ type: 'voice', created_at: at(2026, 7, 19) });
    const n2 = await createNote({ type: 'text', content: 'review Jul 25', created_at: at(2026, 7, 19) });
    await addDetectedDates(n1.id, [{ date_key: '2026-08-01', snippet: 'call mom on Friday' }]);
    await addDetectedDates(n2.id, [{ date_key: '2026-07-25', snippet: 'review Jul 25' }]);
    expect(await getAgendaEntries()).toHaveLength(2);

    // Simulate re-transcribing n1: clear its old dates before re-detecting.
    await deleteDetectedDatesForNote(n1.id);
    await addDetectedDates(n1.id, [{ date_key: '2026-08-01', snippet: 'call mom on Friday' }]);

    const agenda = await getAgendaEntries();
    expect(agenda).toHaveLength(2);
    expect(agenda.filter((e) => e.note_id === n1.id)).toHaveLength(1);
    expect(agenda.filter((e) => e.note_id === n2.id)).toHaveLength(1);
  });
});


describe('expiring notes', () => {
  const DEADLINE = new Date(2026, 7, 4, 23, 59, 0, 0).getTime();

  it('a new note is not tagged to expire', async () => {
    const n = await createNote({ type: 'text', content: 'plain' });
    expect(n.expires_at).toBeNull();
    expect(await getExpiredNotes(DEADLINE + 1)).toEqual([]);
  });

  it('returns a note once its deadline has arrived', async () => {
    const n = await createNote({ type: 'text', content: 'gone tonight' });
    await setNoteExpiry(n.id, DEADLINE);

    expect(await getExpiredNotes(DEADLINE - 1)).toEqual([]);
    const due = await getExpiredNotes(DEADLINE);
    expect(due.map((r) => r.id)).toEqual([n.id]);
  });

  it('leaves untagged notes alone however late it gets', async () => {
    await createNote({ type: 'text', content: 'keep me' });
    const doomed = await createNote({ type: 'text', content: 'delete me' });
    await setNoteExpiry(doomed.id, DEADLINE);

    const due = await getExpiredNotes(DEADLINE + 86_400_000);
    expect(due.map((r) => r.content)).toEqual(['delete me']);
  });

  it('untagging takes a note back out of the sweep', async () => {
    const n = await createNote({ type: 'text', content: 'reprieved' });
    await setNoteExpiry(n.id, DEADLINE);
    await setNoteExpiry(n.id, null);

    expect(await getExpiredNotes(DEADLINE + 1)).toEqual([]);
    expect((await getNote(n.id))?.expires_at).toBeNull();
  });

  it('covers voice notes, which carry an audio file to clean up', async () => {
    const v = await createNote({ type: 'voice', audio_uri: 'file:///a.m4a' });
    await setNoteExpiry(v.id, DEADLINE);
    const due = await getExpiredNotes(DEADLINE);
    expect(due[0].audio_uri).toBe('file:///a.m4a');
  });
});

describe('completing agenda entries', () => {
  it('starts outstanding and round-trips through done and back', async () => {
    const n = await createNote({ type: 'text', content: 'call Sam next Friday' });
    await addDetectedDates(n.id, [{ date_key: '2026-08-07', snippet: 'call Sam' }]);

    const [before] = await getAgendaEntries();
    expect(before.completed_at).toBeNull();

    await setDetectedDateCompleted(before.id, 1_700_000_000_000);
    expect((await getAgendaEntries())[0].completed_at).toBe(1_700_000_000_000);

    await setDetectedDateCompleted(before.id, null);
    expect((await getAgendaEntries())[0].completed_at).toBeNull();
  });

  it('completes one entry of a note without touching its siblings', async () => {
    // One note can mention several dates; finishing one says nothing about
    // the rest, which is why completion is per-entry and not per-note.
    const n = await createNote({ type: 'text', content: 'two dates' });
    await addDetectedDates(n.id, [
      { date_key: '2026-08-07', snippet: 'first' },
      { date_key: '2026-08-09', snippet: 'second' },
    ]);

    const entries = await getAgendaEntries();
    await setDetectedDateCompleted(entries[0].id, 1_700_000_000_000);

    const after = await getAgendaEntries();
    expect(after.find((e) => e.id === entries[0].id)?.completed_at).toBe(1_700_000_000_000);
    expect(after.find((e) => e.id === entries[1].id)?.completed_at).toBeNull();
  });
});
