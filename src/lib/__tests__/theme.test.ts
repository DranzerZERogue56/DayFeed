import { contrastRatio, hsl, parseHex } from '../color';
import {
  accentOrder,
  accentThemes,
  makePalette,
  makeRelationStyle,
  relationStyleDark,
  relationStyleLight,
  themeSwatch,
  type AccentId,
} from '../../theme';

const MODES = ['light', 'dark'] as const;

// A theme is only worth shipping if it stays readable. These are the WCAG
// floors: 4.5 for body text, 3.0 for large text, icons and dividers. The
// palettes are generated, so these assertions are what stops a hue tweak from
// quietly making one theme unreadable.
const BODY_TEXT = 4.5;
const LARGE_TEXT = 3.0;

// textFaint is the faintest thing in the app — captions and disabled labels,
// deliberately recessive. The original bronze palette put it around 2.6:1,
// below the large-text floor, which is a design choice rather than an
// oversight. So the bar for a theme is "no fainter than the original", not an
// absolute ratio, and this is measured off bronze rather than hardcoded so it
// tracks the original if it's ever retuned.
const bronzeLight = makePalette('light', 'bronze');
const FAINT_TEXT = contrastRatio(bronzeLight.textFaint, bronzeLight.bg) - 0.01;

describe('color math', () => {
  it('converts HSL to hex', () => {
    expect(hsl(0, 0, 0)).toBe('#000000');
    expect(hsl(0, 0, 100)).toBe('#ffffff');
    expect(hsl(0, 100, 50)).toBe('#ff0000');
    expect(hsl(120, 100, 50)).toBe('#00ff00');
    expect(hsl(240, 100, 50)).toBe('#0000ff');
  });

  it('wraps hues and clamps out-of-range input', () => {
    expect(hsl(360, 100, 50)).toBe(hsl(0, 100, 50));
    expect(hsl(-120, 100, 50)).toBe(hsl(240, 100, 50));
    expect(hsl(0, 200, 200)).toBe('#ffffff');
  });

  it('parses both hex shorthands', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#A67C52')).toEqual([166, 124, 82]);
  });

  it('scores contrast the way WCAG does', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
});

describe.each(accentOrder)('theme: %s', (id: AccentId) => {
  describe.each(MODES)('%s mode', (mode) => {
    const p = makePalette(mode, id);

    it('keeps body text readable on the page and on cards', () => {
      expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(BODY_TEXT);
      expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(BODY_TEXT);
      expect(contrastRatio(p.text, p.surfaceAlt)).toBeGreaterThanOrEqual(BODY_TEXT);
    });

    it('keeps secondary text readable', () => {
      expect(contrastRatio(p.textDim, p.bg)).toBeGreaterThanOrEqual(BODY_TEXT);
      expect(contrastRatio(p.textDim, p.surface)).toBeGreaterThanOrEqual(BODY_TEXT);
    });

    it('keeps captions no fainter than the original bronze', () => {
      expect(contrastRatio(p.textFaint, p.bg)).toBeGreaterThanOrEqual(FAINT_TEXT);
      expect(contrastRatio(p.textFaint, p.surface)).toBeGreaterThanOrEqual(FAINT_TEXT);
    });

    it('keeps the accent visible against every surface it sits on', () => {
      expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(LARGE_TEXT);
      expect(contrastRatio(p.accent, p.surface)).toBeGreaterThanOrEqual(LARGE_TEXT);
      expect(contrastRatio(p.accentDark, p.surface)).toBeGreaterThanOrEqual(LARGE_TEXT);
    });

    it('keeps all seven tab colors visible on the tab bar', () => {
      for (const c of themeSwatch(id, mode)) {
        expect(contrastRatio(c, p.surface)).toBeGreaterThanOrEqual(LARGE_TEXT);
      }
    });

    it('gives the seven tabs seven distinct colors', () => {
      expect(new Set(themeSwatch(id, mode)).size).toBe(7);
    });

    it('keeps danger and success visible', () => {
      expect(contrastRatio(p.danger, p.surface)).toBeGreaterThanOrEqual(LARGE_TEXT);
      expect(contrastRatio(p.success, p.surface)).toBeGreaterThanOrEqual(LARGE_TEXT);
    });

    it('separates the page from the cards it holds', () => {
      expect(p.bg).not.toBe(p.surface);
    });

    it('keeps relation chip text readable on its own tint', () => {
      const relations = makeRelationStyle(mode, id);
      for (const r of ['support', 'idea', 'oppose'] as const) {
        const s = relations[r];
        // Dark-mode tints are translucent over the card, so the card color is
        // what the text actually sits on.
        const behind = s.tint.startsWith('rgba') ? p.surface : s.tint;
        expect(contrastRatio(s.color, behind)).toBeGreaterThanOrEqual(LARGE_TEXT);
      }
    });

    it('gives the three relations three distinct colors', () => {
      const relations = makeRelationStyle(mode, id);
      const colors = [relations.support.color, relations.idea.color, relations.oppose.color];
      expect(new Set(colors).size).toBe(3);
    });
  });
});

describe('bronze stays the original', () => {
  // Bronze is the default and the way back if a generated theme reads wrong,
  // so it is pinned rather than generated. An install that never opens
  // Settings must look exactly as it did before themes existed.
  it('keeps its shipped light palette', () => {
    const p = makePalette('light', 'bronze');
    expect(p.bg).toBe('#FAF8F3');
    expect(p.surface).toBe('#FFFFFF');
    expect(p.text).toBe('#1A1A1A');
    expect(p.accent).toBe('#A67C52');
  });

  it('keeps its shipped dark palette', () => {
    const p = makePalette('dark', 'bronze');
    expect(p.bg).toBe('#1B130C');
    expect(p.surface).toBe('#271D13');
    expect(p.text).toBe('#EDE4D3');
    expect(p.accent).toBe('#C89B66');
  });

  it('keeps its shipped relation colors', () => {
    expect(makeRelationStyle('light', 'bronze')).toBe(relationStyleLight);
    expect(makeRelationStyle('dark', 'bronze')).toBe(relationStyleDark);
  });
});

describe('themes differ from one another', () => {
  it('gives every theme its own page color', () => {
    const backgrounds = accentOrder.map((id) => makePalette('light', id).bg);
    expect(new Set(backgrounds).size).toBe(accentOrder.length);
  });

  it('recolors the page, not just the accent', () => {
    // The bug this whole change fixes: picking Ocean used to leave the page
    // identical to Bronze's.
    const bronze = makePalette('light', 'bronze');
    for (const id of accentOrder.filter((i) => i !== 'bronze')) {
      const p = makePalette('light', id);
      expect(p.bg).not.toBe(bronze.bg);
      expect(p.surface).not.toBe(bronze.surface);
      expect(p.divider).not.toBe(bronze.divider);
    }
  });

  it('labels every theme in the picker', () => {
    for (const id of accentOrder) {
      expect(accentThemes[id].label.length).toBeGreaterThan(0);
    }
  });
});
