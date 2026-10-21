import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { Divider, Notice } from '@/components/ui/layout';
import { ToggleRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useAuth, useProfile } from '@/features/auth/auth-provider';
import { notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';
import type { Profile } from '@/types/models';

type PrefKey = 'notify_job_updates' | 'notify_payment_updates' | 'notify_announcements';

export default function NotificationSettings() {
  const profile = useProfile();
  const { updateProfile } = useAuth();
  const [saving, setSaving] = useState<PrefKey | null>(null);

  async function toggle(key: PrefKey, value: boolean) {
    setSaving(key);
    try {
      await updateProfile({ [key]: value } as Partial<Pick<Profile, PrefKey>>);
    } catch (e) {
      notify('Could not save', errorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Card>
        <ToggleRow
          label="Pickup updates"
          detail="Assignment, arrival, completion and cancellations"
          value={profile.notify_job_updates}
          onChange={(v) => toggle('notify_job_updates', v)}
          disabled={saving !== null}
        />
        <Divider />
        <ToggleRow
          label="Payment updates"
          detail="When a payment is recorded for your pickup"
          value={profile.notify_payment_updates}
          onChange={(v) => toggle('notify_payment_updates', v)}
          disabled={saving !== null}
        />
        <Divider />
        <ToggleRow
          label="Service announcements"
          detail="New areas and services (occasional)"
          value={profile.notify_announcements}
          onChange={(v) => toggle('notify_announcements', v)}
          disabled={saving !== null}
        />
      </Card>
      <Notice icon="information-outline">
        <AppText variant="caption" color="text">
          These preferences control notifications in your DustBin inbox. Push notifications to your phone will be added once the
          notification service is configured — you&apos;ll be asked for permission first.
        </AppText>
      </Notice>
    </Screen>
  );
}
