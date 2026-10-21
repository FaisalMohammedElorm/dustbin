import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DropoffCard } from '@/components/dropoff-card';
import { HomeHeader } from '@/components/home-header';
import { StatTile } from '@/components/stat-tile';
import { Section } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/features/auth/auth-provider';
import { useDropoffs } from '@/features/account/hooks';

export default function PartnerHome() {
  const profile = useProfile();
  const dropoffs = useDropoffs({ partnerId: profile.id });

  const pending = dropoffs.data?.filter((d) => d.status === 'pending') ?? [];
  const history = dropoffs.data?.filter((d) => d.status !== 'pending') ?? [];
  const receivedKg = history.reduce((sum, d) => sum + (d.status === 'received' ? Number(d.confirmed_weight_kg ?? 0) : 0), 0);

  return (
    <Screen edges={['top']} refreshing={dropoffs.isRefetching} onRefresh={dropoffs.refetch}>
      <HomeHeader
        greeting={profile.organization_name ?? profile.full_name}
        subtitle="Confirm recyclables delivered by DustBin collectors.">
        <View style={styles.stats}>
          <StatTile label="Awaiting confirmation" value={dropoffs.data ? pending.length : undefined} />
          <StatTile label="kg received (recent)" value={dropoffs.data ? Math.round(receivedKg) : undefined} />
        </View>
      </HomeHeader>

      {dropoffs.isPending ? (
        <LoadingState />
      ) : dropoffs.isError ? (
        <ErrorState error={dropoffs.error} onRetry={dropoffs.refetch} />
      ) : (
        <>
          <Section title="Awaiting confirmation">
            {pending.length === 0 ? (
              <EmptyState icon="inbox-outline" title="Nothing to confirm" message="New drop-offs from collectors appear here." />
            ) : (
              pending.map((d, i) => (
                <DropoffCard
                  key={d.id}
                  dropoff={d}
                  index={i}
                  perspective="partner"
                  onPress={() => router.push({ pathname: '/confirm-dropoff/[id]', params: { id: d.id } })}
                />
              ))
            )}
          </Section>
          {history.length > 0 ? (
            <Section title="History">
              {history.map((d, i) => (
                <DropoffCard key={d.id} dropoff={d} index={i} perspective="partner" />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two + 4 },
});
