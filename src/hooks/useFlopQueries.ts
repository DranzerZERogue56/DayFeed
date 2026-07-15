import { useEffect, useState } from 'react';
import {
  getFlopAncestors,
  getFlopChildren,
  getFlopNote,
  getRootFlopNotes,
} from '../db';
import type { FlopCrumb, FlopNote, FlopRoot } from '../db/flopTypes';
import { useFlop } from './FlopContext';

// Every db call awaits initDb() internally, so these need no readiness gate —
// they just re-run whenever the Flop version bumps.

/** Root-level Flop notes with their relation counts, newest-touched first. */
export function useRootFlopNotes() {
  const { version } = useFlop();
  const [roots, setRoots] = useState<FlopRoot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getRootFlopNotes().then((rows) => {
      if (alive) {
        setRoots(rows);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [version]);

  return { roots, loading };
}

/** Everything one drill-in page needs: the note, its ancestors, and its children. */
export function useFlopPage(id: string) {
  const { version } = useFlop();
  const [note, setNote] = useState<FlopNote | null>(null);
  const [ancestors, setAncestors] = useState<FlopCrumb[]>([]);
  const [children, setChildren] = useState<FlopNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getFlopNote(id), getFlopAncestors(id), getFlopChildren(id)]).then(
      ([n, a, c]) => {
        if (!alive) return;
        setNote(n);
        setAncestors(a);
        setChildren(c);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [id, version]);

  return { note, ancestors, children, loading };
}
