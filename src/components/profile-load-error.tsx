import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useAuth } from '@/features/auth/auth-provider';

/** Shown when the user is signed in but their profile could not be fetched (e.g. offline). */
export function ProfileLoadError() {
  const { profileError, reloadProfile, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <ErrorState error={profileError} />
      <Button
        title="Try again"
        loading={retrying}
        onPress={async () => {
          setRetrying(true);
          await reloadProfile();
          setRetrying(false);
        }}
      />
      <Button title="Sign out" variant="ghost" onPress={() => signOut().catch(() => undefined)} />
    </Screen>
  );
}
