import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { AppText } from '@/components/ui/text';
import { Elevation, MinTouch, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'onDark';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const VARIANTS: Record<Variant, { bg: ThemeColor | null; fg: ThemeColor; border: ThemeColor | null; raised?: boolean }> = {
  primary: { bg: 'primary', fg: 'onPrimary', border: null, raised: true },
  secondary: { bg: 'secondary', fg: 'onSecondary', border: null, raised: true },
  outline: { bg: 'surface', fg: 'text', border: 'border' },
  ghost: { bg: null, fg: 'primary', border: null },
  danger: { bg: 'dangerSoft', fg: 'danger', border: null },
  /** Outline button for dark brand surfaces; pass borderColor via style. */
  onDark: { bg: null, fg: 'onPrimary', border: null },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  size = 'lg',
  style,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={size === 'sm' ? 6 : 0}
      style={[
        styles.base,
        styles[size],
        v.raised && !isDisabled && Elevation.sm,
        {
          backgroundColor: v.bg ? theme[v.bg] : 'transparent',
          borderColor: v.border ? theme[v.border] : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[v.fg]} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} color={v.fg} />}
          <AppText variant={size === 'sm' ? 'label' : 'bodyStrong'} color={v.fg} numberOfLines={1}>
            {title}
          </AppText>
          {iconRight && <Icon name={iconRight} size={20} color={v.fg} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  lg: { minHeight: 54 },
  md: { minHeight: MinTouch, paddingHorizontal: Spacing.three },
  sm: { minHeight: 38, paddingHorizontal: Spacing.three - 4, borderRadius: Radius.sm + 2 },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
