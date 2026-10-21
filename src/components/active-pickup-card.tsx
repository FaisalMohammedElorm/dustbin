import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { JobStatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { PROGRESS_STATUSES, progressIndex, STATUS_DESCRIPTION } from '@/domain/job-status';
import { useLookup } from '@/features/jobs/use-lookup';
import { useTheme } from '@/hooks/use-theme';
import type { JobWithPeople } from '@/types/models';

/** Prominent card for a customer's in-progress pickup with a compact progress bar. */
export function ActivePickupCard({ job }: { job: JobWithPeople }) {
  const theme = useTheme();
  const lookup = useLookup();
  const step = progressIndex(job.status);
  const halted = job.status === 'failed';

  return (
    <Animated.View entering={FadeInDown.duration(Motion.slow)}>
      <Card
        onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
        accessibilityLabel={`Active pickup ${job.reference}`}
        accessibilityHint="Opens live tracking"
        style={[styles.card, { borderColor: halted ? theme.danger : theme.primary }]}>
        <View style={styles.top}>
          <View style={styles.flex}>
            <AppText variant="overline" color="primary">
              Active pickup · {job.reference}
            </AppText>
            <AppText variant="heading">{lookup.waste(job.waste_category).name}</AppText>
          </View>
          <JobStatusBadge status={job.status} />
        </View>

        <View style={styles.bar} accessibilityElementsHidden>
          {PROGRESS_STATUSES.map((s, i) => (
            <View
              key={s}
              style={[
                styles.segment,
                { backgroundColor: halted ? theme.dangerSoft : i <= step ? theme.primary : theme.surfaceAlt },
              ]}
            />
          ))}
        </View>

        <AppText variant="caption" color="text">
          {STATUS_DESCRIPTION[job.status]}
        </AppText>

        <View style={styles.footer}>
          {job.collector ? (
            <View style={styles.row}>
              <Icon name="account-hard-hat-outline" size={18} color="textSecondary" />
              <AppText variant="caption">{job.collector.full_name}</AppText>
            </View>
          ) : (
            <View style={styles.row}>
              <Icon name="map-marker-outline" size={18} color="textSecondary" />
              <AppText variant="caption" numberOfLines={1}>
                {job.address}
              </AppText>
            </View>
          )}
          <View style={styles.row}>
            <AppText variant="label" color="primary">
              Track
            </AppText>
            <Icon name="arrow-right" size={18} color="primary" />
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, gap: Spacing.three - 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, gap: 2 },
  bar: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: Radius.pill },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, flexShrink: 1 },
});
