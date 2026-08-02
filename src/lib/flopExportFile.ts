// Writing an export to disk and handing it to the share sheet. Kept apart from
// flopExport.ts so that module stays pure (and unit-testable) while the native
// print/share/file calls live here.
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  exportFileName,
  flopTreeToDocx,
  flopTreeToHtml,
  type FlopSection,
} from './flopExport';

export type ExportFormat = 'pdf' | 'docx';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Render sections to a file and open the share sheet on it. */
export async function exportFlopSections(
  sections: FlopSection[],
  title: string,
  format: ExportFormat,
): Promise<void> {
  const base = exportFileName(title);
  const uri =
    format === 'pdf'
      ? await writePdf(sections, title)
      : await writeDocx(sections, base);

  // Sharing hands Android a content:// URI, which is what other apps can
  // actually read — a file:// path from our sandbox would be rejected.
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: format === 'pdf' ? 'application/pdf' : DOCX_MIME,
      dialogTitle: title,
      UTI: format === 'pdf' ? 'com.adobe.pdf' : undefined,
    });
  }
}

/** Android's own print stack renders the HTML — no network involved. */
async function writePdf(sections: FlopSection[], title: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({
    html: flopTreeToHtml(sections, title),
  });
  return uri;
}

async function writeDocx(sections: FlopSection[], base: string): Promise<string> {
  const file = new File(Paths.cache, `${base}.docx`);
  if (file.exists) file.delete();
  file.create();
  file.write(flopTreeToDocx(sections));
  return file.uri;
}
