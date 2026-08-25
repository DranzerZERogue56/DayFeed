import { parseDestination } from '../voiceRouting';

describe('parseDestination', () => {
  it('pulls a trailing destination off and strips it from the content', () => {
    expect(parseDestination('Call the dentist, to Flop')).toEqual({
      content: 'Call the dentist',
      destination: 'Flop',
    });
  });

  it('accepts each destination, however whisper capitalises it', () => {
    expect(parseDestination('Milk to feed').destination).toBe('Feed');
    expect(parseDestination('Milk to FLOP').destination).toBe('Flop');
    expect(parseDestination('Milk to Fly').destination).toBe('Fly');
  });

  it('tolerates whisper punctuation', () => {
    expect(parseDestination('  Buy milk, to Flop.  ')).toEqual({
      content: 'Buy milk',
      destination: 'Flop',
    });
  });

  it('accepts the spoken longer forms', () => {
    expect(parseDestination('Buy milk, send it to Fly').destination).toBe('Fly');
    expect(parseDestination('Buy milk and save this to Flop').destination).toBe('Flop');
    expect(parseDestination('Buy milk, put it in Feed').destination).toBe('Feed');
  });

  it('returns no destination when none was spoken', () => {
    expect(parseDestination('Remember to buy milk')).toEqual({
      content: 'Remember to buy milk',
      destination: null,
    });
  });

  // The whole reason the pattern is anchored to the end of the string.
  it('ignores a destination word used mid-sentence as ordinary content', () => {
    expect(parseDestination('Put the feed bins away before Tuesday')).toEqual({
      content: 'Put the feed bins away before Tuesday',
      destination: null,
    });
    expect(parseDestination('Go to Feed and check the notes I left')).toEqual({
      content: 'Go to Feed and check the notes I left',
      destination: null,
    });
  });

  it('does not treat a bare routing phrase as an empty note', () => {
    expect(parseDestination('To Flop.')).toEqual({
      content: 'To Flop.',
      destination: null,
    });
  });

  it('leaves Flip alone — it is a view, not a destination', () => {
    expect(parseDestination('Check the calendar, to Flip')).toEqual({
      content: 'Check the calendar, to Flip',
      destination: null,
    });
  });

  it('keeps dates in the content so date detection still sees them', () => {
    expect(parseDestination('Dentist on Friday, to Feed')).toEqual({
      content: 'Dentist on Friday',
      destination: 'Feed',
    });
  });

  it('handles an empty transcript', () => {
    expect(parseDestination('   ')).toEqual({ content: '', destination: null });
  });
});
