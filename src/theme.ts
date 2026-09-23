import { Platform } from 'react-native';

// DayFeed design system — "old bookbinding": warm paper background, crisp white
// note cards, and an accent (the color of the book's spine). Calm, built for
// long reading. v1.4 added a dark companion: the same book after sundown —
// deep coffee-brown leather, cream ink, brighter accent. v1.5 lets the spine
// color itself be chosen (theme.accentThemes below) while the paper stays put.
// Components never import a palette directly; they read the active one from
// ThemeContext.
const lightBase = {
  bg: '#FAF8F3', // warm off-white "paper" — never harsh white, easy on the eyes
  surface: '#FFFFFF', // crisp white for the bubbles/note cards themselves
  surfaceAlt: '#F1EEE8', // subtle warm fill for inputs, chips, tracks
  divider: '#E8E5E0', // lighter warm tone for separators

  text: '#1A1A1A', // almost-black, warm undertone
  textDim: '#6B6B6B', // muted gray for metadata / secondary
  textFaint: '#9A958C', // faint warm gray for captions / disabled

  danger: '#B4473F', // muted brick red, warm-palette friendly
  success: '#5A7052', // moss green — done, finished (matches Flop's "support")

  // Aliases kept so existing components resolve to the new palette.
  border: '#E8E5E0', // = divider
  bubbleOwnText: '#1A1A1A', // = text

  // Flip "paper" sheet (now crisp white against the warm page bg).
  page: '#FFFFFF',
  pageText: '#1A1A1A',
  pageLine: '#E8E5E0',
  pageDim: '#9A958C',
};

export type BaseTokens = typeof lightBase;

// Dark mode: dark browns, not grays — the leather cover rather than a night sky.
const darkBase: BaseTokens = {
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
};

// Accent — the one thing a color theme changes. Interaction, pins, active
// state, selected chips/dates, the voice-capture ring.
export interface AccentTokens {
  accent: string;
  accentDark: string; // pressed/active (never a drastic change from accent)
  accentTint: string; // washed accent for fills/backgrounds
  accentEdge: string; // washed accent for borders
  voiceAccent: string; // = accent
  bubbleOwn: string; // = accent (active chips, selected dates, agenda marks)
}

export type AccentId = 'bronze' | 'ocean' | 'forest' | 'slate' | 'amethyst' | 'blush' | 'teal';

export interface AccentTheme {
  label: string;
  light: AccentTokens;
  dark: AccentTokens;
}

// Six themes beyond the original bronze: three of the most-liked colors for
// men (ocean blue, forest green, slate) and three for women (amethyst,
// blush, teal), per common color-preference surveys. Bronze stays the
// default so existing installs don't change look until someone picks a
// theme in Settings.
export const accentThemes: Record<AccentId, AccentTheme> = {
  bronze: {
    label: 'Bronze (original)',
    light: {
      accent: '#A67C52',
      accentDark: '#8B6B42',
      accentTint: 'rgba(166,124,82,0.10)',
      accentEdge: 'rgba(166,124,82,0.28)',
      voiceAccent: '#A67C52',
      bubbleOwn: '#A67C52',
    },
    dark: {
      accent: '#C89B66',
      accentDark: '#A67C52',
      accentTint: 'rgba(200,155,102,0.14)',
      accentEdge: 'rgba(200,155,102,0.35)',
      voiceAccent: '#C89B66',
      bubbleOwn: '#C89B66',
    },
  },
  ocean: {
    label: 'Ocean',
    light: {
      accent: '#3E6FA6',
      accentDark: '#335A87',
      accentTint: 'rgba(62,111,166,0.10)',
      accentEdge: 'rgba(62,111,166,0.28)',
      voiceAccent: '#3E6FA6',
      bubbleOwn: '#3E6FA6',
    },
    dark: {
      accent: '#6FA0D8',
      accentDark: '#3E6FA6',
      accentTint: 'rgba(111,160,216,0.14)',
      accentEdge: 'rgba(111,160,216,0.35)',
      voiceAccent: '#6FA0D8',
      bubbleOwn: '#6FA0D8',
    },
  },
  forest: {
    label: 'Forest',
    light: {
      accent: '#4C7A52',
      accentDark: '#3D6242',
      accentTint: 'rgba(76,122,82,0.10)',
      accentEdge: 'rgba(76,122,82,0.28)',
      voiceAccent: '#4C7A52',
      bubbleOwn: '#4C7A52',
    },
    dark: {
      accent: '#79AD80',
      accentDark: '#4C7A52',
      accentTint: 'rgba(121,173,128,0.14)',
      accentEdge: 'rgba(121,173,128,0.35)',
      voiceAccent: '#79AD80',
      bubbleOwn: '#79AD80',
    },
  },
  slate: {
    label: 'Slate',
    light: {
      accent: '#63798A',
      accentDark: '#516371',
      accentTint: 'rgba(99,121,138,0.10)',
      accentEdge: 'rgba(99,121,138,0.28)',
      voiceAccent: '#63798A',
      bubbleOwn: '#63798A',
    },
    dark: {
      accent: '#A9BDC9',
      accentDark: '#63798A',
      accentTint: 'rgba(169,189,201,0.14)',
      accentEdge: 'rgba(169,189,201,0.35)',
      voiceAccent: '#A9BDC9',
      bubbleOwn: '#A9BDC9',
    },
  },
  amethyst: {
    label: 'Amethyst',
    light: {
      accent: '#7C5C9E',
      accentDark: '#654B80',
      accentTint: 'rgba(124,92,158,0.10)',
      accentEdge: 'rgba(124,92,158,0.28)',
      voiceAccent: '#7C5C9E',
      bubbleOwn: '#7C5C9E',
    },
    dark: {
      accent: '#AD8BCB',
      accentDark: '#7C5C9E',
      accentTint: 'rgba(173,139,203,0.14)',
      accentEdge: 'rgba(173,139,203,0.35)',
      voiceAccent: '#AD8BCB',
      bubbleOwn: '#AD8BCB',
    },
  },
  blush: {
    label: 'Blush',
    light: {
      accent: '#C15B78',
      accentDark: '#9E4B62',
      accentTint: 'rgba(193,91,120,0.10)',
      accentEdge: 'rgba(193,91,120,0.28)',
      voiceAccent: '#C15B78',
      bubbleOwn: '#C15B78',
    },
    dark: {
      accent: '#EF89A6',
      accentDark: '#C15B78',
      accentTint: 'rgba(239,137,166,0.14)',
      accentEdge: 'rgba(239,137,166,0.35)',
      voiceAccent: '#EF89A6',
      bubbleOwn: '#EF89A6',
    },
  },
  teal: {
    label: 'Teal',
    light: {
      accent: '#5FA39E',
      accentDark: '#4E8682',
      accentTint: 'rgba(95,163,158,0.10)',
      accentEdge: 'rgba(95,163,158,0.28)',
      voiceAccent: '#5FA39E',
      bubbleOwn: '#5FA39E',
    },
    dark: {
      accent: '#91D6D0',
      accentDark: '#5FA39E',
      accentTint: 'rgba(145,214,208,0.14)',
      accentEdge: 'rgba(145,214,208,0.35)',
      voiceAccent: '#91D6D0',
      bubbleOwn: '#91D6D0',
    },
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

export type ColorPalette = BaseTokens & AccentTokens;

export function makePalette(mode: 'light' | 'dark', accentId: AccentId): ColorPalette {
  const base = mode === 'dark' ? darkBase : lightBase;
  const accent = accentThemes[accentId][mode];
  return { ...base, ...accent };
}

// Kept for any code that still wants the plain bronze palette directly.
export const lightColors: ColorPalette = makePalette('light', 'bronze');
export const darkColors: ColorPalette = makePalette('dark', 'bronze');

// Flop relation colors — the one place the palette expands beyond ink and bronze.
// Three muted, paper-compatible tones per mode. Color is never the only
// indicator: every use pairs the tone with an icon and a label.
export const relationStyleLight = {
  support: {
    label: 'Support',
    plural: 'SUPPORT',
    color: '#5A7052', // moss green
    tint: '#E7ECE3',
    icon: '↑', // upward arrow
  },
  idea: {
    label: 'Idea',
    plural: 'IDEAS',
    color: '#8A6238', // bronze — ideas are the app's native impulse
    tint: '#F0E7DC',
    icon: '⑂', // branching fork
  },
  oppose: {
    label: 'Oppose',
    plural: 'OPPOSE',
    color: '#94524A', // brick red
    tint: '#F0E2E0',
    icon: '←', // counter arrow
  },
};

export type RelationStyleMap = typeof relationStyleLight;

export const relationStyleDark: RelationStyleMap = {
  support: {
    label: 'Support',
    plural: 'SUPPORT',
    color: '#8FA986', // moss lifted for dark leather
    tint: 'rgba(143,169,134,0.14)',
    icon: '↑',
  },
  idea: {
    label: 'Idea',
    plural: 'IDEAS',
    color: '#C89B66',
    tint: 'rgba(200,155,102,0.14)',
    icon: '⑂',
  },
  oppose: {
    label: 'Oppose',
    plural: 'OPPOSE',
    color: '#D0877D',
    tint: 'rgba(208,135,125,0.14)',
    icon: '←',
  },
};

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
// stock across every tab.
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
