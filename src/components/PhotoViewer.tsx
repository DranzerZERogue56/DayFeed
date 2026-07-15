import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  uris: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

// Full-screen, swipeable image viewer. One page per image via PagerView.
export default function PhotoViewer({ uris, initialIndex, visible, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  // Unmount entirely while closed. PagerView only honors initialPage on mount,
  // so a viewer kept mounted (NoteBubble) would reopen on the previous image.
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <PagerView
          style={styles.pager}
          initialPage={initialIndex}
          onPageSelected={(e) => setIndex(e.nativeEvent.position)}
        >
          {uris.map((uri) => (
            <View key={uri} style={styles.page} collapsable={false}>
              <Image
                source={{ uri }}
                style={{ width, height: height * 0.8 }}
                resizeMode="contain"
              />
            </View>
          ))}
        </PagerView>

        <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
          <View style={styles.topRow}>
            <Text style={styles.counter}>
              {index + 1} / {uris.length}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={16}
              accessibilityLabel="Close viewer"
            >
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  pager: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  counter: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  close: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
});
