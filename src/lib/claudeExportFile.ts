// Writing the Claude-tagged notes export and handing it to the share sheet.
// Split from claudeTag.ts so that module stays pure and unit-testable while
// the native file/share calls live here.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CLAUDE_EXPORT_FILENAME, claudeNotesToMarkdown } from './claudeTag';
import type { Note } from '../db/types';

/**
 * Render the notes to the stable filename and open the share sheet on it.
 * Saving from there to Downloads is what scripts/pull-claude-notes.sh expects.
 */
export async function exportClaudeNotes(notes: Note[]): Promise<void> {
  const file = new File(Paths.cache, CLAUDE_EXPORT_FILENAME);
  // Overwrite rather than append — the export is always the current full set.
  if (file.exists) file.delete();
  file.create();
  file.write(claudeNotesToMarkdown(notes));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/markdown',
      dialogTitle: 'Notes tagged for Claude',
      UTI: 'net.daringfireball.markdown',
    });
  }
}
