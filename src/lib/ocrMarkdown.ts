// Printed/handwritten lists don't use the exact "1. " / "- " / "[ ] " syntax
// markdownList.ts recognizes — they use bullet glyphs, checkbox glyphs, or
// "1)" style numbering. This rewrites recognized OCR text line-by-line into
// that canonical syntax so MarkdownText renders real bullets/numbers/
// checkboxes for it, the same as a typed note.
const BULLET_GLYPHS = /^[•●▪‣∙]\s*/;
const CHECKED_GLYPHS = /^[☑✅]\s*/;
const UNCHECKED_GLYPHS = /^[☐□❑]\s*/;
// "1)" or "1-" at line start — "1. " (already-canonical) is left untouched
// since the dot isn't in this class.
const ORDERED_ALT_RE = /^(\d+)[)-]\s+(.*)$/;

export function normalizeOcrMarkers(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const leading = line.match(/^\s*/)![0];
      const rest = line.slice(leading.length);

      if (CHECKED_GLYPHS.test(rest)) return leading + '[x] ' + rest.replace(CHECKED_GLYPHS, '');
      if (UNCHECKED_GLYPHS.test(rest)) return leading + '[ ] ' + rest.replace(UNCHECKED_GLYPHS, '');
      if (BULLET_GLYPHS.test(rest)) return leading + '- ' + rest.replace(BULLET_GLYPHS, '');

      const ordered = rest.match(ORDERED_ALT_RE);
      if (ordered) return `${leading}${ordered[1]}. ${ordered[2]}`;

      return line;
    })
    .join('\n');
}
