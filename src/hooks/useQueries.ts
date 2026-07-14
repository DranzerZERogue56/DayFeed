import { useEffect, useState } from 'react';
import {
  getAgendaEntries,
  getAllNotes,
  getDayKeysWithNotes,
  getDayKeysWithAgenda,
  getDetectedDatesForDay,
  getNotesByDay,
  type AgendaEntry,
  type GetAllOptions,
} from '../db';
import type { Note } from '../db/types';
import { useNotes } from './NotesContext';

/** Notes for a single day, re-queried whenever data changes. */
export function useDayNotes(dayKey: string) {
  const { version, ready } = useNotes();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    getNotesByDay(dayKey).then((rows) => {
      if (alive) {
        setNotes(rows);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [dayKey, version, ready]);

  return { notes, loading };
}

/** All notes (newest-first) with optional type/search filters. */
export function useAllNotes(opts: GetAllOptions) {
  const { version, ready } = useNotes();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    getAllNotes(opts).then((rows) => {
      if (alive) {
        setNotes(rows);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.type, opts.search, version, ready]);

  return { notes, loading };
}

/** Distinct day_keys that have notes; used to badge the Flip view. */
export function useDayKeysWithNotes() {
  const { version, ready } = useNotes();
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getDayKeysWithNotes().then((k) => {
      if (alive) setKeys(k);
    });
    return () => {
      alive = false;
    };
  }, [version, ready]);

  return keys;
}

/** All agenda entries (detected dates joined to notes), chronological. */
export function useAgendaEntries() {
  const { version, ready } = useNotes();
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    getAgendaEntries().then((e) => {
      if (alive) {
        setEntries(e);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [version, ready]);

  return { entries, loading };
}

/** Agenda entries referring to a specific day (Flip day-page section). */
export function useDetectedDatesForDay(dayKey: string) {
  const { version, ready } = useNotes();
  const [entries, setEntries] = useState<AgendaEntry[]>([]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getDetectedDatesForDay(dayKey).then((e) => {
      if (alive) setEntries(e);
    });
    return () => {
      alive = false;
    };
  }, [dayKey, version, ready]);

  return entries;
}

/** Distinct date_keys that have agenda entries. */
export function useDayKeysWithAgenda() {
  const { version, ready } = useNotes();
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getDayKeysWithAgenda().then((k) => {
      if (alive) setKeys(k);
    });
    return () => {
      alive = false;
    };
  }, [version, ready]);

  return keys;
}
