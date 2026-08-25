import { DEFAULT_VOICE_ENGINE, VOICE_ENGINE_KEY, loadVoiceEngine, saveVoiceEngine } from '../voiceEngine';
import { getSetting, setSetting } from '../../db/settings';

jest.mock('../../db/settings', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

const mockGet = getSetting as jest.MockedFunction<typeof getSetting>;
const mockSet = setSetting as jest.MockedFunction<typeof setSetting>;

describe('loadVoiceEngine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the default when nothing is stored', async () => {
    mockGet.mockResolvedValue(null);
    await expect(loadVoiceEngine()).resolves.toBe(DEFAULT_VOICE_ENGINE);
  });

  it('returns each valid stored value', async () => {
    mockGet.mockResolvedValue('flow');
    await expect(loadVoiceEngine()).resolves.toBe('flow');
    mockGet.mockResolvedValue('whisper');
    await expect(loadVoiceEngine()).resolves.toBe('whisper');
  });

  // A value from a future version, or a typo written by hand, must not leave
  // the app with an engine it cannot run.
  it('falls back to the default on an unrecognised value', async () => {
    mockGet.mockResolvedValue('porcupine');
    await expect(loadVoiceEngine()).resolves.toBe(DEFAULT_VOICE_ENGINE);
    mockGet.mockResolvedValue('');
    await expect(loadVoiceEngine()).resolves.toBe(DEFAULT_VOICE_ENGINE);
  });

  it('reads the documented key', async () => {
    mockGet.mockResolvedValue(null);
    await loadVoiceEngine();
    expect(mockGet).toHaveBeenCalledWith(VOICE_ENGINE_KEY);
  });
});

describe('saveVoiceEngine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes the engine under the documented key', async () => {
    await saveVoiceEngine('whisper');
    expect(mockSet).toHaveBeenCalledWith(VOICE_ENGINE_KEY, 'whisper');
  });
});
