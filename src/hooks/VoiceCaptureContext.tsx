import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { Buffer } from 'buffer';
import { Endpointer, pcm16, rms } from '../lib/audioFeatures';
import { acquire, ensureMicPermission, release } from '../lib/micBus';
import { enqueueTranscription } from '../lib/transcribeQueue';
import { transcribeAudio } from '../lib/transcription';
import { deleteWav, writeWavToCache } from '../lib/wavFile';
import { parseDestination, type VoiceDestination } from '../lib/voiceRouting';
import { createFlyNote, deleteFlyNote } from '../db/flyNotes';
import { useNotes } from './NotesContext';
import { useFlop } from './FlopContext';

// Voice dictation: speak a note into existence and say where it goes.
//
// Mounted once at the app root rather than per-screen, for two reasons. It has
// to outlive tab switches — a transcription started on Feed must still land if
// you wander to Flop while whisper is working — and the wake-word detector
// needs exactly one entry point to trigger, the same one the button uses.
//
// Split into two contexts on purpose. The mic level updates several times a
// second while listening, and every consumer of a context re-renders when its
// value changes — so the actions (which never change identity) live apart from
// the state (which changes constantly). A button that only wants `open` should
// not re-render on every waveform frame.

/** The mic owner id. Distinct from 'recorder' so the two never overwrite. */
const OWNER = 'dictation';
/** 32 ms at 16 kHz. Fine-grained enough to end an utterance promptly. */
const FRAME_SAMPLES = 512;
/** Frames of speech before we believe it. ~96 ms. */
const START_FRAMES = 3;
/** Frames of silence that end the note. ~1.4 s — the "it stopped by itself" feel. */
const END_FRAMES = 45;
/** Give up if nothing is said at all. */
const NO_SPEECH_MS = 6000;
/** Hard cap, so a pocket-dial can't record until the disk fills. */
const MAX_MS = 30000;
/** How long the undo bar stays up after a routed save. */
const UNDO_MS = 6000;

export type VoicePhase =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'confirming'
  | 'saved'
  | 'error';

export interface VoiceCaptureState {
  phase: VoicePhase;
  /** Live mic level 0..1 while listening, for the waveform. */
  level: number;
  /** Whether any speech has been heard yet this session. */
  heard: boolean;
  /** The transcript, once there is one. */
  transcript: string;
  /** Where the note was filed, once it has been. */
  savedTo: VoiceDestination | null;
  error: string | null;
}

export interface VoiceCaptureActions {
  /** Begin a dictation. No-op if one is already in flight. */
  open: () => void;
  /** Stop listening early and transcribe what we have. */
  finishNow: () => void;
  /** File the pending transcript in `destination`. */
  chooseDestination: (destination: VoiceDestination) => void;
  /** Undo the last routed save. */
  undoSave: () => void;
  /** Abandon whatever is on screen. */
  dismiss: () => void;
}

const IDLE: VoiceCaptureState = {
  phase: 'idle',
  level: 0,
  heard: false,
  transcript: '',
  savedTo: null,
  error: null,
};

const StateContext = createContext<VoiceCaptureState | null>(null);
const ActionsContext = createContext<VoiceCaptureActions | null>(null);

export function VoiceCaptureProvider({ children }: { children: React.ReactNode }) {
  const { addNote, removeNote } = useNotes();
  const { addFlopNote, removeFlopNote } = useFlop();

  const [state, setState] = useState<VoiceCaptureState>(IDLE);

  // Everything the callbacks read lives in refs as well as state, so that every
  // action below can be built once with no dependencies. That is what keeps the
  // actions context value stable across a listening session.
  const phaseRef = useRef<VoicePhase>('idle');
  const transcriptRef = useRef('');
  const undoRef = useRef<(() => Promise<void>) | null>(null);

  const patch = useCallback((next: Partial<VoiceCaptureState>) => {
    if (next.phase) phaseRef.current = next.phase;
    if (next.transcript !== undefined) transcriptRef.current = next.transcript;
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  // Audio state: written from the mic callback many times a second, so it must
  // never touch React state directly.
  const chunksRef = useRef<Buffer[]>([]);
  const endpointerRef = useRef(
    new Endpointer({ startFrames: START_FRAMES, endFrames: END_FRAMES }),
  );
  const heardRef = useRef(false);
  const listeningRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Bumped by open() and by anything that abandons a session. Whisper cannot be
  // cancelled once started, so a transcription that lands after the user backed
  // out has to be dropped on arrival — otherwise cancelling during
  // "Transcribing…" would still file a note some seconds later.
  const sessionRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  /** Stop the mic and hand back whatever PCM was collected. */
  const stopListening = useCallback((): Buffer[] => {
    if (!listeningRef.current) return [];
    listeningRef.current = false;
    release(OWNER);
    clearTimers();
    const chunks = chunksRef.current;
    chunksRef.current = [];
    return chunks;
  }, [clearTimers]);

  const saveTo = useCallback(
    async (destination: VoiceDestination, content: string): Promise<() => Promise<void>> => {
      if (destination === 'Feed') {
        // Through the provider, not createNote: this is what runs chrono date
        // detection into the Agenda and bumps every Feed query.
        const note = await addNote({ type: 'text', content });
        return () => removeNote(note.id);
      }
      if (destination === 'Flop') {
        // parent_id null forces relation 'root' inside createFlopNote; a
        // dictated thought has no parent to attach to.
        const note = await addFlopNote({
          parent_id: null,
          relation: 'root',
          type: 'text',
          content,
        });
        return () => removeFlopNote(note.id);
      }
      // Fly has no provider — FlyScreen owns its version counter and re-reads
      // on focus, so writing straight to the db is correct here.
      const note = await createFlyNote({ type: 'text', content });
      return () => deleteFlyNote(note.id);
    },
    [addNote, removeNote, addFlopNote, removeFlopNote],
  );

  const commit = useCallback(
    async (destination: VoiceDestination, content: string) => {
      try {
        undoRef.current = await saveTo(destination, content);
        patch({ phase: 'saved', savedTo: destination, level: 0 });
        later(() => patch({ phase: 'idle' }), UNDO_MS);
      } catch {
        patch({ phase: 'error', error: 'Could not save that note.', level: 0 });
      }
    },
    [saveTo, patch, later],
  );

  const transcribeAndRoute = useCallback(
    async (chunks: Buffer[]) => {
      const session = sessionRef.current;
      const wav = writeWavToCache(chunks, 'dayfeed-dictation');
      if (!wav) {
        patch({ phase: 'error', error: "Didn't catch that.", level: 0 });
        return;
      }
      patch({ phase: 'transcribing', level: 0 });
      let text = '';
      try {
        text = await enqueueTranscription(() => transcribeAudio(wav.uri));
      } catch {
        if (sessionRef.current === session) patch({ phase: 'error', error: 'Transcription failed.' });
        return;
      } finally {
        // The audio was only ever a means to the text; dictated notes save as
        // text, so keeping the file would just leak cache.
        deleteWav(wav.uri);
      }

      // The user cancelled while whisper was working. Drop it silently — this
      // is the only place a note could otherwise appear after a cancel.
      if (sessionRef.current !== session) return;

      const { content, destination } = parseDestination(text);
      if (!content) {
        patch({ phase: 'error', error: "Didn't hear anything." });
        return;
      }
      patch({ transcript: content });

      if (!destination) {
        patch({ phase: 'confirming' });
        return;
      }
      // Saved without asking, because a destination was spoken — so the bar
      // showing what was heard, with an undo, is the only chance to catch a
      // misheard note. Not silent, just not blocking.
      await commit(destination, content);
    },
    [patch, commit],
  );

  const finishNow = useCallback(() => {
    if (!listeningRef.current) return;
    const chunks = stopListening();
    if (!heardRef.current) {
      patch({ phase: 'error', error: "Didn't hear anything.", level: 0 });
      return;
    }
    void transcribeAndRoute(chunks);
  }, [stopListening, transcribeAndRoute, patch]);

  // The mic callback is registered once per session, so it reaches the latest
  // finishNow through a ref rather than capturing a stale one.
  const finishNowRef = useRef(finishNow);
  finishNowRef.current = finishNow;

  const onChunk = useCallback(
    (buf: Buffer) => {
      if (!listeningRef.current) return;
      chunksRef.current.push(buf);

      const samples = pcm16(buf);
      let peak = 0;
      // Sub-divide the 256 ms chunk so the endpointer reacts in ~32 ms steps
      // rather than quarter-second ones.
      for (let i = 0; i + FRAME_SAMPLES <= samples.length; i += FRAME_SAMPLES) {
        const energy = rms(samples.subarray(i, i + FRAME_SAMPLES));
        if (energy > peak) peak = energy;
        const event = endpointerRef.current.push(energy);
        if (event === 'speech-start') {
          heardRef.current = true;
          setState((prev) => (prev.heard ? prev : { ...prev, heard: true }));
        } else if (event === 'speech-end' && heardRef.current) {
          finishNowRef.current();
          return;
        }
      }
      setState((prev) => ({ ...prev, level: Math.min(1, peak * 4) }));
    },
    [],
  );

  const open = useCallback(() => {
    const phase = phaseRef.current;
    if (phase === 'listening' || phase === 'transcribing' || phase === 'confirming') return;
    clearTimers();
    sessionRef.current += 1;
    undoRef.current = null;
    heardRef.current = false;
    chunksRef.current = [];
    endpointerRef.current.reset();
    patch({ ...IDLE, phase: 'listening' });

    void (async () => {
      if (!(await ensureMicPermission())) {
        patch({ phase: 'error', error: 'DayFeed needs microphone access to take a voice note.' });
        return;
      }
      // Armed BEFORE acquiring, so the very first chunk is kept. The native
      // side already discards its first two buffers to kill a click, and
      // dropping another one here would clip the start of every note.
      listeningRef.current = true;
      if (!(await acquire(OWNER, onChunk))) {
        listeningRef.current = false;
        patch({ phase: 'error', error: 'The microphone is in use by another app.' });
        return;
      }

      later(() => {
        if (listeningRef.current && !heardRef.current) {
          stopListening();
          patch({ phase: 'error', error: "Didn't hear anything.", level: 0 });
        }
      }, NO_SPEECH_MS);
      later(() => finishNowRef.current(), MAX_MS);
    })();
  }, [clearTimers, patch, later, stopListening, onChunk]);

  const dismiss = useCallback(() => {
    stopListening();
    clearTimers();
    // Invalidates any transcription still running, so backing out of
    // "Transcribing…" cannot file a note a few seconds later.
    sessionRef.current += 1;
    undoRef.current = null;
    phaseRef.current = 'idle';
    transcriptRef.current = '';
    setState(IDLE);
  }, [stopListening, clearTimers]);

  const chooseDestination = useCallback(
    (destination: VoiceDestination) => {
      const content = transcriptRef.current;
      if (!content) return;
      patch({ phase: 'transcribing' });
      void commit(destination, content);
    },
    [patch, commit],
  );

  const undoSave = useCallback(() => {
    const undo = undoRef.current;
    if (!undo) return;
    undoRef.current = null;
    clearTimers();
    phaseRef.current = 'idle';
    transcriptRef.current = '';
    setState(IDLE);
    void undo().catch(() => {
      // The note stays; the user can delete it by hand. Re-opening the bar to
      // report a failed undo would be worse than the note existing.
    });
  }, [clearTimers]);

  // Backgrounding the app while the mic is open must not leave it holding the
  // stream — Android keeps feeding it, and the user has no way to stop it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && listeningRef.current) dismiss();
    });
    return () => sub.remove();
  }, [dismiss]);

  // On unmount, drop the timers and never leave the mic held.
  useEffect(
    () => () => {
      clearTimers();
      if (listeningRef.current) {
        listeningRef.current = false;
        release(OWNER);
      }
    },
    [clearTimers],
  );

  const actions = useMemo<VoiceCaptureActions>(
    () => ({ open, finishNow, chooseDestination, undoSave, dismiss }),
    [open, finishNow, chooseDestination, undoSave, dismiss],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Live dictation state. Re-renders often while listening — overlay only. */
export function useVoiceCaptureState(): VoiceCaptureState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useVoiceCaptureState must be used within a VoiceCaptureProvider');
  return ctx;
}

/** Stable dictation actions. Safe for buttons anywhere in the tree. */
export function useVoiceCapture(): VoiceCaptureActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useVoiceCapture must be used within a VoiceCaptureProvider');
  return ctx;
}
