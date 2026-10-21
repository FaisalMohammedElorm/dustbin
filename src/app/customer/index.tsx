import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActivePickupCard } from '@/components/active-pickup-card';
import { HomeHeader } from '@/components/home-header';
import { ServiceCard } from '@/components/service-card';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Notice, Section } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { ACTIVE_STATUSES } from '@/domain/job-status';
import { useUnreadCount } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';
import { useCatalog, useJobList } from '@/features/jobs/hooks';
import { useTheme } from '@/hooks/use-theme';
import { firstName, greeting } from '@/lib/format';

export default function CustomerHome() {
  const profile = useProfile();
  const catalog = useCatalog();
  const active = useJobList({ kind: 'customer', userId: profile.id, statuses: ACTIVE_STATUSES });
  const unread = useUnreadCount();
  const activeJobs = active.data ?? [];

  const refresh = () => {
    active.refetch();
    catalog.refetch();
    unread.refetch();
  };

  return (
    <Screen edges={['top']} refreshing={active.isRefetching} onRefresh={refresh}>
      <HomeHeader
        greeting={`${greeting()}, ${firstName(profile.full_name)}`}
        subtitle="Book a pickup and a verified collector will come to you."
        unread={unread.data}
        notificationsHref="/customer/notifications">
        <Button title="Request Pickup" icon="plus-circle-outline" onPress={() => router.push('/request-pickup')} />
      </HomeHeader>

      {active.isPending ? (
        <SkeletonCard />
      ) : active.isError ? (
        <ErrorState error={active.error} onRetry={active.refetch} />
      ) : activeJobs.length > 0 ? (
        <View style={styles.stack}>
          {activeJobs.slice(0, 2).map((job) => (
            <ActivePickupCard key={job.id} job={job} />
          ))}
          {activeJobs.length > 2 ? (
            <Button title={`View all ${activeJobs.length} active pickups`} variant="ghost" onPress={() => router.navigate('/customer/tracking')} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.quick}>
        <QuickAction icon="history" label="History" onPress={() => router.navigate('/customer/pickups')} index={0} />
        <QuickAction icon="map-marker-path" label="Tracking" onPress={() => router.navigate('/customer/tracking')} index={1} />
        <QuickAction icon="map-marker-star-outline" label="Addresses" onPress={() => router.push('/addresses')} index={2} />
        <QuickAction icon="lifebuoy" label="Support" onPress={() => router.push('/help')} index={3} />
      </View>

      <Section title="Our services">
        {catalog.isPending ? (
          <>
            <Skeleton height={84} radius={Radius.lg} />
            <Skeleton height={84} radius={Radius.lg} />
          </>
        ) : catalog.isError ? (
          <ErrorState error={catalog.error} onRetry={catalog.refetch} />
        ) : catalog.data.serviceCategories.length === 0 ? (
          <Notice tone="warning">Services are being set up. Please check back soon.</Notice>
        ) : (
          catalog.data.serviceCategories.map((s, i) => (
            <Animated.View key={s.code} entering={FadeInDown.delay(i * Motion.stagger).duration(Motion.base)}>
              <ServiceCard
                service={s}
                onPress={() => router.push({ pathname: '/request-pickup', params: { service: s.code } })}
              />
            </Animated.View>
          ))
        )}
        <AppText variant="caption">Prices are estimates. Your final amount is confirmed after collection.</AppText>
      </Section>

      {catalog.data && catalog.data.localities.length > 0 ? (
        <Notice icon="map-marker-radius-outline" tone="success">
          {`Now serving ${catalog.data.localities.map((l) => l.name).join(', ')}. More areas coming soon.`}
        </Notice>
      ) : null}
    </Screen>
  );
}

function QuickAction({ icon, label, onPress, index }: { icon: IconName; label: string; onPress: () => void; index: number }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(100 + index * Motion.stagger).duration(Motion.base)} style={styles.quickItem}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.quickButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.quickIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name={icon} size={22} color="primary" />
        </View>
        <AppText variant="caption" color="text" style={styles.quickLabel}>
          {label}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  quick: { flexDirection: 'row', gap: Spacing.two + 2 },
  quickItem: { flex: 1 },
  quickButton: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontWeight: '600' },
});
