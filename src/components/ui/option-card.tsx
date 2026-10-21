import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Selectable tile used for single-choice questions (role, waste type, load size…). */
export function OptionCard({
  title,
  description,
  icon,
  trailing,
  selected,
  onPress,
  compact,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  trailing?: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, description, trailing].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: selected ? theme.primary : theme.surfaceAlt }]}>
          <Icon name={icon} size={compact ? 20 : 24} color={selected ? 'onPrimary' : 'textSecondary'} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant={compact ? 'label' : 'bodyStrong'}>{title}</AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
      {trailing ? (
        <AppText variant="bodyStrong" color={selected ? 'primary' : 'text'}>
          {trailing}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Wrapping grid of compact chips. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.surface,
                borderColor: selected ? theme.primary : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            {o.icon ? <Icon name={o.icon} size={18} color={selected ? 'onPrimary' : 'textSecondary'} /> : null}
            <AppText variant="label" color={selected ? 'onPrimary' : 'text'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  compact: { padding: Spacing.two + 4, gap: Spacing.two + 4 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
});
