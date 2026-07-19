import { initDb } from '../connection';
import {
  countNotes,
  createNote,
  deleteNote,
  getAllNotes,
  getDayKeysWithNotes,
  getNote,
  getNotesByDay,
  setTranscript,
} from '../notes';
import {
  addDetectedDates,
  getAgendaEntries,
  getDayKeysWithAgenda,
  getDetectedDatesForDay,
  getReminderIdsForNote,
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

    await setDetectedDateReminder(entry.id, 'notif-1');
    [entry] = await getAgendaEntries();
    expect(entry.reminder_id).toBe('notif-1');
    expect(await getReminderIdsForNote(n.id)).toEqual(['notif-1']);

    await setDetectedDateReminder(entry.id, null);
    [entry] = await getAgendaEntries();
    expect(entry.reminder_id).toBeNull();
    expect(await getReminderIdsForNote(n.id)).toEqual([]);
  });

  it('addDetectedDates is a no-op on an empty list', async () => {
    const n = await createNote({ type: 'text', content: 'no dates here' });
    await addDetectedDates(n.id, []);
    expect(await getAgendaEntries()).toHaveLength(0);
  });
});
