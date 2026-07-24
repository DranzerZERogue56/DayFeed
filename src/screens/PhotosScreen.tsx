import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import OcrControl from '../components/OcrControl';
import PhotoGrid from '../components/PhotoGrid';
import PhotoViewer from '../components/PhotoViewer';
import NoteActionsSheet from '../components/NoteActionsSheet';
import { useAllNotes } from '../hooks/useQueries';
import { useNotes } from '../hooks/NotesContext';
import { parseMediaUris, type Note } from '../db/types';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const COLUMNS = 3;
const GAP = 3;

// Photos sub-feed: every photo note as a grid, reachable from a header button
// on Feed. Tapping a tile opens the same OcrControl/PhotoGrid combo NoteBubble
// uses, so extraction/copy/checkbox behavior is identical to Feed.
export default function PhotosScreen({ visible, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { notes } = useAllNotes({ type: 'photo' });
  const { saveOcrText, removeNote } = useNotes();
  const [selected, setSelected] = useState<Note | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tileSize = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  const selectedMedia = selected ? parseMediaUris(selected) : [];

  const closeDetail = () => {
    setSelected(null);
    setViewerIndex(null);
    setConfirmDelete(false);
  };

  const confirmAndDelete = async () => {
    if (!selected) return;
    await removeNote(selected.id);
    closeDetail();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back to Feed">
            <Text style={styles.back}>‹ Feed</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Photos</Text>
          <View style={styles.headerSpacer} />
        </View>

        {notes.length === 0 ? (
          <EmptyState
            title="No photo notes yet."
            hint="Photos you capture in Feed show up here as a grid."
          />
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(n) => n.id}
            numColumns={COLUMNS}
            renderItem={({ item }) => {
              const media = parseMediaUris(item);
              return (
                <TouchableOpacity
                  style={[styles.tile, { width: tileSize, height: tileSize }]}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: media[0] }} style={styles.tileImage} resizeMode="cover" />
                  {media.length > 1 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.badgeText}>{media.length}</Text>
                    </View>
                  )}
                  {!!item.ocr_text && (
                    <View style={styles.ocrBadge}>
                      <Text style={styles.badgeText}>Aa</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>

      <Modal
        visible={selected !== null}
        animationType="slide"
        onRequestClose={closeDetail}
        transparent={false}
      >
        {selected && (
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <TouchableOpacity onPress={closeDetail} accessibilityLabel="Back to Photos">
                <Text style={styles.back}>‹ Photos</Text>
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                Photo note
              </Text>
              <TouchableOpacity onPress={() => setConfirmDelete(true)} accessibilityLabel="Delete note">
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.detailBody}>
              <PhotoGrid
                uris={selectedMedia}
                onOpen={(index) => setViewerIndex(index)}
                maxVisible={8}
                size={90}
              />
              <OcrControl
                mediaUris={selectedMedia}
                ocrText={selected.ocr_text}
                onExtracted={(text) => saveOcrText(selected, text)}
              />
            </View>
          </SafeAreaView>
        )}

        <PhotoViewer
          uris={selectedMedia}
          initialIndex={viewerIndex ?? 0}
          visible={viewerIndex !== null}
          onClose={() => setViewerIndex(null)}
        />

        <NoteActionsSheet
          visible={confirmDelete}
          subtitle="This photo note and its images will be permanently removed."
          actions={[{ label: 'Delete', danger: true, onPress: confirmAndDelete }]}
          onClose={() => setConfirmDelete(false)}
        />
      </Modal>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    title: { fontFamily: fonts.display, color: colors.text, fontSize: type.label },
    back: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
    delete: { fontFamily: fonts.body, color: colors.danger, fontSize: 15, fontWeight: '700' },
    headerSpacer: { width: 40 },
    tile: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
      backgroundColor: colors.surfaceAlt,
    },
    tileImage: { width: '100%', height: '100%' },
    countBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    ocrBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      minWidth: 22,
      height: 18,
      borderRadius: radius.sm,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    detailBody: { flex: 1, padding: spacing.lg },
  });
