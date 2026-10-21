import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice, Section } from '@/components/ui/layout';
import { ChipGroup, OptionCard } from '@/components/ui/option-card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ROLE_INFO, VEHICLES } from '@/constants/labels';
import { Motion, Spacing } from '@/constants/theme';
import { normalizeGhanaPhone } from '@/domain/phone';
import { useAuth } from '@/features/auth/auth-provider';
import { errorMessage } from '@/lib/format';
import { registerProfileSchema, vehicleTypes, type RegisterProfileValues } from '@/validation/schemas';

const SELF_SERVE_ROLES = ['customer', 'collector', 'partner'] as const;

export default function Onboarding() {
  const { register, signOut, session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<RegisterProfileValues>({
    resolver: zodResolver(registerProfileSchema),
    defaultValues: { role: 'customer', fullName: '', phone: '', organizationName: '', vehicleType: null, vehiclePlate: '' },
  });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await register({
        role: v.role,
        fullName: v.fullName,
        phone: normalizeGhanaPhone(v.phone)!,
        organizationName: v.organizationName || null,
        vehicleType: v.role === 'collector' ? v.vehicleType : null,
        vehiclePlate: v.role === 'collector' ? v.vehiclePlate || null : null,
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen footer={<Button title="Continue" onPress={onSubmit} loading={formState.isSubmitting} />}>
      <View style={styles.header}>
        <BrandMark size="md" />
        <AppText variant="display">Set up your profile</AppText>
        <AppText variant="body" color="textSecondary">
          Signed in as {session?.user.email}. We only ask for what we need to arrange pickups.
        </AppText>
      </View>

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      <Section title="I am a">
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <View style={styles.options} accessibilityRole="radiogroup">
              {SELF_SERVE_ROLES.map((r) => (
                <OptionCard
                  key={r}
                  title={ROLE_INFO[r].label}
                  description={ROLE_INFO[r].description}
                  icon={ROLE_INFO[r].icon}
                  selected={field.value === r}
                  onPress={() => field.onChange(r)}
                />
              ))}
            </View>
          )}
        />
        <AppText variant="caption">
          Dispatch team accounts are created by a DustBin administrator — register as a customer and ask for access.
        </AppText>
      </Section>

      <Section title="Your details">
        <FormTextField control={control} name="fullName" label="Full name" autoComplete="name" textContentType="name" />
        <FormTextField
          control={control}
          name="phone"
          label="Phone number"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="024 123 4567"
          hint="Used by your collector or dispatch about your pickups."
        />
        <FormTextField
          control={control}
          name="organizationName"
          label={role === 'partner' ? 'Recycling business name' : role === 'collector' ? 'Company name (optional)' : 'Business name (optional)'}
        />
      </Section>

      {role === 'collector' ? (
        <Animated.View entering={FadeIn.duration(Motion.base)}>
          <Section title="Your vehicle">
            <Controller
              control={control}
              name="vehicleType"
              render={({ field, fieldState }) => (
                <>
                  <ChipGroup
                    value={field.value}
                    onChange={field.onChange}
                    options={vehicleTypes.map((v) => ({ value: v, label: VEHICLES[v].label, icon: VEHICLES[v].icon }))}
                  />
                  {fieldState.error ? (
                    <AppText variant="caption" color="danger">
                      {fieldState.error.message}
                    </AppText>
                  ) : null}
                </>
              )}
            />
            <FormTextField control={control} name="vehiclePlate" label="Registration number (optional)" autoCapitalize="characters" placeholder="GR 1234-24" />
            <Notice icon="shield-check-outline">
              DustBin verifies every collector before they can see or accept jobs. We&apos;ll be in touch on your phone number.
            </Notice>
          </Section>
        </Animated.View>
      ) : null}

      <Button title="Sign out" variant="ghost" onPress={() => signOut().catch(() => undefined)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two },
  options: { gap: Spacing.two + 2 },
});
