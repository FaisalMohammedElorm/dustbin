import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { AppText } from '@/components/ui/text';
import { SERVICE_ICONS } from '@/constants/labels';
import { Brand, Elevation, Radius, Spacing } from '@/constants/theme';
import { estimateFromService, formatEstimate } from '@/domain/pricing';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import type { ServiceCategory } from '@/types/models';

/** Accent per tier, echoing the storyboard's coloured price bands. */
const TIER_ACCENT: Record<string, string> = {
  basic: Brand.green,
  premium: '#A35F00',
  advanced: '#1F5FA8',
  industrial: '#5B3FA0',
};

/** Storyboard-style service tier card ("DustBin Basic / Premium / Advanced / Industrial"). */
export function ServiceCard({
  service,
  selected,
  available = true,
  compact,
  onPress,
}: {
  service: ServiceCategory;
  selected?: boolean;
  available?: boolean;
  compact?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const dark = useIsDark();
  const accent = TIER_ACCENT[service.code] ?? theme.primary;
  const price = formatEstimate(estimateFromService(service));

  const content = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: accent }]}>
        <Icon name={SERVICE_ICONS[service.code] ?? 'truck-outline'} size={compact ? 24 : 28} color="onPrimary" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{service.name}</AppText>
        <AppText variant="caption">{service.vehicle_label}</AppText>
        {!compact && service.best_for.length ? (
          <AppText variant="caption" numberOfLines={2} style={styles.bestFor}>
            Best for {service.best_for.slice(0, 3).join(', ').toLowerCase()}
          </AppText>
        ) : null}
        {!available ? (
          <AppText variant="caption" color="warning">
            Not yet available in your area
          </AppText>
        ) : null}
      </View>
      {price ? (
        <View style={[styles.price, { backgroundColor: accent }]}>
          <AppText variant="caption" style={styles.priceText}>
            {price}
          </AppText>
        </View>
      ) : null}
    </>
  );

  const style = [
    styles.card,
    {
      backgroundColor: selected ? theme.primarySoft : theme.surface,
      borderColor: selected ? theme.primary : theme.border,
      opacity: available ? 1 : 0.6,
    },
    !dark && Elevation.sm,
  ];

  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      disabled={!available}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: !available }}
      accessibilityLabel={`${service.name}, ${service.vehicle_label}, ${price ?? ''}${available ? '' : ', not available in your area'}`}
      style={style}>
      {content}
    </PressableScale>
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
  iconWrap: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 1 },
  bestFor: { marginTop: 2 },
  price: { paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.one + 2, borderRadius: Radius.sm, maxWidth: 110 },
  priceText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
});
