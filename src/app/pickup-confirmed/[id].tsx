import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider, InfoRow, Notice } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { MaxContentWidth, Motion, Spacing } from '@/constants/theme';
import { formatEstimate } from '@/domain/pricing';
import { useJob } from '@/features/jobs/hooks';
import { useLookup } from '@/features/jobs/use-lookup';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';

/** Shown only after the server has confirmed the request (we navigate here with its id). */
export default function PickupConfirmed() {
  const { id, failedPhotos } = useLocalSearchParams<{ id: string; failedPhotos?: string }>();
  const theme = useTheme();
  const job = useJob(id);
  const lookup = useLookup();
  const failed = Number(failedPhotos ?? 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <View style={styles.hero}>
          <SuccessCheck />
          <Animated.View entering={FadeInDown.delay(250).duration(Motion.slow)} style={styles.heroText}>
            <AppText variant="display" align="center">
              Pickup requested
            </AppText>
            <AppText variant="body" color="textSecondary" align="center">
              We&apos;ve received your request and will notify you when a collector is assigned.
            </AppText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(400).duration(Motion.slow)}>
          {job.isError ? (
            <ErrorState error={job.error} onRetry={job.refetch} />
          ) : (
            <Card>
              <View style={styles.refRow}>
                <View>
                  <AppText variant="caption">Reference number</AppText>
                  {job.data ? (
                    <AppText variant="title" selectable accessibilityLabel={`Reference ${job.data.reference.split('').join(' ')}`}>
                      {job.data.reference}
                    </AppText>
                  ) : (
                    <Skeleton width={120} height={26} />
                  )}
                </View>
                {job.data ? <JobStatusBadge status={job.data.status} /> : null}
              </View>
              {job.data ? (
                <>
                  <Divider />
                  <InfoRow icon={lookup.service(job.data.service_category).icon} label="Service" value={lookup.service(job.data.service_category).name} />
                  <InfoRow icon="calendar-clock" label="When" value={job.data.scheduled_for ? formatDateTime(job.data.scheduled_for) : 'As soon as possible'} />
                  <InfoRow
                    icon="cash"
                    label={job.data.quote_required ? 'Pricing' : 'Estimate'}
                    value={formatEstimate({ min: job.data.estimate_min_ghs, max: job.data.estimate_max_ghs, quoteRequired: job.data.quote_required }) ?? 'To be confirmed'}
                  />
                </>
              ) : null}
            </Card>
          )}
        </Animated.View>

        {failed > 0 ? (
          <Notice tone="warning" icon="image-off-outline">
            {`${failed} photo${failed > 1 ? 's' : ''} could not be uploaded. Your pickup is still booked; you can describe the waste to your collector.`}
          </Notice>
        ) : null}

        <View style={styles.actions}>
          <Button title="Track my pickup" icon="map-marker-path" onPress={() => router.replace({ pathname: '/job/[id]', params: { id } })} />
          <Button title="Back to home" variant="ghost" onPress={() => router.dismissTo('/customer')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center', width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: Spacing.two },
  heroText: { gap: Spacing.two, alignItems: 'center' },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { gap: Spacing.two },
});
