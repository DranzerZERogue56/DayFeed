import { normalizeOcrMarkers } from '../ocrMarkdown';

describe('normalizeOcrMarkers', () => {
  it('rewrites bullet glyphs to "- "', () => {
    expect(normalizeOcrMarkers('• Milk\n● Eggs\n▪ Bread')).toBe('- Milk\n- Eggs\n- Bread');
  });

  it('rewrites unchecked checkbox glyphs to "[ ] "', () => {
    expect(normalizeOcrMarkers('☐ Buy milk\n□ Buy eggs')).toBe('[ ] Buy milk\n[ ] Buy eggs');
  });

  it('rewrites checked checkbox glyphs to "[x] "', () => {
    expect(normalizeOcrMarkers('☑ Done\n✅ Also done')).toBe('[x] Done\n[x] Also done');
  });

  it('rewrites "1)" / "1-" numbering to "1. "', () => {
    expect(normalizeOcrMarkers('1) Milk\n2) Eggs')).toBe('1. Milk\n2. Eggs');
    expect(normalizeOcrMarkers('1- Milk\n2- Eggs')).toBe('1. Milk\n2. Eggs');
  });

  it('leaves already-canonical markdown-lite syntax untouched', () => {
    const raw = '1. Milk\n- Eggs\n[ ] Bread\n[x] Butter';
    expect(normalizeOcrMarkers(raw)).toBe(raw);
  });

  it('leaves plain prose untouched, including numbers that are not list markers', () => {
    expect(normalizeOcrMarkers('24-hour service')).toBe('24-hour service');
    expect(normalizeOcrMarkers('1975 - a good year')).toBe('1975 - a good year');
    expect(normalizeOcrMarkers('Meeting notes')).toBe('Meeting notes');
  });

  it('preserves leading indentation', () => {
    expect(normalizeOcrMarkers('  • Indented item')).toBe('  - Indented item');
  });
});
