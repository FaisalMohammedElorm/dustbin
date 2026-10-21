import { router, useLocalSearchParams } from 'expo-router';

import { Notice, Section } from '@/components/ui/layout';
import { OptionCard } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { VEHICLES } from '@/constants/labels';
import { useCollectors } from '@/features/collector/hooks';
import { useAssignJob, useJob } from '@/features/jobs/hooks';
import { useLookup } from '@/features/jobs/use-lookup';
import { confirm, notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';

/** Dispatch assigns a job to a verified collector whose vehicle suits the service. */
export default function AssignCollector() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  const collectors = useCollectors();
  const assign = useAssignJob();
  const lookup = useLookup();

  if (job.isPending || collectors.isPending) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (job.isError) return <ErrorState error={job.error} onRetry={job.refetch} />;
  if (collectors.isError) return <ErrorState error={collectors.error} onRetry={collectors.refetch} />;
  if (!job.data) return <EmptyState icon="file-question-outline" title="Job not found" />;

  const j = job.data;
  const service = lookup.service(j.service_category);
  const allowed = service.config?.allowed_vehicles ?? [];
  const eligible = collectors.data
    .filter((c) => c.collector?.status === 'approved' && allowed.includes(c.collector.vehicle_type))
    // Online collectors first.
    .sort((a, b) => Number(b.collector?.is_available) - Number(a.collector?.is_available));

  async function onPick(collectorId: string, name: string) {
    if (!(await confirm('Assign job?', `Assign ${j.reference} to ${name}? They will be asked to accept it.`, 'Assign'))) return;
    try {
      await assign.mutateAsync({ jobId: id, collectorId });
      router.back();
    } catch (e) {
      notify('Could not assign', errorMessage(e));
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Notice icon="map-marker-outline">{`${j.reference} · ${service.name} · ${j.address}, ${lookup.locality(j.locality_code)}`}</Notice>
      <Section title={`Eligible collectors (${allowed.map((v) => VEHICLES[v].label).join(' / ') || 'none configured'})`}>
        {eligible.length === 0 ? (
          <EmptyState icon="account-off-outline" title="No eligible collectors" message="No verified collector has a suitable vehicle for this service yet." />
        ) : (
          eligible.map((c) => (
            <OptionCard
              key={c.id}
              compact
              icon={VEHICLES[c.collector!.vehicle_type].icon}
              title={c.full_name}
              description={`${c.collector!.is_available ? 'Online' : 'Offline'} · ${VEHICLES[c.collector!.vehicle_type].label}${c.collector!.service_area ? ` · ${c.collector!.service_area}` : ''}`}
              selected={j.collector_id === c.id}
              onPress={() => onPick(c.id, c.full_name)}
            />
          ))
        )}
      </Section>
    </Screen>
  );
}
