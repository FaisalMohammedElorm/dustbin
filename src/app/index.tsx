import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/auth-provider';

/** Entry point: sends each user to the home of their role. */
export default function Index() {
  const { session, profile } = useAuth();

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Redirect href="/onboarding" />;

  switch (profile.role) {
    case 'customer':
      return <Redirect href="/customer" />;
    case 'collector':
      return <Redirect href="/collector" />;
    case 'ops':
      return <Redirect href="/ops" />;
    case 'partner':
      return <Redirect href="/partner" />;
  }
}
