import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { DROPOFF_STATUS, MATERIALS } from '@/constants/labels';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/format';
import type { Dropoff } from '@/types/models';

export function DropoffCard({
  dropoff,
  index = 0,
  perspective,
  onPress,
}: {
  dropoff: Dropoff;
  index?: number;
  perspective: 'collector' | 'partner' | 'ops';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const material = MATERIALS[dropoff.material];
  const partnerName = dropoff.partner?.organization_name ?? dropoff.partner?.full_name ?? 'Partner';
  const counterpart =
    perspective === 'collector'
      ? `To ${partnerName}`
      : perspective === 'partner'
        ? `From ${dropoff.collector?.full_name ?? 'collector'}`
        : `${dropoff.collector?.full_name ?? 'Collector'} → ${partnerName}`;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * Motion.stagger).duration(Motion.base)}>
      <Card onPress={onPress} accessibilityLabel={`${material.label} drop-off, ${counterpart}`}>
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={material.icon} size={22} color="primary" />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{material.label}</AppText>
            <AppText variant="caption">
              {counterpart} · {formatRelative(dropoff.created_at)}
            </AppText>
          </View>
          <View style={styles.weights}>
            <AppText variant="bodyStrong">{dropoff.confirmed_weight_kg ?? dropoff.estimated_weight_kg} kg</AppText>
            <AppText variant="caption">{dropoff.confirmed_weight_kg != null ? 'confirmed' : 'estimated'}</AppText>
          </View>
        </View>
        {dropoff.notes ? <AppText variant="caption">“{dropoff.notes}”</AppText> : null}
        {dropoff.partner_notes ? <AppText variant="caption">Partner: “{dropoff.partner_notes}”</AppText> : null}
        <Badge label={DROPOFF_STATUS[dropoff.status].label} tone={DROPOFF_STATUS[dropoff.status].tone} />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  weights: { alignItems: 'flex-end' },
});
