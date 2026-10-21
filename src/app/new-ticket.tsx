import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice, Section } from '@/components/ui/layout';
import { OptionCard } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TICKET_CATEGORIES } from '@/constants/labels';
import { Spacing } from '@/constants/theme';
import { useCreateTicket } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';
import { notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';
import type { TicketCategory } from '@/types/models';
import { ticketSchema, type TicketValues } from '@/validation/schemas';

export default function NewTicket() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const profile = useProfile();
  const create = useCreateTicket();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<TicketValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: jobId ? 'missed_pickup' : 'complaint', message: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await create.mutateAsync({ userId: profile.id, category: v.category, message: v.message, jobId: jobId ?? null });
      notify('Message sent', 'Our team will get back to you on your phone number.');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen edges={['bottom']} footer={<Button title="Send to support" icon="send-outline" onPress={onSubmit} loading={create.isPending} />}>
      {jobId ? <Notice icon="link-variant">This message will be linked to your pickup.</Notice> : null}
      <Section title="What’s it about?">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <View style={{ gap: Spacing.two }} accessibilityRole="radiogroup">
              {(Object.keys(TICKET_CATEGORIES) as TicketCategory[]).map((c) => (
                <OptionCard key={c} compact icon={TICKET_CATEGORIES[c].icon} title={TICKET_CATEGORIES[c].label} selected={field.value === c} onPress={() => field.onChange(c)} />
              ))}
            </View>
          )}
        />
      </Section>
      <FormTextField control={control} name="message" label="Tell us what happened" multiline maxLength={2000} placeholder="Include dates, times and anything that helps us resolve it." />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <AppText variant="caption">Please don&apos;t include passwords, PINs or card numbers.</AppText>
    </Screen>
  );
}
