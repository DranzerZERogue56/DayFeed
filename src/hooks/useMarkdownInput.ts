import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { continueListOnEnter, normalizeCheckboxTrigger } from '../lib/markdownList';

/** First index where two strings diverge, or -1 if they're identical. */
function firstDiffIndex(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i++;
  return i < b.length ? i : -1;
}

/**
 * Given a controlled TextInput's previous and next value after a single
 * keystroke, apply markdown auto-continue-list/normalize-checkbox
 * transforms. Returns null when no transform applies (the caller should
 * just use `next` unchanged) — including multi-character pastes/autocorrect
 * inserts, which this only ever ignores rather than mis-transforms.
 */
export function applyMarkdownEdit(
  prev: string,
  next: string,
): { text: string; cursor: number } | null {
  if (next.length !== prev.length + 1) return null;
  const at = firstDiffIndex(prev, next);
  if (at === -1) return null;
  if (next[at] === '\n') return continueListOnEnter(next, at + 1);
  if (next[at] === ' ') return normalizeCheckboxTrigger(next, at + 1);
  return null;
}

/**
 * A TextInput ref plus a helper to move its cursor after a programmatic text
 * change — the native view needs the new value applied before the selection
 * can be moved there, so this runs after the current render commits. Shared
 * by useMarkdownInput and callers that own their own text state (an
 * in-place editor toggled between null/string, where a fresh useState per
 * render isn't an option since hooks can't be called conditionally).
 */
export function useMarkdownCursorRef() {
  const inputRef = useRef<TextInput>(null);
  const moveCursor = (cursor: number) => {
    setTimeout(() => inputRef.current?.setSelection(cursor, cursor), 0);
  };
  return { inputRef, moveCursor };
}

/**
 * Drop-in replacement for a controlled TextInput's `useState` + `onChangeText`
 * pair that auto-continues markdown lists on Enter and normalizes the "[] "
 * checkbox trigger.
 */
export function useMarkdownInput(initial = '') {
  const [value, setValue] = useState(initial);
  const { inputRef, moveCursor } = useMarkdownCursorRef();

  const onChangeText = (next: string) => {
    const result = applyMarkdownEdit(value, next);
    if (result) {
      setValue(result.text);
      moveCursor(result.cursor);
    } else {
      setValue(next);
    }
  };

  return { value, onChangeText, inputRef, setValue };
}
