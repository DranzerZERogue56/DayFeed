import { Platform } from 'react-native';

// DayFeed design system — "old bookbinding": warm paper background, crisp white
// note cards, and a bronze accent (the color of aged book spines). Light, calm,
// built for long reading rather than speed-scrolling.
export const colors = {
  bg: '#FAF8F3', // warm off-white "paper" — never harsh white, easy on the eyes
  surface: '#FFFFFF', // crisp white for the bubbles/note cards themselves
  surfaceAlt: '#F1EEE8', // subtle warm fill for inputs, chips, tracks
  divider: '#E8E5E0', // lighter warm tone for separators

  text: '#1A1A1A', // almost-black, warm undertone
  textDim: '#6B6B6B', // muted gray for metadata / secondary
  textFaint: '#9A958C', // faint warm gray for captions / disabled

  accent: '#A67C52', // warm bronze/copper — interaction, pins, active, highlights
  accentDark: '#8B6B42', // pressed/active bronze (never a drastic change)
  accentTint: 'rgba(166,124,82,0.10)', // washed bronze for fills/backgrounds
  accentEdge: 'rgba(166,124,82,0.28)', // washed bronze for borders

  danger: '#B4473F', // muted brick red, warm-palette friendly

  // Aliases kept so existing components resolve to the new palette.
  border: '#E8E5E0', // = divider
  voiceAccent: '#A67C52', // = accent
  bubbleOwn: '#A67C52', // = accent (used for active chips, selected dates, agenda marks)
  bubbleOwnText: '#1A1A1A', // = text

  // Flip "paper" sheet (now crisp white against the warm page bg).
  page: '#FFFFFF',
  pageText: '#1A1A1A',
  pageLine: '#E8E5E0',
  pageDim: '#9A958C',
};

// Flop relation colors — the one place the palette expands beyond ink and bronze.
// Three muted, paper-compatible tones. Color is never the only indicator: every
// use pairs the tone with an icon and a label.
export const relationStyle = {
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
} as const;

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
};

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
