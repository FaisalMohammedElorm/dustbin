import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormTextField } from '@/components/ui/form-fields';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Motion, Spacing } from '@/constants/theme';
import { useCreateAddress, useDeleteAddress, useSavedAddresses } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';
import { useCatalog } from '@/features/jobs/hooks';
import { useLookup } from '@/features/jobs/use-lookup';
import { confirm, notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';
import { savedAddressSchema, type SavedAddressValues } from '@/validation/schemas';

export default function Addresses() {
  const addresses = useSavedAddresses();
  const remove = useDeleteAddress();
  const lookup = useLookup();
  const [adding, setAdding] = useState(false);

  return (
    <Screen
      edges={['bottom']}
      refreshing={addresses.isRefetching}
      onRefresh={addresses.refetch}
      footer={<Button title="Add an address" icon="plus" onPress={() => setAdding(true)} />}>
      {addresses.isPending ? (
        <SkeletonList count={2} />
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={addresses.refetch} />
      ) : addresses.data.length === 0 ? (
        <EmptyState icon="map-marker-star-outline" title="No saved addresses" message="Save home or work to book pickups faster." />
      ) : (
        addresses.data.map((a, i) => (
          <Animated.View key={a.id} entering={FadeInDown.delay(i * Motion.stagger)} exiting={FadeOut} layout={LinearTransition}>
            <Card>
              <View style={styles.row}>
                <Icon name="map-marker-star-outline" size={22} color="primary" />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{a.label}</AppText>
                  <AppText variant="caption" color="text">
                    {a.address}
                  </AppText>
                  <AppText variant="caption">
                    {lookup.locality(a.locality_code)}
                    {a.landmark ? ` · near ${a.landmark}` : ''}
                  </AppText>
                </View>
                <Button
                  title="Remove"
                  variant="ghost"
                  size="sm"
                  onPress={async () => {
                    if (await confirm('Remove address?', a.label, 'Remove', true)) {
                      remove.mutate(a.id, { onError: (e) => notify('Could not remove', errorMessage(e)) });
                    }
                  }}
                />
              </View>
            </Card>
          </Animated.View>
        ))
      )}
      <AddAddressSheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function AddAddressSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const profile = useProfile();
  const catalog = useCatalog();
  const create = useCreateAddress();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm<SavedAddressValues>({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: { label: '', localityCode: catalog.data?.localities.length === 1 ? catalog.data.localities[0].code : '', address: '', landmark: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await create.mutateAsync({
        userId: profile.id,
        address: { label: v.label, locality_code: v.localityCode, address: v.address, landmark: v.landmark || null, latitude: null, longitude: null },
      });
      reset();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Save an address">
      <FormTextField control={control} name="label" label="Name" placeholder="Home, Shop, Office…" />
      <Controller
        control={control}
        name="localityCode"
        render={({ field, fieldState }) => (
          <View style={styles.gap}>
            <AppText variant="label">Area</AppText>
            <ChipGroup value={field.value || null} onChange={field.onChange} options={(catalog.data?.localities ?? []).map((l) => ({ value: l.code, label: l.name }))} />
            {fieldState.error ? (
              <AppText variant="caption" color="danger">
                {fieldState.error.message}
              </AppText>
            ) : null}
          </View>
        )}
      />
      <FormTextField control={control} name="address" label="Address" />
      <FormTextField control={control} name="landmark" label="Nearest landmark (optional)" />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button title="Save address" onPress={onSubmit} loading={create.isPending} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  gap: { gap: Spacing.two },
});
