import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomOut } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/layout';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LocalPhoto } from '@/services/photos';

/** Opens the camera (or gallery), handling permission denial with a clear message. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<{ photo: LocalPhoto | null; error: string | null }> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return {
        photo: null,
        error: perm.canAskAgain
          ? 'Camera permission is needed to take a photo. You can choose one from your gallery instead.'
          : 'Camera access is turned off for DustBin Africa. Enable it in Settings, or use your gallery.',
      };
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    return { photo: r.canceled ? null : r.assets[0], error: null };
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && Platform.OS === 'ios' && !perm.canAskAgain) {
    return { photo: null, error: 'Photo access is turned off for DustBin Africa. Enable it in Settings.' };
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  return { photo: r.canceled ? null : r.assets[0], error: null };
}

/** Grid of selected photos with remove buttons and add actions. */
export function PhotoPicker({
  photos,
  onChange,
  max = 4,
}: {
  photos: LocalPhoto[];
  onChange: (photos: LocalPhoto[]) => void;
  max?: number;
}) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  async function add(source: 'camera' | 'library') {
    setError(null);
    const { photo, error: e } = await pickPhoto(source);
    if (e) setError(e);
    if (photo) onChange([...photos, photo].slice(0, max));
  }

  return (
    <View style={styles.wrap}>
      {photos.length ? (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <Animated.View key={p.uri} entering={FadeIn.duration(Motion.base)} exiting={ZoomOut.duration(Motion.fast)} style={styles.thumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" accessibilityLabel={`Selected photo ${i + 1}`} />
              <Pressable
                onPress={() => onChange(photos.filter((x) => x.uri !== p.uri))}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${i + 1}`}
                hitSlop={10}
                style={[styles.remove, { backgroundColor: theme.danger }]}>
                <Icon name="close" size={16} color="onPrimary" />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={[styles.placeholder, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Icon name="camera-plus-outline" size={32} color="textMuted" />
          <AppText variant="caption" align="center">
            Photos help us send the right vehicle and give a better estimate.
          </AppText>
        </View>
      )}

      {photos.length < max ? (
        <View style={styles.actions}>
          {Platform.OS !== 'web' ? <Button title="Take photo" size="md" icon="camera-outline" variant="outline" onPress={() => add('camera')} style={styles.flex} /> : null}
          <Button title="From gallery" size="md" icon="image-outline" variant="outline" onPress={() => add('library')} style={styles.flex} />
        </View>
      ) : (
        <AppText variant="caption">Maximum of {max} photos.</AppText>
      )}

      {error ? (
        <Notice tone="warning" icon="camera-off-outline">
          <AppText variant="caption" color="text">
            {error}
          </AppText>
          {/Settings/.test(error) ? (
            <AppText variant="label" color="primary" onPress={() => Linking.openSettings()} accessibilityRole="link">
              Open Settings
            </AppText>
          ) : null}
        </Notice>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 2 },
  thumbWrap: { width: 96, height: 96 },
  thumb: { width: 96, height: 96, borderRadius: Radius.md },
  remove: { position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  placeholder: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.lg, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two + 4 },
  flex: { flex: 1 },
});
