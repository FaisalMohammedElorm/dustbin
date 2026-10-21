import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/option-card';
import { Avatar } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { COLLECTOR_STATUS, VEHICLES } from '@/constants/labels';
import { Motion, Spacing } from '@/constants/theme';
import { formatGhanaPhone, telUrl } from '@/domain/phone';
import { useCollectors, useSetCollectorStatus } from '@/features/collector/hooks';
import { confirm, notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';
import type { CollectorStatus, CollectorWithProfile } from '@/types/models';

type Filter = 'pending_verification' | 'approved' | 'suspended';

/** Dispatch verifies collectors before they can see or take jobs. */
export default function OpsCollectors() {
  const collectors = useCollectors();
  const [filter, setFilter] = useState<Filter>('pending_verification');
  const list = (collectors.data ?? []).filter((c) => c.collector?.status === filter);

  return (
    <Screen edges={[]} refreshing={collectors.isRefetching} onRefresh={collectors.refetch}>
      <ChipGroup
        value={filter}
        onChange={setFilter}
        options={(['pending_verification', 'approved', 'suspended'] as const).map((s) => ({
          value: s,
          label: `${COLLECTOR_STATUS[s].label} (${(collectors.data ?? []).filter((c) => c.collector?.status === s).length})`,
        }))}
      />
      {collectors.isPending ? (
        <SkeletonList count={2} />
      ) : collectors.isError ? (
        <ErrorState error={collectors.error} onRetry={collectors.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon="account-hard-hat-outline" title="No collectors here" message="Collectors appear here after they sign up." />
      ) : (
        list.map((c, i) => <CollectorRow key={c.id} collector={c} index={i} />)
      )}
    </Screen>
  );
}

function CollectorRow({ collector, index }: { collector: CollectorWithProfile; index: number }) {
  const setStatus = useSetCollectorStatus();
  const cp = collector.collector;
  if (!cp) return null;

  async function change(status: CollectorStatus, verb: string) {
    if (!(await confirm(`${verb} ${collector.full_name}?`, status === 'approved' ? 'They will be able to go online and accept jobs.' : 'They will be taken offline immediately.', verb, status === 'suspended'))) return;
    try {
      await setStatus.mutateAsync({ collectorId: collector.id, status });
    } catch (e) {
      notify('Could not update', errorMessage(e));
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * Motion.stagger).duration(Motion.base)}>
      <Card>
        <View style={styles.row}>
          <Avatar name={collector.full_name} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{collector.full_name}</AppText>
            <AppText variant="caption">
              {VEHICLES[cp.vehicle_type].label}
              {cp.vehicle_plate ? ` · ${cp.vehicle_plate}` : ''}
              {collector.organization_name ? ` · ${collector.organization_name}` : ''}
            </AppText>
            <AppText variant="caption">{formatGhanaPhone(collector.phone)}</AppText>
          </View>
          <Badge label={cp.status === 'approved' ? (cp.is_available ? 'Online' : 'Offline') : COLLECTOR_STATUS[cp.status].label} tone={cp.status === 'approved' ? (cp.is_available ? 'success' : 'neutral') : COLLECTOR_STATUS[cp.status].tone} />
        </View>
        <View style={styles.actions}>
          <Button title="Call" size="sm" variant="outline" icon="phone-outline" onPress={() => Linking.openURL(telUrl(collector.phone))} />
          {cp.status !== 'approved' ? <Button title="Verify" size="sm" icon="shield-check-outline" loading={setStatus.isPending} onPress={() => change('approved', 'Verify')} /> : null}
          {cp.status !== 'suspended' ? <Button title="Suspend" size="sm" variant="danger" onPress={() => change('suspended', 'Suspend')} /> : null}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', justifyContent: 'flex-end' },
});
