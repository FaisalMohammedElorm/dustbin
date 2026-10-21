import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice, Section } from '@/components/ui/layout';
import { ChipGroup, OptionCard } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { MATERIALS } from '@/constants/labels';
import { Spacing } from '@/constants/theme';
import { formatGhanaPhone } from '@/domain/phone';
import { useCreateDropoff } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';
import { usePartners } from '@/features/collector/hooks';
import { errorMessage } from '@/lib/format';
import type { MaterialType } from '@/types/models';
import { dropoffSchema, parseAmount, type DropoffValues } from '@/validation/schemas';

export default function LogDropoff() {
  const profile = useProfile();
  const partners = usePartners();
  const create = useCreateDropoff();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<DropoffValues>({
    resolver: zodResolver(dropoffSchema),
    defaultValues: { partnerId: '', material: 'plastic', weight: '', notes: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await create.mutateAsync({
        collectorId: profile.id,
        input: { partner_id: v.partnerId, material: v.material, estimated_weight_kg: parseAmount(v.weight)!, notes: v.notes || null },
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen edges={['bottom']} footer={<Button title="Submit drop-off" onPress={onSubmit} loading={create.isPending} />}>
      {error ? <Notice tone="danger" icon="alert-circle-outline">{error}</Notice> : null}

      <Section title="Recycling partner">
        {partners.isPending ? (
          <SkeletonList count={1} />
        ) : partners.isError ? (
          <ErrorState error={partners.error} onRetry={partners.refetch} />
        ) : partners.data.length === 0 ? (
          <EmptyState icon="factory" title="No partners registered" message="Recycling partners will appear here once they join." />
        ) : (
          <Controller
            control={control}
            name="partnerId"
            render={({ field, fieldState }) => (
              <View style={{ gap: Spacing.two }} accessibilityRole="radiogroup">
                {partners.data.map((p) => (
                  <OptionCard
                    key={p.id}
                    compact
                    icon="factory"
                    title={p.organization_name ?? p.full_name}
                    description={formatGhanaPhone(p.phone)}
                    selected={field.value === p.id}
                    onPress={() => field.onChange(p.id)}
                  />
                ))}
                {fieldState.error ? (
                  <AppText variant="caption" color="danger">
                    {fieldState.error.message}
                  </AppText>
                ) : null}
              </View>
            )}
          />
        )}
      </Section>

      <Section title="Material">
        <Controller
          control={control}
          name="material"
          render={({ field }) => (
            <ChipGroup
              value={field.value}
              onChange={field.onChange}
              options={(Object.keys(MATERIALS) as MaterialType[]).map((m) => ({ value: m, label: MATERIALS[m].label, icon: MATERIALS[m].icon }))}
            />
          )}
        />
      </Section>

      <FormTextField control={control} name="weight" label="Estimated weight (kg)" keyboardType="decimal-pad" placeholder="e.g. 45" hint="The partner confirms the final weight on receipt." />
      <FormTextField control={control} name="notes" label="Notes (optional)" multiline maxLength={500} />
    </Screen>
  );
}
