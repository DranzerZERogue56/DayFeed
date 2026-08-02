// Turning Flop notes into a document someone else can read.
//
// Both output formats consume the same flattened section list, so the tree
// walk is written once and is the part worth testing. PDF goes out as HTML
// through expo-print (Android's own print stack renders it, no network); .docx
// is a minimal OOXML package zipped with fflate.
import { zipSync, strToU8 } from 'fflate';
import { flopBody, flopTitle, type FlopNote } from '../db/flopTypes';

export interface FlopSection {
  /** 0 for a root note, +1 per level of nesting. */
  depth: number;
  title: string;
  body: string;
  /** How this note relates to its parent; 'root' at the top. */
  relation: FlopNote['relation'];
  /** Names of files attached to this note, listed for the reader's reference. */
  attachments: string[];
}

/** Children of a note, keyed by parent id. */
export type ChildLookup = (parentId: string) => FlopNote[];
/** Attachment filenames for a note. */
export type AttachmentLookup = (noteId: string) => string[];

/**
 * Walk one or more Flop notes into an ordered, depth-tagged section list.
 *
 * Depth-first so a note is immediately followed by its own subtree, which is
 * the order the note reads on screen. `childrenOf` returning [] bounds the
 * walk — pass one for a single-note export.
 */
export function flattenFlopTree(
  roots: FlopNote[],
  childrenOf: ChildLookup,
  attachmentsOf: AttachmentLookup = () => [],
): FlopSection[] {
  const out: FlopSection[] = [];

  const visit = (note: FlopNote, depth: number) => {
    out.push({
      depth,
      title: flopTitle(note),
      body: flopBody(note),
      relation: note.relation,
      attachments: attachmentsOf(note.id),
    });
    for (const child of childrenOf(note.id)) visit(child, depth + 1);
  };

  for (const root of roots) visit(root, 0);
  return out;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** XML escaping for the docx body. Attribute quotes matter here too. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Relations carry meaning in Flop, so label them rather than drop them. */
const RELATION_LABEL: Record<FlopNote['relation'], string> = {
  root: '',
  support: 'Supports',
  idea: 'Idea',
  oppose: 'Opposes',
};

/** Headings only go to h6; deeper nesting keeps the last level. */
const headingLevel = (depth: number) => Math.min(depth + 1, 6);

export function flopTreeToHtml(sections: FlopSection[], documentTitle: string): string {
  const body = sections
    .map((s) => {
      const h = headingLevel(s.depth);
      const label = RELATION_LABEL[s.relation];
      const parts = [
        label ? `<p class="relation">${escapeHtml(label)}</p>` : '',
        `<h${h}>${escapeHtml(s.title)}</h${h}>`,
        s.body ? `<p>${escapeHtml(s.body).replace(/\n/g, '<br/>')}</p>` : '',
        s.attachments.length
          ? `<p class="attachments">Attachments: ${s.attachments.map(escapeHtml).join(', ')}</p>`
          : '',
      ];
      return `<section class="depth-${s.depth}">${parts.filter(Boolean).join('')}</section>`;
    })
    .join('\n');

  // Inline styles in DayFeed's palette so an exported PDF still looks like the
  // app. Print CSS can't reach the theme context, so these are the light
  // palette's values literally.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(documentTitle)}</title>
<style>
  body { font-family: Georgia, serif; color: #1A1A1A; margin: 32px; line-height: 1.5; }
  h1, h2, h3, h4, h5, h6 { color: #1A1A1A; margin: 0 0 6px; }
  section { margin-bottom: 18px; }
  ${[1, 2, 3, 4, 5].map((d) => `.depth-${d} { margin-left: ${d * 18}px; }`).join('\n  ')}
  .relation { font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
              color: #A67C52; margin: 0 0 2px; }
  .attachments { font-size: 12px; color: #6B6B6B; font-style: italic; }
  p { margin: 0 0 8px; }
</style></head>
<body>${body}</body></html>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

/** One <w:p>, optionally with a named built-in style. */
function paragraph(text: string, style?: string): string {
  const props = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  // xml:space="preserve" keeps leading/trailing spaces Word would otherwise trim.
  return `<w:p>${props}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function flopTreeToDocumentXml(sections: FlopSection[]): string {
  const body = sections
    .flatMap((s) => {
      const label = RELATION_LABEL[s.relation];
      return [
        ...(label ? [paragraph(label)] : []),
        paragraph(s.title, `Heading${headingLevel(s.depth)}`),
        // Word has no multi-line run, so each line becomes its own paragraph.
        ...s.body.split('\n').filter(Boolean).map((line) => paragraph(line)),
        ...(s.attachments.length ? [paragraph(`Attachments: ${s.attachments.join(', ')}`)] : []),
      ];
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}</w:body></w:document>`;
}

/** A complete .docx as bytes, ready to write to disk. */
export function flopTreeToDocx(sections: FlopSection[]): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'word/_rels/document.xml.rels': strToU8(DOCUMENT_RELS),
    'word/document.xml': strToU8(flopTreeToDocumentXml(sections)),
  });
}

/** Filesystem-safe basename for an export, without extension. */
export function exportFileName(title: string): string {
  const safe = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 48);
  return safe || 'flop-export';
}
