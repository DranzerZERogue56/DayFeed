import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import VoicePlayerRow from '../components/VoicePlayerRow';
import { TranscribeControl } from '../components/TranscribeButton';
import FlopBreadcrumb from '../components/FlopBreadcrumb';
import FlopComposer from '../components/FlopComposer';
import FlopChildActions from '../components/FlopChildActions';
import { useFlop } from '../hooks/FlopContext';
import { useFlopPage } from '../hooks/useFlopQueries';
import { countFlopDescendants } from '../db';
import {
  CHILD_RELATIONS,
  flopBody,
  flopTitle,
  type FlopChildRelation,
  type FlopNote,
} from '../db/flopTypes';
import type { FlopStackParamList } from '../navigation/types';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme'; // relationStyle now via useTheme()
import { useStyles, useTheme } from '../hooks/ThemeContext';

// The Flop drill-in page: the note *is* the page. Breadcrumb, the note itself in
// the most book-like typography in the app, then its children grouped by relation.
// Depth is unlimited but only ever one level renders per screen.
export default function FlopNoteScreen() {
  const styles = useStyles(makeStyles);
  const { colors, relationStyle } = useTheme();
  const { params } = useRoute<RouteProp<FlopStackParamList, 'FlopNote'>>();
  const navigation = useNavigation<NativeStackNavigationProp<FlopStackParamList>>();
  const { note, ancestors, children, loading } = useFlopPage(params.id);
  const { editFlopNote, saveFlopTranscript, changeRelation, moveNote, removeFlopNote } = useFlop();

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // non-null = editing
  // The child whose long-press sheet is open, with its position in its own group.
  const [acting, setActing] = useState<{ child: FlopNote; index: number; size: number } | null>(
    null,
  );

  if (!note) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.missing}>
          <Text style={styles.missingText}>{loading ? '' : 'This note is gone.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const body = flopBody(note);

  /** Jumping to an ancestor rewinds the stack rather than growing it deeper. */
  const jumpTo = (id: string) => {
    navigation.popTo('FlopNote', { id });
  };

  const saveEdit = async () => {
    if (draft === null) return;
    await editFlopNote(note.id, draft);
    setDraft(null);
  };

  const confirmDelete = async (target: FlopNote) => {
    const n = await countFlopDescendants(target.id);
    const detail =
      n > 0
        ? `This will also delete ${n} nested note${n === 1 ? '' : 's'} beneath it.`
        : 'This note will be permanently removed.';
    Alert.alert(`Delete “${flopTitle(target)}”?`, detail, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeFlopNote(target.id);
          // Deleting the page you're on has nowhere to stay — walk up a level.
          if (target.id === note.id) navigation.goBack();
        },
      },
    ]);
  };

  const editing = draft !== null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        {editing ? (
          <View style={styles.topActions}>
            <TouchableOpacity onPress={() => setDraft(null)}>
              <Text style={styles.action}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveEdit}>
              <Text style={[styles.action, styles.actionStrong]}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topActions}>
            {note.type === 'text' && (
              <TouchableOpacity onPress={() => setDraft(note.content ?? '')}>
                <Text style={styles.action}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => void confirmDelete(note)}>
              <Text style={[styles.action, styles.actionDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Keyboard padding so the in-place editor stays visible while typing
          (Android edge-to-edge never resizes the window for the keyboard). */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FlopBreadcrumb ancestors={ancestors} onJump={jumpTo} />

        {editing ? (
          <TextInput
            style={styles.editor}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        ) : (
          <>
            <Text style={styles.headline}>{flopTitle(note)}</Text>
            {note.type === 'voice' ? (
              <View style={styles.voiceWrap}>
                <VoicePlayerRow note={note} variant="list" />
                <TranscribeControl
                  audioUri={note.audio_uri}
                  transcript={note.transcript}
                  onTranscribed={(text) => saveFlopTranscript(note.id, text)}
                />
              </View>
            ) : (
              !!body && <Text style={styles.body}>{body}</Text>
            )}
          </>
        )}

        {!editing && (
          <>
            {CHILD_RELATIONS.map((relation) => {
              const group = children.filter((c) => c.relation === relation);
              if (group.length === 0) return null; // only render groups with members
              const s = relationStyle[relation];
              return (
                <View key={relation} style={styles.group}>
                  <Text style={[styles.groupHead, { color: s.color }]}>{s.plural}</Text>
                  {group.map((child, i) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.childCard, { borderLeftColor: s.color }]}
                      activeOpacity={0.8}
                      onPress={() => navigation.push('FlopNote', { id: child.id })}
                      onLongPress={() => setActing({ child, index: i, size: group.length })}
                      delayLongPress={350}
                    >
                      <View style={styles.childTitleRow}>
                        <Text style={[styles.childIcon, { color: s.color }]}>{s.icon}</Text>
                        <Text style={styles.childTitle} numberOfLines={2}>
                          {flopTitle(child)}
                        </Text>
                      </View>
                      {!!flopBody(child) && (
                        <Text style={styles.childPreview} numberOfLines={2}>
                          {flopBody(child)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.addChild}
              onPress={() => setComposing(true)}
              accessibilityLabel="Add a child note"
            >
              <Text style={styles.addChildText}>+ Add child</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <FlopComposer
        visible={composing}
        onClose={() => setComposing(false)}
        parentId={note.id}
      />

      <FlopChildActions
        child={acting?.child ?? null}
        index={acting?.index ?? 0}
        groupSize={acting?.size ?? 0}
        onClose={() => setActing(null)}
        onChangeRelation={(relation) => {
          const id = acting!.child.id;
          setActing(null);
          void changeRelation(id, relation);
        }}
        onMove={(direction) => {
          const id = acting!.child.id;
          setActing(null);
          void moveNote(id, direction);
        }}
        onDelete={() => {
          const child = acting!.child;
          setActing(null);
          void confirmDelete(child);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { fontFamily: fonts.body, color: colors.accent, fontSize: 15 },
  topActions: { flexDirection: 'row', gap: spacing.lg },
  action: { fontFamily: fonts.body, color: colors.accent, fontSize: 15 },
  actionStrong: { fontWeight: '700' },
  actionDanger: { color: colors.danger },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  headline: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 26,
    lineHeight: 34,
    marginBottom: spacing.md,
  },
  // The most book-like typography in the app, fitting Flop's long-form purpose.
  body: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: 16,
    lineHeight: 26, // 1.6
  },
  editor: {
    minHeight: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
  },
  voiceWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    padding: spacing.md,
  },
  group: { marginTop: spacing.xl },
  groupHead: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  childCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  childTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  childIcon: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  childTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  childPreview: {
    fontFamily: fonts.body,
    color: colors.textFaint,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginLeft: 22,
  },
  addChild: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentEdge,
  },
  addChildText: { fontFamily: fonts.body, color: colors.accent, fontSize: 14, fontWeight: '700' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { fontFamily: fonts.body, color: colors.textDim, fontSize: 15 },
});
