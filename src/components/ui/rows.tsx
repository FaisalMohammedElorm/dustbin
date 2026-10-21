import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Navigation row for settings/profile menus. */
export function MenuRow({
  icon,
  label,
  detail,
  onPress,
  trailing,
  destructive,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surfaceAlt }]}>
      <View style={[styles.iconWrap, { backgroundColor: destructive ? theme.dangerSoft : theme.primarySoft }]}>
        <Icon name={icon} size={20} color={destructive ? 'danger' : 'primary'} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {label}
        </AppText>
        {detail ? <AppText variant="caption">{detail}</AppText> : null}
      </View>
      {trailing ?? <Icon name="chevron-right" size={22} color="textMuted" />}
    </Pressable>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onChange,
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        {detail ? <AppText variant="caption">{detail}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const theme = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden>
      <AppText style={{ fontSize: size * 0.38, fontWeight: '700', color: theme.primary }}>{initials}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTouch + 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
  iconWrap: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
