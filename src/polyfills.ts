// whisper.rn (via safe-buffer) expects a Node-style Buffer global, which React
// Native does not provide. Install one from the `buffer` polyfill before anything
// that touches whisper.rn loads.
import { Buffer } from 'buffer';

// @ts-expect-error - augmenting the RN global
if (typeof global.Buffer === 'undefined') global.Buffer = Buffer;
