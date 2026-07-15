import React, { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../theme';

interface Props {
  /** Called with the source URIs for the whole session (one note). */
  onComplete: (sourceUris: string[]) => void;
  onClose: () => void;
}

// One capture session -> one photo note. Single-shot finalizes immediately; burst
// mode appends each shutter press; gallery import adds multi-selected images.
export default function CaptureCameraScreen({ onComplete, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [burst, setBurst] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const finalize = (uris: string[]) => {
    if (uris.length === 0) {
      onClose();
      return;
    }
    onComplete(uris);
  };

  const takeShot = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      if (burst) {
        setPending((p) => [...p, photo.uri]);
      } else {
        // Single-shot: finalize immediately with just this frame.
        finalize([...pending, photo.uri]);
      }
    } finally {
      setBusy(false);
    }
  };

  const importFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      // Graceful: leave the user on the camera; they can still shoot or cancel.
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setPending((p) => [...p, ...uris]);
  };

  // Permission not yet granted -> ask, with a gallery fallback if denied.
  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      // Paper background, not the camera's black — the ink text is invisible on black.
      <SafeAreaView style={styles.permRoot}>
        <View style={styles.permissionBox}>
          <Text style={styles.permTitle}>Camera access needed</Text>
          <Text style={styles.permBody}>
            DayFeed needs the camera to take photo notes. You can still import
            photos from your gallery instead.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant camera access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permBtnAlt} onPress={importFromGallery}>
            <Text style={styles.permBtnAltText}>Import from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => finalize(pending)} style={styles.permCancel}>
            <Text style={styles.permCancelText}>
              {pending.length ? `Save ${pending.length} photo(s)` : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onClose} hitSlop={16} style={styles.iconBtn}>
            <Text style={styles.iconText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBurst((b) => !b)}
            style={[styles.burstToggle, burst && styles.burstToggleOn]}
          >
            <Text style={[styles.burstText, burst && styles.burstTextOn]}>
              {burst ? '● Burst on' : '○ Burst'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottom}>
          {pending.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filmstrip}
              contentContainerStyle={styles.filmstripContent}
            >
              {pending.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}

          <View style={styles.controls}>
            <TouchableOpacity style={styles.sideBtn} onPress={importFromGallery}>
              <Text style={styles.sideGlyph}>🖼️</Text>
              <Text style={styles.sideLabel}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutter}
              onPress={takeShot}
              disabled={busy}
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => finalize(pending)}
              disabled={pending.length === 0}
            >
              <Text style={[styles.sideGlyph, pending.length === 0 && styles.dim]}>✓</Text>
              <Text style={[styles.sideLabel, pending.length === 0 && styles.dim]}>
                Done{pending.length ? ` (${pending.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permRoot: { flex: 1, backgroundColor: colors.bg },
  camera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  burstToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  burstToggleOn: { backgroundColor: colors.voiceAccent },
  burstText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  burstTextOn: { color: '#FFFFFF' },
  bottom: { paddingBottom: spacing.md },
  filmstrip: { maxHeight: 68, marginBottom: spacing.sm },
  filmstripContent: { paddingHorizontal: spacing.lg, gap: 6 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  sideBtn: { width: 72, alignItems: 'center' },
  sideGlyph: { fontSize: 26, color: '#fff' },
  sideLabel: { color: '#fff', fontSize: 12, marginTop: 2 },
  dim: { opacity: 0.35 },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  permissionBox: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  permTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  permBody: { color: colors.textDim, fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  permBtn: {
    backgroundColor: colors.bubbleOwn,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  permBtnAlt: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  permBtnAltText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  permCancel: { alignItems: 'center', paddingVertical: spacing.lg },
  permCancelText: { color: colors.textDim, fontSize: 14 },
});
