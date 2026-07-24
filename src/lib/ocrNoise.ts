// Photographing a screen (phone/monitor/TV) instead of paper hands the OCR
// recognizer things beyond the content you meant to capture: the status bar's
// clock/battery/signal, and moiré-driven misreads that show up as stray
// symbol-only lines. None of this is fabricated by DayFeed — it's real pixels
// the recognizer read — but it's junk relative to the note, so it's stripped
// line-by-line before ocr_text is saved.
// Whole-line phrases that are only ever screen chrome, never note content.
const NOISE_FULL_LINE_PATTERNS: RegExp[] = [
  /^(No service|Airplane mode)$/i,
  // Battery percentage with a space before the sign: "87 %" (two tokens,
  // where the bare "87" token alone would be too generic to treat as noise)
  /^\d{1,3}\s%$/,
  // Symbol-only OCR noise (moiré misreads): no letters or digits at all
  /^[^\w\s]{1,4}$/,
];

// Individual tokens that only appear in status-bar chrome. A line made up
// entirely of these (e.g. "LTE 100%", "9:41 AM") is noise; a line that mixes
// one of these in with real words (e.g. "100% sure this works") is not.
const NOISE_TOKEN_PATTERNS: RegExp[] = [
  /^\d{1,2}:\d{2}$/, // clock: "9:41"
  /^[APap]\.?[Mm]\.?$/, // "AM" / "p.m."
  /^\d{1,3}%$/, // battery: "100%"
  /^(LTE|VoLTE|5G\+?|4G\+?|3G|Wi-?Fi|WiFi|VPN|SOS)$/i, // connectivity/carrier chrome
];

const MAX_NOISE_TOKENS = 4;

// Browser tab-switcher chrome: photographing a tab strip (or a tab-switcher
// screenshot) reads as several tab titles run together, each followed by its
// "✕" close button misread as a bare "x"/"X". Two or more of those on one
// line, with none of a sentence's usual punctuation, is the shape of a tab
// strip — not something ordinary prose produces. (A rare exception: a math
// line like "5 x 3 = 2 x 4" with no other punctuation would also match — an
// accepted false positive for this narrow a heuristic.)
function isTabStripLine(line: string): boolean {
  const tokens = line.split(/\s+/);
  const closeButtonTokens = tokens.filter((t) => t === 'x' || t === 'X').length;
  if (closeButtonTokens < 2) return false;
  return !/[.,!?;:]/.test(line);
}

/** True if a single line of recognized text is screen-chrome noise, not content. */
export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (NOISE_FULL_LINE_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (isTabStripLine(trimmed)) return true;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0 || tokens.length > MAX_NOISE_TOKENS) return false;
  return tokens.every((t) => NOISE_TOKEN_PATTERNS.some((p) => p.test(t)));
}

/**
 * Drop status-bar/system-chrome lines (clock, battery, signal) and
 * symbol-only misreads from a block of recognized text, collapsing any
 * blank lines left behind by removed lines.
 */
export function stripOcrNoise(text: string): string {
  return text
    .split('\n')
    .filter((line) => !isNoiseLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
