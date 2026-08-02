// Pulling readable text out of an imported document, on-device only.
//
// .txt/.md are read straight off disk. .docx is a ZIP of XML, so a pure-JS
// unzip gets us its body. .pdf deliberately yields nothing: there is no
// dependable offline PDF text extractor for React Native, and OCR'ing rendered
// pages would produce lossy text from a file that already contains perfect
// text. PDFs still attach and open in the user's own viewer.
import { File } from 'expo-file-system';
import { unzipSync, strFromU8 } from 'fflate';

/** Lowercase extension without the dot, or '' when the name has none. */
export function extensionOf(name: string): string {
  const clean = name.split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot < clean.lastIndexOf('/')) return '';
  return clean.slice(dot + 1).toLowerCase();
}

/** Extensions we can pull text out of. Everything else attaches without text. */
const TEXT_EXTENSIONS = ['txt', 'md', 'markdown'];

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function decodeEntities(s: string): string {
  // &amp; last would double-decode "&amp;lt;", so rely on a single pass.
  return s.replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m);
}

/**
 * Convert the body XML of a .docx (word/document.xml) to plain text.
 *
 * Word wraps every run of text in nested tags; the structure we care about is
 * just paragraphs, tabs and line breaks. Exported separately from the file
 * handling so it can be tested without building a ZIP.
 */
export function docxXmlToText(xml: string): string {
  const withBreaks = xml
    // Cells first: a cell wraps its text in paragraphs, so handling </w:p>
    // ahead of </w:tc> would break every row onto its own set of lines.
    .replace(/<\/w:p>\s*<\/w:tc>/g, '\t')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:tr>/g, '\n')
    // Paragraph ends become newlines. Closing tag, so the text inside is
    // already emitted by the time the break lands.
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<w:tab\s*\/?>/g, '\t');

  const text = decodeEntities(withBreaks.replace(/<[^>]*>/g, ''));

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Read word/document.xml out of a .docx buffer. Null if it isn't one. */
function docxBodyXml(bytes: Uint8Array): string | null {
  const entries = unzipSync(bytes);
  const body = entries['word/document.xml'];
  return body ? strFromU8(body) : null;
}

/**
 * The document's text for use as note context, or null when the format can't
 * give us one (a PDF, an unknown type, or a file we failed to parse).
 *
 * Never throws: a document that won't parse should still attach, just without
 * text, rather than failing the whole import.
 */
export async function extractDocumentText(uri: string, name: string): Promise<string | null> {
  const ext = extensionOf(name) || extensionOf(uri);

  try {
    const file = new File(uri);

    if (TEXT_EXTENSIONS.includes(ext)) {
      const text = await file.text();
      return text.trim() ? text : null;
    }

    if (ext === 'docx') {
      const xml = docxBodyXml(await file.bytes());
      if (!xml) return null;
      const text = docxXmlToText(xml);
      return text ? text : null;
    }
  } catch {
    return null;
  }

  return null;
}
