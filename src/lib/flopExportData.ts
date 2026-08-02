// Gathering the notes an export covers. The tree walk itself lives in
// flopExport.ts as a pure function; this loads the subtree into plain maps
// first so that function can stay synchronous and testable.
import { getFlopChildren, getFlopNote, getRootFlopNotes } from '../db';
import { getFlopAttachmentNames } from '../db/flopAttachments';
import type { FlopNote } from '../db/flopTypes';
import { flattenFlopTree, type FlopSection } from './flopExport';

/** How much of Flop one export covers. */
export type ExportScope = 'note' | 'subtree' | 'all';

export const SCOPE_LABEL: Record<ExportScope, string> = {
  note: 'This note only',
  subtree: 'This note and its children',
  all: 'Everything in Flop',
};

/** Breadth-first load of a subtree's children and attachment names. */
async function loadTree(rootIds: string[], includeChildren: boolean) {
  const childMap = new Map<string, FlopNote[]>();
  const attachMap = new Map<string, string[]>();
  const queue = [...rootIds];

  while (queue.length) {
    const id = queue.shift() as string;
    attachMap.set(id, await getFlopAttachmentNames(id));

    if (!includeChildren) continue;
    const kids = await getFlopChildren(id);
    childMap.set(id, kids);
    queue.push(...kids.map((k) => k.id));
  }

  return { childMap, attachMap };
}

/** The sections an export of `scope` should contain, and a title for the file. */
export async function collectExportSections(
  scope: ExportScope,
  noteId: string,
): Promise<{ sections: FlopSection[]; title: string } | null> {
  const roots =
    scope === 'all'
      ? await getRootFlopNotes()
      : await getFlopNote(noteId).then((n) => (n ? [n] : []));

  if (roots.length === 0) return null;

  const { childMap, attachMap } = await loadTree(
    roots.map((r) => r.id),
    scope !== 'note',
  );

  const sections = flattenFlopTree(
    roots,
    (id) => childMap.get(id) ?? [],
    (id) => attachMap.get(id) ?? [],
  );

  return {
    sections,
    title: scope === 'all' ? 'Flop' : sections[0].title,
  };
}
