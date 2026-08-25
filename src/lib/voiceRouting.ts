// Pulling a destination off the end of a dictated note.
//
// "Call the dentist on Friday, to Flop" should file a Flop note reading "Call
// the dentist on Friday" — the routing words are an instruction, not content.
//
// Flip is deliberately not a destination. It is a *view* of Feed days, not a
// place notes live, so "to Flip" would have nowhere to write to.

export const VOICE_DESTINATIONS = ['Feed', 'Flop', 'Fly'] as const;
export type VoiceDestination = (typeof VOICE_DESTINATIONS)[number];

export interface RoutedDictation {
  /** The note text, with the routing phrase removed. */
  content: string;
  /** Where it goes, or null if the user didn't say — caller should ask. */
  destination: VoiceDestination | null;
}

// Anchored to the END of the string on purpose. "Put the feed bins away" must
// stay a note about feed bins, so a bare mention mid-sentence is never a
// routing instruction; only a trailing "…, to Flop" is.
//
// Whisper punctuates and capitalises freely, so tolerate a leading comma, a
// trailing period, and any case. "send/save/add ... to X" is accepted too
// because it is how the phrase actually comes out loud.
const TRAILING_DESTINATION =
  /[\s,;—-]*(?:(?:and\s+)?(?:send|save|add|put|file)\s+(?:it\s+|this\s+|that\s+)?)?\b(?:to|in|into|on)\s+(feed|flop|fly)\b\s*[.!?]*\s*$/i;

/** Canonicalise a matched word to the tab name, whatever case it arrived in. */
function toDestination(word: string): VoiceDestination | null {
  const lower = word.toLowerCase();
  return VOICE_DESTINATIONS.find((d) => d.toLowerCase() === lower) ?? null;
}

/**
 * Split a dictated transcript into note text and an optional destination.
 *
 * Never returns a destination without also stripping it, and never strips
 * anything when it did not match — so a caller can always save `content`
 * verbatim regardless of which branch it took.
 */
export function parseDestination(text: string): RoutedDictation {
  const trimmed = text.trim();
  const match = TRAILING_DESTINATION.exec(trimmed);
  if (!match) return { content: trimmed, destination: null };

  const destination = toDestination(match[1]);
  const content = trimmed.slice(0, match.index).trim();

  // "To Flop." on its own is a routing phrase with no note attached. Treat it
  // as content rather than silently filing an empty note — the caller shows
  // the picker and the user can see what was heard.
  if (!content) return { content: trimmed, destination: null };

  // Strip a trailing comma left behind by "note text, to Flop".
  return { content: content.replace(/[\s,;]+$/, ''), destination };
}

/**
 * Decide what a note typed in `home`'s capture bar should do.
 *
 * Routing applies to typed text as well as dictated text, and it has to:
 * Wispr Flow injects its transcript through the accessibility service exactly
 * as a keyboard would, so DayFeed genuinely cannot tell a dictated note from a
 * typed one.
 *
 * `destination` comes back non-null only when it differs from `home`. Typing
 * "…to Feed" while standing in Feed still strips the routing words — they were
 * an instruction either way — but saves through the screen's own path rather
 * than round-tripping through the cross-tab router for no reason.
 */
export function planTypedNote(text: string, home: VoiceDestination): RoutedDictation {
  const { content, destination } = parseDestination(text);
  if (!destination) return { content, destination: null };
  return { content, destination: destination === home ? null : destination };
}
