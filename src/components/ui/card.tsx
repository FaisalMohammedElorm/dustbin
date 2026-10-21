import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  elevated = true,
  tone = 'surface',
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  elevated?: boolean;
  tone?: 'surface' | 'tinted';
}) {
  const theme = useTheme();
  const dark = useIsDark();
  const base = [
    styles.card,
    {
      backgroundColor: tone === 'tinted' ? theme.primarySoft : theme.surface,
      borderColor: tone === 'tinted' ? 'transparent' : theme.border,
    },
    // Shadows read poorly on dark surfaces; rely on borders there.
    elevated && !dark && Elevation.sm,
  ];

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      scaleTo={0.985}
      style={[base, style]}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
