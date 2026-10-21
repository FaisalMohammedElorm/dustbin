import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { AppText } from '@/components/ui/text';
import { PAYMENT_METHODS } from '@/constants/labels';
import { formatEstimate } from '@/domain/pricing';
import { useRecordPayment } from '@/features/jobs/hooks';
import { errorMessage } from '@/lib/format';
import type { Job } from '@/types/models';
import { amountSchema, parseAmount, type AmountValues } from '@/validation/schemas';

/** Collector records money received directly from the customer (cash or MoMo to their wallet). */
export function RecordPaymentSheet({ job, visible, onClose, onRecorded }: { job: Job; visible: boolean; onClose: () => void; onRecorded?: () => void }) {
  const record = useRecordPayment();
  const [method, setMethod] = useState<'cash' | 'mobile_money'>(job.payment_method === 'mobile_money' ? 'mobile_money' : 'cash');
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm<AmountValues>({ resolver: zodResolver(amountSchema), defaultValues: { amount: '' } });
  const estimate = formatEstimate({ min: job.estimate_min_ghs, max: job.estimate_max_ghs, quoteRequired: job.quote_required });

  const onSubmit = handleSubmit(async ({ amount }) => {
    setError(null);
    try {
      await record.mutateAsync({ jobId: job.id, amount: parseAmount(amount)!, method, notes: '' });
      reset();
      onClose();
      onRecorded?.();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Record payment received">
      <AppText variant="body" color="textSecondary">
        Record only money you have actually received. {estimate ? `Booking estimate: ${estimate}.` : ''}
      </AppText>
      <ChipGroup
        value={method}
        onChange={setMethod}
        options={(['cash', 'mobile_money'] as const).map((m) => ({ value: m, label: PAYMENT_METHODS[m].short, icon: PAYMENT_METHODS[m].icon }))}
      />
      <FormTextField control={control} name="amount" label="Amount received (GHS)" keyboardType="decimal-pad" placeholder="e.g. 35" />
      <AppText variant="caption">Never ask a customer for their Mobile Money PIN.</AppText>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button title="Save payment" icon="cash-check" onPress={onSubmit} loading={record.isPending} />
    </BottomSheet>
  );
}
