import { Platform } from 'react-native';
import { contrastRatio, hsl, hsla } from './lib/color';

// DayFeed design system — "old bookbinding": warm paper background, crisp white
// note cards, and an accent (the color of the book's spine). Calm, built for
// long reading. v1.4 added a dark companion: the same book after sundown —
// deep coffee-brown leather, cream ink, brighter accent. v1.5 let the spine
// color be chosen while the paper stayed put.
//
// v1.6 goes further: picking a theme now recolors the whole book, not just the
// spine. The page, the cards, the input fills, the rules between entries and
// the ink itself all shift to the theme's hue, so Ocean reads as a cool blue
// notebook rather than the same cream one with blue buttons.
//
// Each theme is also a small scheme rather than a single color: seven, one for
// each tab. A tab's color goes on its icon in the tab bar while that tab is
// selected, and nowhere else; everything inside a screen uses the primary.
//
//   primary    the spine — Feed, and buttons, pins, selected dates, the voice ring
//   secondary  a green-leaning partner — Flip, and "Support" relations
//   tertiary   a red-leaning partner — Flop, and "Oppose" relations
//   quaternary Fly
//   quinary    Agenda
//   senary     All
//   septenary  Vault
//
// Support stays greenish and Oppose reddish in every theme, so the meaning
// survives a theme change. Color is never the only signal anyway: each of
// those chips carries its own icon and label too.
//
// Themes are written below as hue/saturation seeds and expanded by
// makeThemePalette, which tunes each color until it measurably stands out on
// its own page. See src/lib/__tests__/theme.test.ts for the contrast floors
// this guarantees.
//
// Components never import a palette directly; they read the active one from
// ThemeContext.

/** One color of a theme's scheme: a hue (0-360) and a saturation (0-100). */
interface Seed {
  h: number;
  s: number;
}

export interface ThemeSeeds {
  label: string;
  primary: Seed;
  secondary: Seed;
  tertiary: Seed;
  quaternary: Seed;
  quinary: Seed;
  senary: Seed;
  septenary: Seed;
}

export type AccentId = 'bronze' | 'ocean' | 'forest' | 'slate' | 'amethyst' | 'blush' | 'teal';

// Six themes beyond the original bronze: three built on the most-liked colors
// for men (ocean blue, forest green, slate) and three for women (amethyst,
// blush, teal), per common color-preference surveys — sourcing only, nothing
// in the app is labeled by gender. Bronze stays the default, and is pinned to
// its original hex values below so existing installs don't change look until
// someone picks a theme in Settings.
export const themeSeeds: Record<AccentId, ThemeSeeds> = {
  bronze: {
    label: 'Bronze (original)',
    primary: { h: 28, s: 33 },
    secondary: { h: 104, s: 16 },
    tertiary: { h: 6, s: 33 },
    quaternary: { h: 200, s: 24 },
    quinary: { h: 265, s: 22 },
    senary: { h: 45, s: 40 },
    septenary: { h: 330, s: 22 },
  },
  ocean: {
    label: 'Ocean',
    primary: { h: 212, s: 45 },
    secondary: { h: 168, s: 38 },
    tertiary: { h: 8, s: 52 },
    quaternary: { h: 262, s: 38 },
    quinary: { h: 42, s: 55 },
    senary: { h: 320, s: 38 },
    septenary: { h: 100, s: 34 },
  },
  forest: {
    label: 'Forest',
    primary: { h: 127, s: 30 },
    secondary: { h: 88, s: 32 },
    tertiary: { h: 14, s: 48 },
    quaternary: { h: 196, s: 34 },
    quinary: { h: 268, s: 30 },
    senary: { h: 45, s: 50 },
    septenary: { h: 335, s: 38 },
  },
  slate: {
    label: 'Slate',
    primary: { h: 206, s: 20 },
    secondary: { h: 150, s: 22 },
    tertiary: { h: 6, s: 38 },
    quaternary: { h: 268, s: 22 },
    quinary: { h: 40, s: 40 },
    senary: { h: 330, s: 25 },
    septenary: { h: 180, s: 30 },
  },
  amethyst: {
    label: 'Amethyst',
    primary: { h: 273, s: 28 },
    secondary: { h: 158, s: 30 },
    tertiary: { h: 342, s: 45 },
    quaternary: { h: 205, s: 36 },
    quinary: { h: 32, s: 55 },
    senary: { h: 62, s: 40 },
    septenary: { h: 120, s: 28 },
  },
  blush: {
    label: 'Blush',
    primary: { h: 344, s: 48 },
    secondary: { h: 140, s: 28 },
    tertiary: { h: 18, s: 55 },
    quaternary: { h: 285, s: 34 },
    quinary: { h: 48, s: 55 },
    senary: { h: 200, s: 40 },
    septenary: { h: 85, s: 30 },
  },
  teal: {
    label: 'Teal',
    primary: { h: 176, s: 30 },
    secondary: { h: 110, s: 28 },
    tertiary: { h: 356, s: 45 },
    quaternary: { h: 218, s: 36 },
    quinary: { h: 40, s: 55 },
    senary: { h: 290, s: 30 },
    septenary: { h: 70, s: 40 },
  },
};

/** Order the theme picker lists them in. */
export const accentOrder: AccentId[] = [
  'bronze',
  'ocean',
  'forest',
  'slate',
  'amethyst',
  'blush',
  'teal',
];

// How far each token sits from the theme's hue. `sm` scales the seed
// saturation (a muted theme like Slate stays muted all the way down), `cap`
// stops a vivid theme like Blush from turning the page into a highlighter,
// and `l` is the lightness — identical in every theme, which is what makes
// the contrast guarantees hold.
interface Step {
  sm: number;
  cap: number;
  l: number;
}

interface Ladder {
  /** Which way `tone` walks a color to make it stand out. */
  mode: 'light' | 'dark';
  bg: Step;
  surface: Step;
  surfaceAlt: Step;
  divider: Step;
  text: Step;
  textDim: Step;
  textFaint: Step;
  /** Lightness for the four scheme colors and the accent. */
  accentL: number;
  /** Pressed/active state — never a drastic change from the accent. */
  accentPressedL: number;
  tintAlpha: number;
  edgeAlpha: number;
  /** Relation chip fills, which sit behind small text. */
  relationL: number;
  relationTintL: number;
  relationTintSm: number;
  relationTintAlpha: number | null;
}

const LIGHT: Ladder = {
  mode: 'light',
  bg: { sm: 1.2, cap: 60, l: 91 },
  surface: { sm: 1.35, cap: 70, l: 97 },
  surfaceAlt: { sm: 1.15, cap: 55, l: 86 },
  divider: { sm: 1.0, cap: 45, l: 77 },
  text: { sm: 0.75, cap: 35, l: 9 },
  textDim: { sm: 0.45, cap: 22, l: 38 },
  textFaint: { sm: 0.33, cap: 18, l: 55 },
  accentL: 45,
  accentPressedL: 36,
  tintAlpha: 0.1,
  edgeAlpha: 0.28,
  relationL: 38,
  relationTintL: 90,
  relationTintSm: 0.55,
  relationTintAlpha: null, // light-mode tints are opaque, as they were
};

const DARK: Ladder = {
  mode: 'dark',
  bg: { sm: 0.95, cap: 45, l: 8 },
  surface: { sm: 0.85, cap: 42, l: 12 },
  surfaceAlt: { sm: 0.75, cap: 40, l: 16 },
  divider: { sm: 0.65, cap: 38, l: 23 },
  text: { sm: 0.55, cap: 40, l: 90 },
  textDim: { sm: 0.4, cap: 26, l: 70 },
  textFaint: { sm: 0.3, cap: 20, l: 52 },
  accentL: 64,
  accentPressedL: 52,
  tintAlpha: 0.14,
  edgeAlpha: 0.35,
  relationL: 64,
  relationTintL: 64,
  relationTintSm: 1,
  relationTintAlpha: 0.14,
};

function step(seed: Seed, s: Step): string {
  return hsl(seed.h, Math.min(seed.s * s.sm, s.cap), s.l);
}

/**
 * Pick the lightness that actually makes a color stand out, instead of
 * trusting one number for every hue.
 *
 * Two colors can share a lightness and be nowhere near as visible as each
 * other: a cyan at 45% lightness is far brighter to the eye than a blue at
 * 45%, so on the same page the cyan nearly disappears while the blue reads
 * fine. Rather than hand-tune each hue, this starts at the nominal lightness
 * and walks it away from the background — darker in light mode, lighter in
 * dark mode — until the measured contrast clears `min`. Every theme then
 * lands on the same real visibility, whatever its hue.
 */
function tone(
  seed: Seed,
  startL: number,
  against: string,
  min: number,
  mode: 'light' | 'dark',
): string {
  const dir = mode === 'light' ? -1 : 1;
  let l = startL;
  for (let i = 0; i <= 100 && l >= 0 && l <= 100; i++) {
    const c = hsl(seed.h, seed.s, l);
    if (contrastRatio(c, against) >= min) return c;
    l += dir;
  }
  // Ran out of room — the extreme end is the best this hue can do.
  return hsl(seed.h, seed.s, mode === 'light' ? 0 : 100);
}

// Contrast floors. 4.5 is the WCAG minimum for body text, 3.0 for large text
// and icons; the accents aim a little above 3.0 so a rounding difference
// can't drop one under.
const MIN_ACCENT = 3.2;
const MIN_CHIP_TEXT = 4.5;
const MIN_BODY_TEXT = 4.5;
// Captions and disabled labels are meant to recede. The original bronze
// palette sits around 2.6:1 here, and this keeps every theme at least level
// with it rather than inventing a stricter bar the original never met.
const MIN_FAINT_TEXT = 2.7;

export interface BaseTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  divider: string;
  text: string;
  textDim: string;
  textFaint: string;
  danger: string;
  success: string;
  border: string;
  bubbleOwnText: string;
  page: string;
  pageText: string;
  pageLine: string;
  pageDim: string;
}

/** The spine color and its washes — interaction, pins, active state. */
export interface AccentTokens {
  accent: string;
  accentDark: string; // pressed/active
  accentTint: string; // washed accent for fills/backgrounds
  accentEdge: string; // washed accent for borders
  voiceAccent: string; // = accent
  bubbleOwn: string; // = accent (active chips, selected dates, agenda marks)
}

/**
 * The four stops in a note's life get a color each, so the tab you're on is
 * recognizable at a glance and the app shows off its whole scheme rather than
 * one accent repeated seven times. Agenda, All and Vault are lookups rather
 * than part of that flow, and stay on the primary.
 */
export interface TabTokens {
  tabFeed: string;
  tabFlip: string;
  tabFlop: string;
  tabFly: string;
  tabAgenda: string;
  tabAll: string;
  tabVault: string;
}

export type ColorPalette = BaseTokens & AccentTokens & TabTokens;

function makeThemePalette(seeds: ThemeSeeds, ladder: Ladder): ColorPalette {
  const { primary, secondary, tertiary, quaternary, quinary, senary, septenary } = seeds;
  const mode = ladder.mode;

  const bg = step(primary, ladder.bg);
  const surface = step(primary, ladder.surface);
  // The chip/input fill is the least forgiving background in both modes —
  // it's the darkest in light mode and the lightest in dark mode — so every
  // accent is measured against it and is safe everywhere else by extension.
  const surfaceAlt = step(primary, ladder.surfaceAlt);
  const divider = step(primary, ladder.divider);
  const text = step(primary, ladder.text);
  // A themed page is darker than bronze's near-white paper, so the two muted
  // ink tones are pushed until they read at least as well as they did there.
  const textDim = tone(
    { h: primary.h, s: Math.min(primary.s * ladder.textDim.sm, ladder.textDim.cap) },
    ladder.textDim.l,
    surfaceAlt,
    MIN_BODY_TEXT,
    mode,
  );
  const textFaint = tone(
    { h: primary.h, s: Math.min(primary.s * ladder.textFaint.sm, ladder.textFaint.cap) },
    ladder.textFaint.l,
    surfaceAlt,
    MIN_FAINT_TEXT,
    mode,
  );

  const accent = tone(primary, ladder.accentL, surfaceAlt, MIN_ACCENT, mode);
  const pressed: Seed = { h: primary.h, s: Math.min(primary.s + 5, 70) };

  return {
    bg,
    surface,
    surfaceAlt,
    divider,

    text,
    textDim,
    textFaint,

    // Kept semantic — a red warning stays red — but pulled onto the theme's
    // own red and green so they don't clash with everything around them.
    danger: tone(
      { h: tertiary.h, s: Math.min(tertiary.s + 10, 60) },
      ladder.accentL + 2,
      surface,
      MIN_ACCENT,
      mode,
    ),
    success: tone(
      { h: secondary.h, s: Math.min(secondary.s + 8, 50) },
      ladder.accentL - 7,
      surface,
      MIN_ACCENT,
      mode,
    ),

    border: divider,
    bubbleOwnText: text,

    // The Flip "paper" sheet rides on the card color, ruled with the divider.
    page: surface,
    pageText: text,
    pageLine: divider,
    pageDim: textFaint,

    accent,
    accentDark: tone(pressed, ladder.accentPressedL, surface, MIN_ACCENT, mode),
    accentTint: hsla(primary.h, primary.s, ladder.accentL, ladder.tintAlpha),
    accentEdge: hsla(primary.h, primary.s, ladder.accentL, ladder.edgeAlpha),
    voiceAccent: accent,
    bubbleOwn: accent,

    tabFeed: accent,
    tabFlip: tone(secondary, ladder.accentL, surface, MIN_ACCENT, mode),
    tabFlop: tone(tertiary, ladder.accentL, surface, MIN_ACCENT, mode),
    tabFly: tone(quaternary, ladder.accentL, surface, MIN_ACCENT, mode),
    tabAgenda: tone(quinary, ladder.accentL, surface, MIN_ACCENT, mode),
    tabAll: tone(senary, ladder.accentL, surface, MIN_ACCENT, mode),
    tabVault: tone(septenary, ladder.accentL, surface, MIN_ACCENT, mode),
  };
}

// Bronze is the original look and the default, so it is pinned to the exact
// hex values it shipped with rather than regenerated. An install that has
// never opened Settings sees no change at all. It's also the way back: if a
// generated theme ever reads wrong, Bronze is known-good.
const bronzeLight: ColorPalette = {
  bg: '#FAF8F3', // warm off-white "paper" — never harsh white, easy on the eyes
  surface: '#FFFFFF', // crisp white for the bubbles/note cards themselves
  surfaceAlt: '#F1EEE8', // subtle warm fill for inputs, chips, tracks
  divider: '#E8E5E0', // lighter warm tone for separators

  text: '#1A1A1A', // almost-black, warm undertone
  textDim: '#6B6B6B', // muted gray for metadata / secondary
  textFaint: '#9A958C', // faint warm gray for captions / disabled

  danger: '#B4473F', // muted brick red, warm-palette friendly
  success: '#5A7052', // moss green — done, finished (matches Flop's "support")

  border: '#E8E5E0', // = divider
  bubbleOwnText: '#1A1A1A', // = text

  page: '#FFFFFF',
  pageText: '#1A1A1A',
  pageLine: '#E8E5E0',
  pageDim: '#9A958C',

  accent: '#A67C52',
  accentDark: '#8B6B42',
  accentTint: 'rgba(166, 124, 82, 0.10)',
  accentEdge: 'rgba(166, 124, 82, 0.28)',
  voiceAccent: '#A67C52',
  bubbleOwn: '#A67C52',

  tabFeed: '#A67C52',
  tabFlip: '#5A7052',
  tabFlop: '#94524A',
  tabFly: '#4E7382',
  tabAgenda: '#7A6494',
  tabAll: '#9A7B2E',
  tabVault: '#8A5A6E',
};

// Dark mode: dark browns, not grays — the leather cover rather than a night sky.
const bronzeDark: ColorPalette = {
  bg: '#1B130C', // deep coffee leather
  surface: '#271D13', // raised card, a shade warmer/lighter
  surfaceAlt: '#32261A', // inputs, chips, tracks
  divider: '#3D2F20', // warm dark separator

  text: '#EDE4D3', // cream ink
  textDim: '#B5A78F', // parchment gray
  textFaint: '#847660', // faded ink

  danger: '#D0776C', // lifted brick red for dark surfaces
  success: '#8FA986', // moss lifted for dark leather

  border: '#3D2F20', // = divider
  bubbleOwnText: '#EDE4D3', // = text

  page: '#271D13',
  pageText: '#EDE4D3',
  pageLine: '#3D2F20',
  pageDim: '#847660',

  accent: '#C89B66',
  accentDark: '#A67C52',
  accentTint: 'rgba(200, 155, 102, 0.14)',
  accentEdge: 'rgba(200, 155, 102, 0.35)',
  voiceAccent: '#C89B66',
  bubbleOwn: '#C89B66',

  tabFeed: '#C89B66',
  tabFlip: '#8FA986',
  tabFlop: '#D0877D',
  tabFly: '#8FB2C2',
  tabAgenda: '#A78BC4',
  tabAll: '#C9A54A',
  tabVault: '#C48AA0',
};

export interface AccentTheme {
  label: string;
  light: ColorPalette;
  dark: ColorPalette;
}

export const accentThemes: Record<AccentId, AccentTheme> = accentOrder.reduce(
  (acc, id) => {
    const seeds = themeSeeds[id];
    acc[id] =
      id === 'bronze'
        ? { label: seeds.label, light: bronzeLight, dark: bronzeDark }
        : {
            label: seeds.label,
            light: makeThemePalette(seeds, LIGHT),
            dark: makeThemePalette(seeds, DARK),
          };
    return acc;
  },
  {} as Record<AccentId, AccentTheme>,
);

export function makePalette(mode: 'light' | 'dark', accentId: AccentId): ColorPalette {
  return accentThemes[accentId][mode];
}

/** The scheme's seven tab colors, for the Settings picker swatches. */
export function themeSwatch(accentId: AccentId, mode: 'light' | 'dark'): string[] {
  const p = makePalette(mode, accentId);
  return [p.tabFeed, p.tabFlip, p.tabFlop, p.tabFly, p.tabAgenda, p.tabAll, p.tabVault];
}

// Kept for any code that still wants the plain bronze palette directly.
export const lightColors: ColorPalette = bronzeLight;
export const darkColors: ColorPalette = bronzeDark;

// Flop relation colors. Three tones per mode, drawn from the active theme's
// scheme: Idea takes the spine color (ideas are the app's native impulse),
// Support the green-leaning partner, Oppose the red-leaning one. Color is
// never the only indicator — every use pairs the tone with an icon and a label.
export interface RelationStyle {
  label: string;
  plural: string;
  color: string;
  tint: string;
  icon: string;
}

export interface RelationStyleMap {
  support: RelationStyle;
  idea: RelationStyle;
  oppose: RelationStyle;
}

function relationTint(seed: Seed, ladder: Ladder): string {
  return ladder.relationTintAlpha === null
    ? hsl(seed.h, seed.s * ladder.relationTintSm, ladder.relationTintL)
    : hsla(seed.h, seed.s, ladder.relationTintL, ladder.relationTintAlpha);
}

function makeRelationStyleFor(seeds: ThemeSeeds, ladder: Ladder): RelationStyleMap {
  // Chip label sits on the chip's own fill in light mode, and on the card
  // behind a translucent fill in dark mode — so that's what each one is
  // measured against. Small text, so it needs the full 4.5.
  const card = step(seeds.primary, ladder.surface);
  const chip = (seed: Seed) => {
    const tint = relationTint(seed, ladder);
    return {
      color: tone(seed, ladder.relationL, ladder.relationTintAlpha === null ? tint : card, MIN_CHIP_TEXT, ladder.mode),
      tint,
    };
  };

  return {
    support: {
      label: 'Support',
      plural: 'SUPPORT',
      ...chip(seeds.secondary),
      icon: '↑', // upward arrow
    },
    idea: {
      label: 'Idea',
      plural: 'IDEAS',
      ...chip(seeds.primary),
      icon: '⑂', // branching fork
    },
    oppose: {
      label: 'Oppose',
      plural: 'OPPOSE',
      ...chip(seeds.tertiary),
      icon: '←', // counter arrow
    },
  };
}

// Bronze's relation colors are pinned alongside its palette, same reasoning.
export const relationStyleLight: RelationStyleMap = {
  support: {
    label: 'Support',
    plural: 'SUPPORT',
    color: '#5A7052', // moss green
    tint: '#E7ECE3',
    icon: '↑',
  },
  idea: {
    label: 'Idea',
    plural: 'IDEAS',
    color: '#8A6238', // bronze — ideas are the app's native impulse
    tint: '#F0E7DC',
    icon: '⑂',
  },
  oppose: {
    label: 'Oppose',
    plural: 'OPPOSE',
    color: '#94524A', // brick red
    tint: '#F0E2E0',
    icon: '←',
  },
};

export const relationStyleDark: RelationStyleMap = {
  support: {
    label: 'Support',
    plural: 'SUPPORT',
    color: '#8FA986', // moss lifted for dark leather
    tint: 'rgba(143, 169, 134, 0.14)',
    icon: '↑',
  },
  idea: {
    label: 'Idea',
    plural: 'IDEAS',
    color: '#C89B66',
    tint: 'rgba(200, 155, 102, 0.14)',
    icon: '⑂',
  },
  oppose: {
    label: 'Oppose',
    plural: 'OPPOSE',
    color: '#D0877D',
    tint: 'rgba(208, 135, 125, 0.14)',
    icon: '←',
  },
};

export function makeRelationStyle(
  mode: 'light' | 'dark',
  accentId: AccentId,
): RelationStyleMap {
  if (accentId === 'bronze') {
    return mode === 'dark' ? relationStyleDark : relationStyleLight;
  }
  return makeRelationStyleFor(themeSeeds[accentId], mode === 'dark' ? DARK : LIGHT);
}

// Type roles. Serif for ceremony (dates, headers) — this is a notebook. Neutral
// sans recedes for body text. Monospace only for metadata (timestamps, durations,
// coordinates) — the feel of an index-card margin.
//
// Named system fallbacks per the design (Georgia / system sans / Courier). Swap
// these for bundled Charter / Inter / JetBrains Mono via expo-font with no other
// changes — every component reads these tokens.
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })!,
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!,
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' })!,
};

// Type scale (design): 32 day headers · 18 note body · 14 timestamps · 12 captions.
export const type = {
  dayHeader: 32,
  screenTitle: 26,
  sectionTitle: 20,
  noteBody: 18,
  label: 16,
  timestamp: 14,
  caption: 12,
  /** Mono small-caps eyebrow line above screen titles. */
  overline: 11,
};

// One shadow language for every lifted surface, so cards read as the same paper
// stock across every tab. Left theme-independent: at 5% opacity the tone is
// invisible, and every component imports this at module scope.
export const shadows = {
  /** Note cards, agenda rows, list items — a soft lift off the paper. */
  card: {
    shadowColor: '#2A2010',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  /** Full sheets (Flip page, modals) — sits a step higher. */
  sheet: {
    shadowColor: '#2A2010',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

/** Letterpress ornament used by separators and empty states. */
export const ornament = '❧';

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};
