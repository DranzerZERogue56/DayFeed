import { useEffect, useState } from 'react';
import { getFlyDayKeys, getFlyNotesByDay } from '../db/flyNotes';
import { getFlyStory } from '../db/flyStories';
import type { FlyNote, FlyStory } from '../db/flyTypes';
import { useNotes } from './NotesContext';

// Mirrors src/hooks/useQueries.ts, with one difference: there is no FlyProvider.
// Fly has a single screen, so its mutation counter lives in that screen's state
// and is passed in as `version` rather than pulled from a context. `ready`
// still comes from NotesContext — one database, opened once.

/** One day's Fly entries, oldest-first. Re-queried when `version` changes. */
export function useFlyDayNotes(dayKey: string, version: number) {
  const { ready } = useNotes();
  const [notes, setNotes] = useState<FlyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    getFlyNotesByDay(dayKey).then((rows) => {
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

/** A day's consolidated story, or null until it has been pasted back in. */
export function useFlyStory(dayKey: string, version: number) {
  const { ready } = useNotes();
  const [story, setStory] = useState<FlyStory | null>(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getFlyStory(dayKey).then((s) => {
      if (alive) setStory(s);
    });
    return () => {
      alive = false;
    };
  }, [dayKey, version, ready]);

  return story;
}

/** Distinct day_keys holding Fly entries; dots the date picker. */
export function useFlyDayKeys(version: number) {
  const { ready } = useNotes();
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getFlyDayKeys().then((k) => {
      if (alive) setKeys(k);
    });
    return () => {
      alive = false;
    };
  }, [version, ready]);

  return keys;
}
