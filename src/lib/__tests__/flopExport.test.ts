import { unzipSync, strFromU8 } from 'fflate';
import {
  escapeHtml,
  escapeXml,
  exportFileName,
  flattenFlopTree,
  flopTreeToDocx,
  flopTreeToDocumentXml,
  flopTreeToHtml,
} from '../flopExport';
import type { FlopNote } from '../../db/flopTypes';

function note(id: string, content: string, relation: FlopNote['relation'] = 'root'): FlopNote {
  return {
    id,
    parent_id: null,
    relation,
    type: 'text',
    content,
    audio_uri: null,
    duration_ms: null,
    transcript: null,
    created_at: 0,
    updated_at: 0,
    sort_order: 0,
  };
}

/** root -> (a -> a1), b */
const tree: Record<string, FlopNote[]> = {
  root: [note('a', 'Alpha', 'support'), note('b', 'Bravo', 'oppose')],
  a: [note('a1', 'Alpha one', 'idea')],
};
const childrenOf = (id: string) => tree[id] ?? [];

describe('flattenFlopTree', () => {
  it('walks depth-first so a note is followed by its own subtree', () => {
    const out = flattenFlopTree([note('root', 'Root')], childrenOf);
    expect(out.map((s) => s.title)).toEqual(['Root', 'Alpha', 'Alpha one', 'Bravo']);
  });

  it('tags each section with its nesting depth', () => {
    const out = flattenFlopTree([note('root', 'Root')], childrenOf);
    expect(out.map((s) => s.depth)).toEqual([0, 1, 2, 1]);
  });

  it('keeps each note relation', () => {
    const out = flattenFlopTree([note('root', 'Root')], childrenOf);
    expect(out.map((s) => s.relation)).toEqual(['root', 'support', 'idea', 'oppose']);
  });

  it('exports a single note alone when no children are supplied', () => {
    const out = flattenFlopTree([note('root', 'Root')], () => []);
    expect(out).toHaveLength(1);
    expect(out[0].depth).toBe(0);
  });

  it('handles a whole-library export of several roots', () => {
    const out = flattenFlopTree([note('r1', 'One'), note('r2', 'Two')], () => []);
    expect(out.map((s) => s.title)).toEqual(['One', 'Two']);
    expect(out.every((s) => s.depth === 0)).toBe(true);
  });

  it('splits title from body at the first line', () => {
    const [section] = flattenFlopTree([note('root', 'The title\nthe body')], () => []);
    expect(section.title).toBe('The title');
    expect(section.body).toBe('the body');
  });

  it('attaches filenames from the lookup', () => {
    const [section] = flattenFlopTree([note('root', 'Root')], () => [], () => ['spec.docx']);
    expect(section.attachments).toEqual(['spec.docx']);
  });

  it('returns nothing for no roots', () => {
    expect(flattenFlopTree([], childrenOf)).toEqual([]);
  });
});

describe('escaping', () => {
  it('escapes html metacharacters', () => {
    expect(escapeHtml('<b> & "x"')).toBe('&lt;b&gt; &amp; &quot;x&quot;');
  });

  it('escapes xml metacharacters', () => {
    expect(escapeXml(`<a> & 'b'`)).toBe('&lt;a&gt; &amp; &apos;b&apos;');
  });

  it('escapes the ampersand first, so entities are not doubled', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('flopTreeToHtml', () => {
  const sections = flattenFlopTree([note('root', 'Root\nbody text')], childrenOf);

  it('renders a heading per section, deepening with nesting', () => {
    const html = flopTreeToHtml(sections, 'Doc');
    expect(html).toContain('<h1>Root</h1>');
    expect(html).toContain('<h2>Alpha</h2>');
    expect(html).toContain('<h3>Alpha one</h3>');
  });

  it('labels child relations', () => {
    const html = flopTreeToHtml(sections, 'Doc');
    expect(html).toContain('Supports');
    expect(html).toContain('Opposes');
  });

  it('escapes note text so markup in a note cannot break the document', () => {
    const risky = flattenFlopTree([note('root', '<script>alert(1)</script>')], () => []);
    const html = flopTreeToHtml(risky, 'Doc');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes the document title too', () => {
    expect(flopTreeToHtml([], '<evil>')).toContain('&lt;evil&gt;');
  });
});

describe('flopTreeToDocumentXml', () => {
  const sections = flattenFlopTree([note('root', 'Root\nline one\nline two')], () => []);

  it('gives each body line its own paragraph', () => {
    const xml = flopTreeToDocumentXml(sections);
    expect(xml).toContain('line one');
    expect(xml).toContain('line two');
    // title + two body lines
    expect(xml.match(/<w:p>/g)).toHaveLength(3);
  });

  it('styles the title as a heading at its depth', () => {
    expect(flopTreeToDocumentXml(sections)).toContain('w:val="Heading1"');
    const nested = flattenFlopTree([note('root', 'Root')], childrenOf);
    expect(flopTreeToDocumentXml(nested)).toContain('w:val="Heading2"');
  });

  it('escapes note text so it cannot break the package', () => {
    const risky = flattenFlopTree([note('root', 'Tom & Jerry <tag>')], () => []);
    const xml = flopTreeToDocumentXml(risky);
    expect(xml).toContain('Tom &amp; Jerry &lt;tag&gt;');
    expect(xml).not.toContain('<tag>');
  });
});

describe('flopTreeToDocx', () => {
  const bytes = flopTreeToDocx(flattenFlopTree([note('root', 'Root')], () => []));

  it('produces a package with the four parts Word requires', () => {
    const entries = unzipSync(bytes);
    expect(Object.keys(entries).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/_rels/document.xml.rels',
      'word/document.xml',
    ]);
  });

  it('round-trips the note text through the zip', () => {
    const entries = unzipSync(bytes);
    expect(strFromU8(entries['word/document.xml'])).toContain('Root');
  });
});

describe('exportFileName', () => {
  it('slugs a title into something safe for a filename', () => {
    expect(exportFileName('My Big Idea')).toBe('My-Big-Idea');
  });

  it('strips characters a filesystem would object to', () => {
    expect(exportFileName('a/b:c*d?')).toBe('abcd');
  });

  it('falls back when a title has nothing usable', () => {
    expect(exportFileName('///')).toBe('flop-export');
    expect(exportFileName('')).toBe('flop-export');
  });
});
