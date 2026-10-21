import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice, Section } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { VEHICLES } from '@/constants/labels';
import { useProfile } from '@/features/auth/auth-provider';
import { useCollectorProfile, useUpdateCollectorDetails } from '@/features/collector/hooks';
import { errorMessage } from '@/lib/format';
import type { CollectorProfile } from '@/types/models';
import { collectorDetailsSchema, vehicleTypes, type CollectorDetailsValues } from '@/validation/schemas';

export default function CollectorDetails() {
  const profile = useProfile();
  const collector = useCollectorProfile(profile.id);

  if (collector.isPending) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonList count={1} />
      </Screen>
    );
  }
  if (collector.isError || !collector.data) return <ErrorState error={collector.error ?? 'Collector profile not found'} onRetry={collector.refetch} />;
  return <DetailsForm current={collector.data} />;
}

function DetailsForm({ current }: { current: CollectorProfile }) {
  const update = useUpdateCollectorDetails();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<CollectorDetailsValues>({
    resolver: zodResolver(collectorDetailsSchema),
    defaultValues: { vehicleType: current.vehicle_type, vehiclePlate: current.vehicle_plate ?? '', serviceArea: current.service_area ?? '' },
  });
  const vehicleType = useWatch({ control, name: 'vehicleType' });
  const vehicleChanged = vehicleType !== current.vehicle_type && current.status === 'approved';

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await update.mutateAsync({ vehicleType: v.vehicleType, plate: v.vehiclePlate, area: v.serviceArea });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen edges={['bottom']} footer={<Button title="Save" onPress={onSubmit} loading={update.isPending} disabled={!formState.isDirty} />}>
      <Section title="Vehicle">
        <Controller
          control={control}
          name="vehicleType"
          render={({ field }) => (
            <ChipGroup value={field.value} onChange={field.onChange} options={vehicleTypes.map((v) => ({ value: v, label: VEHICLES[v].label, icon: VEHICLES[v].icon }))} />
          )}
        />
      </Section>
      {vehicleChanged ? (
        <Notice tone="warning" icon="shield-alert-outline">
          Changing your vehicle type requires DustBin to verify you again. You’ll go offline until then.
        </Notice>
      ) : null}
      <FormTextField control={control} name="vehiclePlate" label="Registration number" autoCapitalize="characters" />
      <FormTextField control={control} name="serviceArea" label="Usual service area" placeholder="e.g. Kasoa New Market, Millennium City" />
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Screen>
  );
}
