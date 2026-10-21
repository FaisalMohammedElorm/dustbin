import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { FormTextField, PasswordField } from '@/components/ui/form-fields';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Motion, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { errorMessage } from '@/lib/format';
import { signUpSchema, type SignUpValues } from '@/validation/schemas';

export default function SignUp() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const { needsConfirmation } = await signUp(values.email, values.password);
      if (needsConfirmation) setConfirmEmail(values.email.trim());
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (confirmEmail) {
    return (
      <Screen edges={['bottom']} contentStyle={styles.center}>
        <EmptyState
          icon="email-check-outline"
          title="Check your email"
          message={`We sent a confirmation link to ${confirmEmail}. Open it, then sign in to finish setting up your account.`}
          actionLabel="Go to sign in"
          onAction={() => router.replace('/sign-in')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Animated.View entering={FadeInDown.duration(Motion.base)} style={styles.header}>
        <BrandMark size="md" />
        <AppText variant="display">Create your account</AppText>
        <AppText variant="body" color="textSecondary">
          Customers, collectors and recycling partners all start here.
        </AppText>
      </Animated.View>

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
        textContentType="emailAddress"
        placeholder="you@example.com"
      />
      <PasswordField
        control={control}
        name="password"
        label="Password"
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters, with a letter and a number."
      />
      <PasswordField control={control} name="confirmPassword" label="Confirm password" autoComplete="new-password" textContentType="newPassword" />

      <Button title="Create account" onPress={onSubmit} loading={formState.isSubmitting} />

      <AppText variant="caption" align="center">
        By continuing you agree to DustBin Africa collecting the details needed to arrange pickups. See Privacy in your profile.
      </AppText>

      <View style={styles.switch}>
        <AppText variant="body" color="textSecondary">
          Already registered?
        </AppText>
        <Link href="/sign-in" replace accessibilityRole="link">
          <AppText variant="bodyStrong" color="primary">
            Sign in
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  center: { flexGrow: 1, justifyContent: 'center' },
  switch: { flexDirection: 'row', gap: Spacing.one + 2, justifyContent: 'center', flexWrap: 'wrap' },
});
