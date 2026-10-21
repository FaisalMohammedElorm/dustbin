import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const OFFSCREEN = 600;

/**
 * Modal bottom sheet: slides up, dims the background, and can be dismissed by
 * dragging the handle down, tapping the backdrop or the system back button.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(OFFSCREEN);
  const backdrop = useSharedValue(0);
  // Keep the Modal mounted while the closing animation plays.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  const duration = reduceMotion ? 0 : Motion.base;

  useEffect(() => {
    if (visible) {
      translateY.set(withTiming(0, { duration }));
      backdrop.set(withTiming(1, { duration }));
    } else if (mounted) {
      backdrop.set(withTiming(0, { duration }));
      translateY.set(
        withTiming(OFFSCREEN, { duration }, (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }),
      );
    }
  }, [visible, mounted, duration, translateY, backdrop]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        translateY.set(withTiming(0, { duration: Motion.fast }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.45 }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.end} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, Spacing.three) },
              sheetStyle,
            ]}>
            <GestureDetector gesture={pan}>
              <View style={styles.handleArea} accessibilityLabel="Drag down to close">
                <View style={[styles.handle, { backgroundColor: theme.border }]} />
                {title ? (
                  <AppText variant="heading" style={styles.title}>
                    {title}
                  </AppText>
                ) : null}
              </View>
            </GestureDetector>
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  end: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  handleArea: { alignItems: 'center', paddingTop: Spacing.two + 2, paddingBottom: Spacing.two, paddingHorizontal: Spacing.four },
  handle: { width: 40, height: 5, borderRadius: 3 },
  title: { marginTop: Spacing.three, alignSelf: 'flex-start' },
  body: { paddingHorizontal: Spacing.four, gap: Spacing.three },
});
