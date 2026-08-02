import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { docxXmlToText, extensionOf, extractDocumentText } from '../documentText';

const doc = (inner: string) =>
  `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${inner}</w:body></w:document>`;
const para = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

describe('extensionOf', () => {
  it('lowercases the extension', () => {
    expect(extensionOf('Report.DOCX')).toBe('docx');
  });

  it('returns empty for a name with no extension', () => {
    expect(extensionOf('README')).toBe('');
  });

  it('ignores dots in parent directories', () => {
    expect(extensionOf('/my.files/report')).toBe('');
  });

  it('ignores a query string', () => {
    expect(extensionOf('file.md?v=2')).toBe('md');
  });
});

describe('docxXmlToText', () => {
  it('turns paragraphs into lines and drops the markup', () => {
    expect(docxXmlToText(doc(para('First line') + para('Second line')))).toBe(
      'First line\nSecond line',
    );
  });

  it('joins the runs Word splits a sentence across', () => {
    const split = '<w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t>world</w:t></w:r></w:p>';
    expect(docxXmlToText(doc(split))).toBe('Hello world');
  });

  it('converts tabs and explicit line breaks', () => {
    const inner = '<w:p><w:r><w:t>a</w:t><w:tab/><w:t>b</w:t><w:br/><w:t>c</w:t></w:r></w:p>';
    expect(docxXmlToText(doc(inner))).toBe('a\tb\nc');
  });

  it('separates table cells and rows', () => {
    const row =
      '<w:tr><w:tc><w:p><w:r><w:t>one</w:t></w:r></w:p></w:tc>' +
      '<w:tc><w:p><w:r><w:t>two</w:t></w:r></w:p></w:tc></w:tr>';
    expect(docxXmlToText(doc(row))).toBe('one\ttwo');
  });

  it('decodes XML entities without double-decoding', () => {
    expect(docxXmlToText(doc(para('Tom &amp; Jerry')))).toBe('Tom & Jerry');
    expect(docxXmlToText(doc(para('5 &lt; 6')))).toBe('5 < 6');
    // "&amp;lt;" is a literal "&lt;", not an escaped "<".
    expect(docxXmlToText(doc(para('&amp;lt;')))).toBe('&lt;');
  });

  it('collapses runs of blank paragraphs', () => {
    const withGaps = para('a') + para('') + para('') + para('') + para('b');
    expect(docxXmlToText(doc(withGaps))).toBe('a\n\nb');
  });

  it('returns empty for a document with no text', () => {
    expect(docxXmlToText(doc(''))).toBe('');
  });

  it('degrades instead of throwing on malformed xml', () => {
    expect(() => docxXmlToText('<w:p><w:r><w:t>unclosed')).not.toThrow();
  });
});

describe('extractDocumentText', () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dayfeed-doc-'));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (name: string, data: string | Uint8Array) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, data);
    return p;
  };

  const docxFile = (name: string, bodyXml: string) =>
    write(name, zipSync({ 'word/document.xml': strToU8(doc(bodyXml)) }));

  it('reads a plain text file', async () => {
    const uri = write('notes.txt', 'hello from a text file');
    expect(await extractDocumentText(uri, 'notes.txt')).toBe('hello from a text file');
  });

  it('reads markdown, keeping its list markers for the note renderer', async () => {
    const uri = write('list.md', '# Title\n- one\n- two');
    expect(await extractDocumentText(uri, 'list.md')).toBe('# Title\n- one\n- two');
  });

  it('reads the body of a real docx package', async () => {
    const uri = docxFile('report.docx', para('Quarterly report') + para('It went well.'));
    expect(await extractDocumentText(uri, 'report.docx')).toBe(
      'Quarterly report\nIt went well.',
    );
  });

  it('returns null for a pdf — attached, but no text', async () => {
    const uri = write('paper.pdf', '%PDF-1.4 binary junk');
    expect(await extractDocumentText(uri, 'paper.pdf')).toBeNull();
  });

  it('returns null for an unknown extension', async () => {
    const uri = write('archive.zip', 'whatever');
    expect(await extractDocumentText(uri, 'archive.zip')).toBeNull();
  });

  it('returns null rather than throwing when a docx is corrupt', async () => {
    const uri = write('broken.docx', 'not a zip at all');
    await expect(extractDocumentText(uri, 'broken.docx')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the file is missing', async () => {
    await expect(
      extractDocumentText(path.join(dir, 'gone.txt'), 'gone.txt'),
    ).resolves.toBeNull();
  });

  it('returns null for an empty text file', async () => {
    const uri = write('empty.txt', '   \n  ');
    expect(await extractDocumentText(uri, 'empty.txt')).toBeNull();
  });

  it('returns null for a docx with no document part', async () => {
    const uri = write('odd.docx', zipSync({ 'other.xml': strToU8('<x/>') }));
    expect(await extractDocumentText(uri, 'odd.docx')).toBeNull();
  });
});
