import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
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

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentId = useRef<string | null>(null);
  const [state, setState] = useState<PlaybackState>(EMPTY);

  const unload = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    currentId.current = null;
    if (s) {
      try {
        await s.unloadAsync();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      void unload();
    };
  }, [unload]);

  const toggle = useCallback(
    async (noteId: string, uri: string) => {
      // Tapping the currently loaded note pauses/resumes it.
      if (currentId.current === noteId && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
        return;
      }

      // Switching notes: tear down the previous sound.
      await unload();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setState({
            noteId,
            isPlaying: status.isPlaying,
            positionMs: status.positionMillis ?? 0,
            durationMs: status.durationMillis ?? 0,
          });
          if (status.didJustFinish) {
            // Reset to start and stop.
            void sound.setPositionAsync(0);
            void sound.pauseAsync();
            setState((prev) =>
              prev.noteId === noteId ? { ...prev, isPlaying: false, positionMs: 0 } : prev,
            );
          }
        },
      );
      soundRef.current = sound;
      currentId.current = noteId;
    },
    [unload],
  );

  const stop = useCallback(async () => {
    await unload();
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
