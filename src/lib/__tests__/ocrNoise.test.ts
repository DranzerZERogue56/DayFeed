import { isNoiseLine, stripOcrNoise } from '../ocrNoise';

describe('isNoiseLine', () => {
  it('flags a clock line', () => {
    expect(isNoiseLine('9:41')).toBe(true);
    expect(isNoiseLine('21:07')).toBe(true);
    expect(isNoiseLine('9:41 AM')).toBe(true);
    expect(isNoiseLine('9:41 a.m.')).toBe(true);
  });

  it('flags a battery percentage line', () => {
    expect(isNoiseLine('100%')).toBe(true);
    expect(isNoiseLine('87 %')).toBe(true);
  });

  it('flags standalone connectivity chrome', () => {
    expect(isNoiseLine('LTE')).toBe(true);
    expect(isNoiseLine('Wi-Fi')).toBe(true);
    expect(isNoiseLine('WiFi')).toBe(true);
    expect(isNoiseLine('VPN')).toBe(true);
    expect(isNoiseLine('No service')).toBe(true);
  });

  it('flags symbol-only misread lines', () => {
    expect(isNoiseLine('•')).toBe(true);
    expect(isNoiseLine('---')).toBe(true);
    expect(isNoiseLine('||')).toBe(true);
  });

  it('does not flag real content', () => {
    expect(isNoiseLine('Milk, eggs, bread')).toBe(false);
    expect(isNoiseLine('Meeting at 9:41 with the team about Q3')).toBe(false);
    expect(isNoiseLine('100% sure this works')).toBe(false);
    expect(isNoiseLine('OK')).toBe(false);
    expect(isNoiseLine('5G network rollout plan')).toBe(false);
  });

  it('treats a blank line as not-noise (nothing to strip)', () => {
    expect(isNoiseLine('   ')).toBe(false);
  });

  it('flags a concatenated browser tab strip', () => {
    // The reported real-world case: a photo of a browser tab switcher.
    expect(
      isNoiseLine(
        'DranzerZERogue56/DayFee x The DeimosComprehensive x O The Go-To for GenAI Teamv X ) DranzerZERogue56/DayFe X',
      ),
    ).toBe(true);
  });

  it('does not flag prose that happens to contain a single "x"', () => {
    expect(isNoiseLine('Meet me x the coffee shop at noon.')).toBe(false);
    expect(isNoiseLine('5 x 3 = 15, and 2 x 4 = 8.')).toBe(false);
  });
});

describe('stripOcrNoise', () => {
  it('removes a status bar clock/battery/signal from a real screenshot-like block', () => {
    const raw = '9:41 AM\nLTE 100%\nGrocery List\nMilk\nEggs\nBread';
    expect(stripOcrNoise(raw)).toBe('Grocery List\nMilk\nEggs\nBread');
  });

  it('leaves clean paper-note text untouched', () => {
    const raw = 'Dentist appointment\nJuly 30th at 2pm';
    expect(stripOcrNoise(raw)).toBe(raw);
  });

  it('collapses blank lines left behind by removed noise', () => {
    const raw = '9:41\n\n100%\nActual content here';
    expect(stripOcrNoise(raw)).toBe('Actual content here');
  });

  it('returns empty string when everything was noise', () => {
    expect(stripOcrNoise('9:41 AM\n100%\nLTE')).toBe('');
  });
});
