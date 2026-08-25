// The package ships a .d.ts under the wrong module name; declare the real one.
//
// The shipped typings also describe an API the Android code does not implement.
// Corrected here against
// android/src/main/java/com/imxiqi/rnliveaudiostream/RNLiveAudioStreamModule.java.
//
// Nothing outside src/lib/micBus.ts should import this module — see the comment
// at the top of micBus.ts for why the mic needs a single owner.
declare module '@fugood/react-native-audio-pcm-stream' {
  export interface Options {
    sampleRate: number;
    /** 1 | 2 */
    channels: number;
    /** 8 | 16 */
    bitsPerSample: number;
    /** Android AudioSource (6 = VOICE_RECOGNITION). */
    audioSource?: number;
    /**
     * Required by the native signature but never read by it. No WAV file is
     * ever written; callers assemble one from the streamed chunks.
     */
    wavFile: string;
    /** A floor, not an exact size: native takes max(this, getMinBufferSize()). */
    bufferSize?: number;
  }

  export interface Subscription {
    remove: () => void;
  }

  export interface IAudioRecord {
    /**
     * Constructs the native AudioRecord. Rejects if it cannot be initialised
     * (e.g. another app holds the mic).
     *
     * Must be called before EVERY start(), not just the first: the native
     * recording thread release()s and nulls its AudioRecord when the loop ends,
     * so a start() after a stop() without a fresh init() silently does nothing.
     */
    init: (options: Options) => Promise<void>;
    start: () => void;
    /**
     * Asks the recording thread to stop. Returns nothing and resolves nothing —
     * it only flips a flag the thread notices on its next read. Trailing 'data'
     * events keep arriving for a moment afterwards.
     */
    stop: () => void;
    /**
     * WARNING: removes *all* existing 'data' listeners before adding this one.
     * Calling it twice silently disconnects the first caller.
     */
    on: (event: 'data', callback: (base64Chunk: string) => void) => Subscription;
  }

  const AudioRecord: IAudioRecord;
  export default AudioRecord;
}
