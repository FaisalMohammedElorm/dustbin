import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { DropoffCard } from '@/components/dropoff-card';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { useConfirmDropoff, useDropoff } from '@/features/account/hooks';
import { confirm } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';

export default function ConfirmDropoff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dropoff = useDropoff(id);
  const confirmMutation = useConfirmDropoff();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const weightKg = Number(weight.replace(',', '.'));
  const weightValid = weight.length > 0 && Number.isFinite(weightKg) && weightKg >= 0;

  async function submit(accept: boolean) {
    if (!accept && !(await confirm('Reject drop-off?', 'The collector will see this drop-off as rejected.', 'Reject', true))) {
      return;
    }
    setError(null);
    try {
      await confirmMutation.mutateAsync({ id, accept, weightKg: accept ? weightKg : null, notes: notes.trim() });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (dropoff.isPending) return <LoadingState />;
  if (dropoff.isError) return <ErrorState error={dropoff.error} onRetry={dropoff.refetch} />;
  if (!dropoff.data) return <EmptyState icon="file-question-outline" title="Drop-off not found" />;

  const d = dropoff.data;
  const isPending = d.status === 'pending';

  return (
    <Screen
      edges={['bottom']}
      footer={
        isPending ? (
          <>
            <Button
              title="Confirm received"
              icon="check-circle-outline"
              onPress={() => submit(true)}
              loading={confirmMutation.isPending}
              disabled={!weightValid}
            />
            <Button title="Reject" variant="danger" onPress={() => submit(false)} disabled={confirmMutation.isPending} />
          </>
        ) : null
      }>
      <DropoffCard dropoff={d} perspective="partner" />
      {error ? <Notice tone="danger" icon="alert-circle-outline">{error}</Notice> : null}
      {isPending ? (
        <>
          <TextField
            label="Weighed amount (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={`Collector estimated ${d.estimated_weight_kg} kg`}
            error={weight && !weightValid ? 'Enter a valid weight.' : null}
          />
          <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline maxLength={500} />
        </>
      ) : (
        <Notice tone="success">This drop-off has already been processed.</Notice>
      )}
    </Screen>
  );
}
