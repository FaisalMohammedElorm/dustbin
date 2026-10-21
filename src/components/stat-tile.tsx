import { StyleSheet } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { AppText } from '@/components/ui/text';
import { Brand, Radius, Spacing } from '@/constants/theme';

/** Compact metric for use inside the navy HomeHeader. */
export function StatTile({ label, value, onPress }: { label: string; value: number | string | undefined; onPress?: () => void }) {
  return (
    <PressableScale
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${label}: ${value ?? 'loading'}`}
      style={styles.tile}>
      <AppText variant="title" style={styles.value}>
        {value ?? '—'}
      </AppText>
      <AppText variant="caption" style={styles.label} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { flexBasis: '46%', flexGrow: 1, backgroundColor: Brand.navyLight, borderRadius: Radius.lg, padding: Spacing.three, gap: 2 },
  value: { color: Brand.white },
  label: { color: '#B5C3D3' },
});
