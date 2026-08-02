import { copyableText } from '../noteActions';

const base = { content: null, transcript: null, ocr_text: null };

describe('copyableText', () => {
  it('takes the body of a text note', () => {
    expect(copyableText({ ...base, type: 'text', content: 'hello' })).toBe('hello');
  });

  it('takes the transcript of a voice note, not its content', () => {
    expect(
      copyableText({ ...base, type: 'voice', transcript: 'spoken', content: 'ignored' }),
    ).toBe('spoken');
  });

  it('takes the extracted text of a photo note', () => {
    expect(copyableText({ ...base, type: 'photo', ocr_text: 'scanned' })).toBe('scanned');
  });

  it('returns null when there is nothing to copy yet', () => {
    expect(copyableText({ ...base, type: 'voice' })).toBeNull();
    expect(copyableText({ ...base, type: 'photo' })).toBeNull();
    expect(copyableText({ ...base, type: 'text' })).toBeNull();
  });

  it('treats whitespace-only text as nothing to copy', () => {
    expect(copyableText({ ...base, type: 'text', content: '   \n ' })).toBeNull();
  });
});
