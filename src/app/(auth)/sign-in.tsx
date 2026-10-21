import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { FormTextField, PasswordField } from '@/components/ui/form-fields';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Motion, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { errorMessage } from '@/lib/format';
import { signInSchema, type SignInValues } from '@/validation/schemas';

export default function SignIn() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
      // The root navigator routes the user once the session changes.
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen edges={['bottom']}>
      <Animated.View entering={FadeInDown.duration(Motion.base)} style={styles.header}>
        <BrandMark size="md" />
        <AppText variant="display">Welcome back</AppText>
        <AppText variant="body" color="textSecondary">
          Sign in to book pickups and manage your jobs.
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
        returnKeyType="next"
      />
      <PasswordField
        control={control}
        name="password"
        label="Password"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <View style={styles.forgot}>
        <Link href="/forgot-password" accessibilityRole="link">
          <AppText variant="label" color="primary">
            Forgot password?
          </AppText>
        </Link>
      </View>

      <Button title="Sign in" onPress={onSubmit} loading={formState.isSubmitting} />

      <View style={styles.switch}>
        <AppText variant="body" color="textSecondary">
          New to DustBin Africa?
        </AppText>
        <Link href="/sign-up" replace accessibilityRole="link">
          <AppText variant="bodyStrong" color="primary">
            Create an account
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  forgot: { alignItems: 'flex-end', marginTop: -Spacing.two },
  switch: { flexDirection: 'row', gap: Spacing.one + 2, justifyContent: 'center', flexWrap: 'wrap' },
});
