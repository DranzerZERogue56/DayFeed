import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import VaultEntryCard from '../components/VaultEntryCard';
import VaultEntryComposer from '../components/VaultEntryComposer';
import NoteActionsSheet from '../components/NoteActionsSheet';
import { LockIcon } from '../components/Icons';
import { addEntry, deleteEntry, listEntries, updateEntry, type VaultEntry } from '../lib/vaultStore';
import { fonts, radius, spacing, type, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';

type Status = 'checking' | 'locked' | 'unavailable' | 'unlocked';

// Vault: password/username storage behind a biometric gate. Re-locks every
// time the tab loses focus (useFocusEffect's cleanup), and decrypted secrets
// never live in state outside the unlocked window — they're re-fetched fresh
// on each successful unlock and dropped from memory the moment focus is lost.
export default function VaultScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>('checking');
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [actionsFor, setActionsFor] = useState<VaultEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VaultEntry | null>(null);

  const unlock = useCallback(async () => {
    setStatus('checking');
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !isEnrolled) {
      setStatus('unavailable');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Vault',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      setEntries(await listEntries());
      setStatus('unlocked');
    } else {
      setStatus('locked');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      unlock();
      return () => {
        setStatus('checking');
        setEntries([]);
      };
    }, [unlock]),
  );

  const refresh = useCallback(async () => {
    setEntries(await listEntries());
  }, []);

  const openAdd = () => {
    setEditing(null);
    setComposerOpen(true);
  };

  const openEdit = (entry: VaultEntry) => {
    setActionsFor(null);
    setEditing(entry);
    setComposerOpen(true);
  };

  const save = async (label: string, username: string, password: string) => {
    if (editing) {
      await updateEntry(editing.id, { label, username, password });
    } else {
      await addEntry(label, username, password);
    }
    await refresh();
  };

  const confirmAndDelete = async () => {
    if (!confirmDelete) return;
    await deleteEntry(confirmDelete.id);
    setConfirmDelete(null);
    await refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        overline="Passwords & usernames"
        title="Vault"
        action={
          status === 'unlocked' ? (
            <TouchableOpacity style={styles.add} onPress={openAdd} accessibilityLabel="New vault entry">
              <Text style={styles.addGlyph}>+</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {status === 'checking' && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      {status === 'locked' && (
        <View style={styles.center}>
          <LockIcon color={colors.textFaint} size={40} />
          <Text style={styles.lockedTitle}>Vault locked</Text>
          <Text style={styles.lockedHint}>Authenticate to view your saved passwords.</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={unlock}>
            <Text style={styles.unlockBtnText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'unavailable' && (
        <View style={styles.center}>
          <LockIcon color={colors.textFaint} size={40} />
          <Text style={styles.lockedTitle}>No screen lock set up</Text>
          <Text style={styles.lockedHint}>
            Set up a fingerprint, face unlock, or device PIN in your phone's settings to use the
            Vault.
          </Text>
        </View>
      )}

      {status === 'unlocked' && (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={entries.length === 0 ? styles.emptyContent : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Nothing saved yet."
              hint="Add a username and password for something worth remembering securely."
            />
          }
          renderItem={({ item }) => <VaultEntryCard entry={item} onOpenActions={setActionsFor} />}
        />
      )}

      <VaultEntryComposer
        visible={composerOpen}
        editing={editing}
        onSave={save}
        onClose={() => setComposerOpen(false)}
      />

      <NoteActionsSheet
        visible={actionsFor !== null}
        subtitle={actionsFor?.label}
        actions={[
          { label: 'Edit', onPress: () => actionsFor && openEdit(actionsFor) },
          {
            label: 'Delete…',
            danger: true,
            onPress: () => {
              setConfirmDelete(actionsFor);
              setActionsFor(null);
            },
          },
        ]}
        onClose={() => setActionsFor(null)}
      />

      <NoteActionsSheet
        visible={confirmDelete !== null}
        subtitle="This entry will be permanently removed."
        actions={[{ label: 'Delete', danger: true, onPress: confirmAndDelete }]}
        onClose={() => setConfirmDelete(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    add: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addGlyph: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 20,
      fontWeight: '700',
      marginTop: -2,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    lockedTitle: {
      fontFamily: fonts.display,
      color: colors.text,
      fontSize: type.label,
      marginTop: spacing.md,
    },
    lockedHint: {
      fontFamily: fonts.body,
      color: colors.textFaint,
      fontSize: type.timestamp,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 20,
      maxWidth: 280,
    },
    unlockBtn: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      backgroundColor: colors.accentTint,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accentEdge,
    },
    unlockBtnText: {
      fontFamily: fonts.body,
      color: colors.accent,
      fontSize: 15,
      fontWeight: '700',
    },
    listContent: {
      paddingBottom: spacing.xl,
    },
    emptyContent: {
      flexGrow: 1,
    },
  });
