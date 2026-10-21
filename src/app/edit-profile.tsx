import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/ui/form-fields';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { formatGhanaPhone, normalizeGhanaPhone } from '@/domain/phone';
import { useAuth, useProfile } from '@/features/auth/auth-provider';
import { errorMessage } from '@/lib/format';
import { editProfileSchema, type EditProfileValues } from '@/validation/schemas';

export default function EditProfile() {
  const profile = useProfile();
  const { updateProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: profile.full_name,
      phone: formatGhanaPhone(profile.phone),
      organizationName: profile.organization_name ?? '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    if (profile.role === 'partner' && v.organizationName.length < 2) {
      setError('Enter your recycling business name.');
      return;
    }
    setError(null);
    try {
      await updateProfile({
        full_name: v.fullName,
        phone: normalizeGhanaPhone(v.phone)!,
        organization_name: v.organizationName || null,
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen edges={['bottom']} footer={<Button title="Save changes" onPress={onSubmit} loading={formState.isSubmitting} disabled={!formState.isDirty} />}>
      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}
      <FormTextField control={control} name="fullName" label="Full name" autoComplete="name" />
      <FormTextField control={control} name="phone" label="Phone number" keyboardType="phone-pad" autoComplete="tel" />
      <FormTextField
        control={control}
        name="organizationName"
        label={profile.role === 'partner' ? 'Recycling business name' : 'Organisation (optional)'}
      />
    </Screen>
  );
}
