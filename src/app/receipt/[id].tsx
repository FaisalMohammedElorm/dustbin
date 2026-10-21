import { useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '@/constants/labels';
import { Spacing } from '@/constants/theme';
import { summarizePayments } from '@/domain/payments';
import { formatEstimate, formatGhs } from '@/domain/pricing';
import { useJob, useJobPayments } from '@/features/jobs/hooks';
import { useLookup } from '@/features/jobs/use-lookup';
import { formatDateTime } from '@/lib/format';

/** Collection receipt. Amounts shown are only those recorded on the server. */
export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  const payments = useJobPayments(id);
  const lookup = useLookup();

  if (job.isPending || payments.isPending) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonList count={2} />
      </Screen>
    );
  }
  if (job.isError) return <ErrorState error={job.error} onRetry={job.refetch} />;
  if (!job.data) return <EmptyState icon="receipt" title="Receipt not available" />;

  const j = job.data;
  const pay = summarizePayments(payments.data ?? []);
  const waste = lookup.waste(j.waste_category).name;
  const service = lookup.service(j.service_category).name;
  const amount = j.final_amount_ghs != null ? formatGhs(j.final_amount_ghs, { decimals: true }) : null;
  const estimate = formatEstimate({ min: j.estimate_min_ghs, max: j.estimate_max_ghs, quoteRequired: j.quote_required });

  const shareText = [
    `DustBin Africa receipt — ${j.reference}`,
    `${service} · ${waste}`,
    `Collected: ${formatDateTime(j.completed_at)}`,
    `Amount: ${amount ?? `not yet confirmed (estimate ${estimate ?? 'n/a'})`}`,
    `Payment: ${PAYMENT_STATUS[pay.status].label}${pay.paid ? ` (${formatGhs(pay.paid, { decimals: true })})` : ''}`,
  ].join('\n');

  return (
    <Screen edges={['bottom']} footer={<Button title="Share receipt" icon="share-variant-outline" variant="outline" onPress={() => Share.share({ message: shareText })} />}>
      <Card>
        <View style={styles.header}>
          <BrandMark size="sm" />
          <Badge label={PAYMENT_STATUS[pay.status].label} tone={PAYMENT_STATUS[pay.status].tone} />
        </View>
        <AppText variant="overline">Receipt</AppText>
        <AppText variant="title" selectable>
          {j.reference}
        </AppText>
        <Divider />
        <Line label="Service" value={service} />
        <Line label="Waste" value={waste} />
        <Line label="Address" value={j.address} />
        <Line label="Requested" value={formatDateTime(j.created_at)} />
        <Line label="Collected" value={formatDateTime(j.completed_at)} />
        <Line label="Collector" value={j.collector?.full_name ?? '—'} />
        <Divider />
        <Line label="Payment method" value={PAYMENT_METHODS[j.payment_method].short} />
        <Line label="Amount" value={amount ?? 'Awaiting confirmation'} strong />
        {amount == null && estimate ? <AppText variant="caption">Estimate at booking: {estimate}</AppText> : null}
        <Line label="Paid" value={pay.paid ? formatGhs(pay.paid, { decimals: true }) : '—'} />
        {(payments.data ?? []).map((p) => (
          <AppText key={p.id} variant="caption">
            {formatDateTime(p.created_at)} · {PAYMENT_METHODS[p.method].short} · {formatGhs(p.amount_ghs, { decimals: true })} · {PAYMENT_STATUS[p.status].label}
          </AppText>
        ))}
      </Card>
      <AppText variant="caption" align="center">
        Questions about this receipt? Contact support from Help & support.
      </AppText>
    </Screen>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant={strong ? 'heading' : 'body'} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
  value: { flexShrink: 1, textAlign: 'right' },
});
