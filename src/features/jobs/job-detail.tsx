import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/layout';
import { ChipGroup } from '@/components/ui/option-card';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { availableActions, type JobAction } from '@/domain/job-status';
import { timingOptions, type TimingKey } from '@/domain/schedule';
import {
  useAcceptAssignment,
  useCancelJob,
  useCatalog,
  useDeclineJob,
  useReopenJob,
  useReportProblem,
  useRescheduleJob,
} from '@/features/jobs/hooks';
import {
  EventLog,
  JobHero,
  PaymentCard,
  PeopleCard,
  PhotoGallery,
  PickupDetailsCard,
  ProgressCard,
  RatingCard,
  TerminalNotice,
} from '@/features/jobs/job-sections';
import { RateJob } from '@/features/jobs/rate-job';
import { confirm, notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';
import type { JobWithPeople, Profile } from '@/types/models';

/** Body shared with the customer Tracking tab. */
export function JobDetailBody({ job, profile }: { job: JobWithPeople; profile: Profile }) {
  return (
    <>
      <JobHero job={job} />
      <TerminalNotice job={job} />
      <ProgressCard job={job} />
      <PeopleCard job={job} viewerRole={profile.role} />
      {profile.role === 'customer' && job.status === 'completed' && job.rating == null ? <RateJob jobId={job.id} /> : null}
      <PaymentCard job={job} />
      <PickupDetailsCard job={job} />
      <PhotoGallery jobId={job.id} viewerRole={profile.role} />
      <RatingCard job={job} />
      <EventLog jobId={job.id} />
    </>
  );
}

type SheetKind = 'cancel' | 'reschedule' | 'decline' | 'problem' | null;

const CUSTOMER_CANCEL_REASONS = ['No longer needed', 'Booked by mistake', 'Found another service', 'Price concerns'];
const OPS_CANCEL_REASONS = ['Customer unreachable', 'Duplicate request', 'Outside service area', 'Customer asked to cancel'];
const DECLINE_REASONS = ['Too far away', 'Vehicle unavailable', 'Load too large', 'Not available at that time'];
const PROBLEM_REASONS = ['Customer not reachable', 'Cannot access location', 'Waste not as described', 'Vehicle breakdown'];

/** Footer actions for whoever is viewing the job, driven by the shared status model. */
export function JobActions({ job, profile }: { job: JobWithPeople; profile: Profile }) {
  const actions = useMemo(() => availableActions(job, profile), [job, profile]);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const accept = useAcceptAssignment();
  const reopen = useReopenJob();

  const has = (a: JobAction) => actions.includes(a);
  const buttons: ReactNode[] = [];

  async function run(fn: () => Promise<unknown>, success?: string) {
    try {
      await fn();
      if (success) notify(success);
    } catch (e) {
      notify('That didn’t work', errorMessage(e));
    }
  }

  if (profile.role === 'collector') {
    if (has('accept_assignment')) {
      buttons.push(
        <Button key="accept" title="Accept assignment" icon="check-circle-outline" loading={accept.isPending} onPress={() => run(() => accept.mutateAsync(job.id))} />,
        <Button key="decline" title="Decline" variant="outline" onPress={() => setSheet('decline')} />,
      );
    }
    if (job.collector_id === profile.id && ['accepted', 'en_route', 'arrived', 'collecting'].includes(job.status)) {
      buttons.push(
        <Button
          key="continue"
          title="Continue collection"
          icon="arrow-right-circle-outline"
          onPress={() => router.navigate({ pathname: '/collector/active', params: { job: job.id } })}
        />,
      );
    }
    if (has('report_problem')) buttons.push(<Button key="problem" title="Report a problem" variant="ghost" onPress={() => setSheet('problem')} />);
  }

  if (profile.role === 'customer') {
    if (job.status === 'completed') {
      buttons.push(
        <Button key="receipt" title="View receipt" icon="receipt" variant="secondary" onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: job.id } })} />,
      );
    }
    if (has('reschedule')) buttons.push(<Button key="reschedule" title="Change pickup time" variant="outline" icon="calendar-edit" onPress={() => setSheet('reschedule')} />);
    if (has('cancel')) buttons.push(<Button key="cancel" title="Cancel pickup" variant="danger" onPress={() => setSheet('cancel')} />);
    buttons.push(
      <Button
        key="help"
        title="Get help with this pickup"
        variant="ghost"
        icon="lifebuoy"
        onPress={() => router.push({ pathname: '/new-ticket', params: { jobId: job.id } })}
      />,
    );
  }

  if (profile.role === 'ops') {
    if (has('assign')) {
      buttons.push(
        <Button
          key="assign"
          title={job.collector_id ? 'Reassign collector' : 'Assign collector'}
          icon="account-arrow-right-outline"
          onPress={() => router.push({ pathname: '/assign/[id]', params: { id: job.id } })}
        />,
      );
    }
    if (has('reopen')) {
      buttons.push(
        <Button key="reopen" title="Return to queue" variant="secondary" loading={reopen.isPending} onPress={() => run(() => reopen.mutateAsync(job.id), 'Job returned to the queue')} />,
      );
    }
    const money: ReactNode[] = [];
    if (has('set_final_amount')) {
      money.push(
        <Button key="final" title="Confirm amount" size="md" variant="outline" style={styles.flex} onPress={() => router.push({ pathname: '/job-amount/[id]', params: { id: job.id, mode: 'final' } })} />,
      );
    }
    if (has('record_payment')) {
      money.push(
        <Button key="pay" title="Record payment" size="md" variant="outline" style={styles.flex} onPress={() => router.push({ pathname: '/job-amount/[id]', params: { id: job.id, mode: 'payment' } })} />,
      );
    }
    if (job.status === 'completed' && job.collector_id) {
      money.push(
        <Button key="payout" title="Add payout" size="md" variant="outline" style={styles.flex} onPress={() => router.push({ pathname: '/job-amount/[id]', params: { id: job.id, mode: 'payout' } })} />,
      );
    }
    if (money.length) buttons.push(<View key="money" style={styles.moneyRow}>{money}</View>);
    if (has('cancel')) buttons.push(<Button key="cancel" title="Cancel job" variant="danger" onPress={() => setSheet('cancel')} />);
  }

  return (
    <>
      {buttons.length ? <View style={styles.actions}>{buttons}</View> : null}
      <CancelSheet visible={sheet === 'cancel'} job={job} role={profile.role} onClose={() => setSheet(null)} />
      <RescheduleSheet visible={sheet === 'reschedule'} job={job} onClose={() => setSheet(null)} />
      <ReasonSheet
        visible={sheet === 'decline'}
        title="Decline this job?"
        reasons={DECLINE_REASONS}
        confirmLabel="Decline job"
        onClose={() => setSheet(null)}
        useAction={useDeclineJob}
        jobId={job.id}
        onDone={() => router.back()}
      />
      <ReasonSheet
        visible={sheet === 'problem'}
        title="What’s the problem?"
        reasons={PROBLEM_REASONS}
        confirmLabel="Report to dispatch"
        onClose={() => setSheet(null)}
        useAction={useReportProblem}
        jobId={job.id}
        note="Dispatch will be alerted and the job will be marked as needing assistance."
      />
    </>
  );
}

function ReasonSheet({
  visible,
  title,
  reasons,
  confirmLabel,
  onClose,
  useAction,
  jobId,
  note,
  onDone,
}: {
  visible: boolean;
  title: string;
  reasons: string[];
  confirmLabel: string;
  onClose: () => void;
  useAction: typeof useDeclineJob | typeof useReportProblem;
  jobId: string;
  note?: string;
  onDone?: () => void;
}) {
  const action = useAction();
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const finalReason = reason === 'Other' ? other.trim() : reason;

  async function submit() {
    if (!finalReason) return;
    setError(null);
    try {
      await action.mutateAsync({ jobId, reason: finalReason });
      onClose();
      onDone?.();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ChipGroup value={reason} onChange={setReason} options={[...reasons, 'Other'].map((r) => ({ value: r, label: r }))} />
      {reason === 'Other' ? <TextField label="Tell us more" value={other} onChangeText={setOther} maxLength={200} /> : null}
      {note ? <AppText variant="caption">{note}</AppText> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button title={confirmLabel} variant="danger" onPress={submit} loading={action.isPending} disabled={!finalReason} />
    </BottomSheet>
  );
}

function CancelSheet({ visible, job, role, onClose }: { visible: boolean; job: JobWithPeople; role: Profile['role']; onClose: () => void }) {
  const cancel = useCancelJob();
  const reasons = role === 'ops' ? OPS_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setError(null);
    try {
      await cancel.mutateAsync({ jobId: job.id, reason: role === 'ops' ? `Dispatch: ${reason}` : reason });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={role === 'ops' ? 'Cancel this job?' : 'Cancel this pickup?'}>
      <AppText variant="body" color="textSecondary">
        {role === 'ops' ? 'The customer and collector will be notified.' : 'Choose a reason. Your request will be withdrawn.'}
      </AppText>
      <ChipGroup value={reason} onChange={setReason} options={reasons.map((r) => ({ value: r, label: r }))} />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button title={role === 'ops' ? 'Cancel job' : 'Cancel pickup'} variant="danger" onPress={submit} loading={cancel.isPending} disabled={!reason} />
      <Button title="Keep it" variant="ghost" onPress={onClose} />
    </BottomSheet>
  );
}

function RescheduleSheet({ visible, job, onClose }: { visible: boolean; job: JobWithPeople; onClose: () => void }) {
  const reschedule = useRescheduleJob();
  const catalog = useCatalog();
  const options = useMemo(() => timingOptions(), []);
  const [timing, setTiming] = useState<TimingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enabled = catalog.data?.settings.scheduling_enabled ?? false;

  async function submit() {
    if (!timing) return;
    const date = options.find((o) => o.value === timing)?.date ?? null;
    if (!(await confirm('Change pickup time?', date ? `New time: ${date.toLocaleString()}` : 'Collect as soon as possible.', 'Change time'))) return;
    setError(null);
    try {
      await reschedule.mutateAsync({ jobId: job.id, scheduledFor: date?.toISOString() ?? null });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Change pickup time">
      {enabled ? (
        <>
          <ChipGroup value={timing} onChange={setTiming} options={options.map((o) => ({ value: o.value, label: o.label }))} />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Button title="Save new time" onPress={submit} loading={reschedule.isPending} disabled={!timing} />
        </>
      ) : (
        <Notice tone="warning">Scheduled pickups aren’t available right now.</Notice>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.two },
  moneyRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  flex: { flexGrow: 1 },
});
