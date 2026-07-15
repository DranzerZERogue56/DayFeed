import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// Single shared audio player: only one voice note plays at a time, across every
// screen. Components subscribe by note id.
//
// Built on expo-audio. (expo-av, its predecessor, was removed from the SDK; its
// last prebuilt binary links against a pre-0.86 JSI ABI and cannot load under
// React Native 0.86 at all.)
interface PlaybackState {
  noteId: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
}

interface AudioPlayerContextValue extends PlaybackState {
  /** Start (or resume) the given note. Stops any other note first. */
  toggle: (noteId: string, uri: string) => Promise<void>;
  stop: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const EMPTY: PlaybackState = {
  noteId: null,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
};

// expo-audio reports seconds; the rest of the app speaks milliseconds.
const toMs = (seconds: number) => Math.max(0, Math.round(seconds * 1000));

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const currentId = useRef<string | null>(null);
  const [state, setState] = useState<PlaybackState>(EMPTY);

  const unload = useCallback(() => {
    const p = playerRef.current;
    playerRef.current = null;
    currentId.current = null;
    if (p) {
      try {
        p.remove();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    return () => unload();
  }, [unload]);

  const toggle = useCallback(
    async (noteId: string, uri: string) => {
      // Tapping the currently loaded note pauses/resumes it.
      const existing = playerRef.current;
      if (currentId.current === noteId && existing) {
        if (existing.playing) existing.pause();
        else existing.play();
        return;
      }

      // Switching notes: tear down the previous player.
      unload();

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
        shouldPlayInBackground: false,
      });

      const player = createAudioPlayer({ uri });
      playerRef.current = player;
      currentId.current = noteId;

      player.addListener('playbackStatusUpdate', (status) => {
        // A player torn down mid-flight must not write state over its successor.
        if (currentId.current !== noteId) return;
        setState({
          noteId,
          isPlaying: status.playing,
          positionMs: toMs(status.currentTime),
          durationMs: toMs(status.duration),
        });
        if (status.didJustFinish) {
          // Reset to the start and stop, so the row is ready to replay.
          void player.seekTo(0);
          player.pause();
          setState((prev) =>
            prev.noteId === noteId ? { ...prev, isPlaying: false, positionMs: 0 } : prev,
          );
        }
      });

      player.play();
    },
    [unload],
  );

  const stop = useCallback(async () => {
    unload();
    setState(EMPTY);
  }, [unload]);

  const value = useMemo(() => ({ ...state, toggle, stop }), [state, toggle, stop]);

  return (
    <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  return ctx;
}
