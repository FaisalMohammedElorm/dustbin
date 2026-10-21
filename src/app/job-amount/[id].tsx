import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { PAYMENT_METHODS } from '@/constants/labels';
import { formatEstimate, formatGhs } from '@/domain/pricing';
import { useCreatePayout } from '@/features/collector/hooks';
import { useJob, useRecordPayment, useSetFinalAmount } from '@/features/jobs/hooks';
import { errorMessage } from '@/lib/format';
import { amountSchema, parseAmount, type AmountValues } from '@/validation/schemas';

type Mode = 'final' | 'payment' | 'payout';
const TITLES: Record<Mode, string> = { final: 'Confirm final amount', payment: 'Record payment', payout: 'Record collector payout' };

/** Dispatch money entry: confirmed job amount, manual payment record, or collector payout. */
export default function JobAmount() {
  const { id, mode: rawMode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const mode: Mode = rawMode === 'payment' || rawMode === 'payout' ? rawMode : 'final';
  const navigation = useNavigation();
  const job = useJob(id);
  const setFinal = useSetFinalAmount();
  const record = useRecordPayment();
  const payout = useCreatePayout();
  const [method, setMethod] = useState<'cash' | 'mobile_money'>('cash');
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<AmountValues>({ resolver: zodResolver(amountSchema), defaultValues: { amount: '' } });

  useLayoutEffect(() => {
    navigation.setOptions({ title: TITLES[mode] });
  }, [navigation, mode]);

  const onSubmit = handleSubmit(async ({ amount }) => {
    const value = parseAmount(amount)!;
    setError(null);
    try {
      if (mode === 'final') await setFinal.mutateAsync({ jobId: id, amount: value });
      if (mode === 'payment') await record.mutateAsync({ jobId: id, amount: value, method, notes: 'Recorded by dispatch' });
      if (mode === 'payout') {
        if (!job.data?.collector_id) throw new Error('This job has no collector.');
        await payout.mutateAsync({ collectorId: job.data.collector_id, jobId: id, amount: value });
      }
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const j = job.data;
  return (
    <Screen edges={['bottom']} footer={<Button title="Save" onPress={onSubmit} loading={formState.isSubmitting} />}>
      {j ? (
        <Notice icon="information-outline">
          {`${j.reference} · estimate ${formatEstimate({ min: j.estimate_min_ghs, max: j.estimate_max_ghs, quoteRequired: j.quote_required }) ?? 'n/a'}${
            j.final_amount_ghs != null ? ` · confirmed ${formatGhs(j.final_amount_ghs)}` : ''
          }`}
        </Notice>
      ) : null}
      {mode === 'payment' ? (
        <ChipGroup
          value={method}
          onChange={setMethod}
          options={(['cash', 'mobile_money'] as const).map((m) => ({ value: m, label: PAYMENT_METHODS[m].short, icon: PAYMENT_METHODS[m].icon }))}
        />
      ) : null}
      <FormTextField control={control} name="amount" label="Amount (GHS)" keyboardType="decimal-pad" autoFocus />
      <AppText variant="caption">
        {mode === 'final'
          ? 'The confirmed amount is shown to the customer on their pickup and receipt.'
          : mode === 'payment'
            ? 'Record money received outside a payment gateway. Gateway payments are confirmed automatically by the provider.'
            : 'Payout policy (rates, timing) is a business decision — record only amounts approved for this collector.'}
      </AppText>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Screen>
  );
}
