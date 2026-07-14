// The package ships a .d.ts under the wrong module name; declare the real one.
declare module '@fugood/react-native-audio-pcm-stream' {
  export interface Options {
    sampleRate: number;
    /** 1 | 2 */
    channels: number;
    /** 8 | 16 */
    bitsPerSample: number;
    /** Android AudioSource (6 = VOICE_RECOGNITION). */
    audioSource?: number;
    /** Output WAV filename; stop() resolves to its full path. */
    wavFile: string;
    bufferSize?: number;
  }

  export interface IAudioRecord {
    init: (options: Options) => void;
    start: () => void;
    /** Stops and resolves to the recorded WAV file path. */
    stop: () => Promise<string>;
    on: (event: 'data', callback: (base64Chunk: string) => void) => void;
  }

  const AudioRecord: IAudioRecord;
  export default AudioRecord;
}
