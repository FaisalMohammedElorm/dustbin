import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { FormTextField, PasswordField } from '@/components/ui/form-fields';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Motion, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { errorMessage } from '@/lib/format';
import {
  resetConfirmSchema,
  resetRequestSchema,
  type ResetConfirmValues,
  type ResetRequestValues,
} from '@/validation/schemas';

/**
 * Two-step password recovery using a one-time code from email.
 * Requires the Supabase "Reset password" email template to include {{ .Token }}
 * (see docs/setup.md).
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState<string | null>(null);
  return (
    <Screen edges={['bottom']}>
      {email ? <ConfirmStep email={email} onRestart={() => setEmail(null)} /> : <RequestStep onSent={setEmail} />}
    </Screen>
  );
}

function RequestStep({ onSent }: { onSent: (email: string) => void }) {
  const { requestPasswordReset } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await requestPasswordReset(email);
      onSent(email.trim());
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Animated.View entering={FadeInRight.duration(Motion.base)} style={styles.step}>
      <View style={styles.header}>
        <AppText variant="display">Reset your password</AppText>
        <AppText variant="body" color="textSecondary">
          Enter your account email and we&apos;ll send you a code.
        </AppText>
      </View>
      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}
      <FormTextField
        control={control}
        name="email"
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Button title="Send code" onPress={onSubmit} loading={formState.isSubmitting} />
    </Animated.View>
  );
}

function ConfirmStep({ email, onRestart }: { email: string; onRestart: () => void }) {
  const { completePasswordReset } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ResetConfirmValues>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await completePasswordReset(email, values.code, values.password);
      // Signed in with the new password; the root navigator takes over.
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Animated.View entering={FadeInRight.duration(Motion.base)} style={styles.step}>
      <View style={styles.header}>
        <AppText variant="display">Enter your code</AppText>
        <AppText variant="body" color="textSecondary">
          If an account exists for {email}, we sent it a code. It may take a minute to arrive.
        </AppText>
      </View>
      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}
      <FormTextField
        control={control}
        name="code"
        label="Code from email"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={8}
      />
      <PasswordField control={control} name="password" label="New password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." />
      <PasswordField control={control} name="confirmPassword" label="Confirm new password" autoComplete="new-password" />
      <Button title="Set new password" onPress={onSubmit} loading={formState.isSubmitting} />
      <Button title="Use a different email" variant="ghost" onPress={onRestart} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
});
