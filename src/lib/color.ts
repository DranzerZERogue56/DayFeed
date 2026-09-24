// Small color math, used to build the theme palettes in ../theme.
//
// Themes are written as a handful of hue/saturation seeds rather than ~40
// hand-picked hex codes each, so the seven themes stay consistent with one
// another: every theme's background sits at the same lightness, every
// theme's accent at the same lightness, and only the hue moves. That's what
// keeps text just as readable in Forest as it is in Bronze.
//
// Hand-rolled rather than pulling in a color library: this is about sixty
// lines, it runs at module load on every app start, and a dependency here
// would be one more thing to keep working offline.

/** Hue 0-360, saturation 0-100, lightness 0-100 → [r, g, b] each 0-255. */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const lum = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lum - c / 2;

  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return [round255(r + m), round255(g + m), round255(b + m)];
}

/** HSL → '#rrggbb'. */
export function hsl(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** HSL → 'rgba(r, g, b, a)'. React Native has no color-mix, so tints and
 *  edges are written out as translucent rgba over whatever sits behind. */
export function hsla(h: number, s: number, l: number, a: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** '#rrggbb' → 'rgba(r, g, b, a)'. */
export function withAlpha(hexColor: string, a: number): string {
  const [r, g, b] = parseHex(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** '#rgb' or '#rrggbb' → [r, g, b]. */
export function parseHex(hexColor: string): [number, number, number] {
  const raw = hexColor.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance of a '#rrggbb'. */
export function luminance(hexColor: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = parseHex(hexColor);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG contrast ratio between two '#rrggbb' colors, 1 (identical) to 21
 * (black on white). The theme tests use this to prove every theme keeps its
 * text readable on its own background — 4.5 is the usual floor for body
 * text, 3.0 for large text and icons.
 */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round255(v: number): number {
  return Math.round(clamp(v, 0, 1) * 255);
}

function hex2(v: number): string {
  return v.toString(16).padStart(2, '0');
}
