import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplash } from '@/components/animated-splash';
import { OfflineBanner } from '@/components/offline-banner';
import { ProfileLoadError } from '@/components/profile-load-error';
import { SetupRequired } from '@/components/setup-required';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { useRealtimeSync } from '@/features/jobs/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function useNavTheme(): Theme {
  const dark = useColorScheme() === 'dark';
  const palette = dark ? Colors.dark : Colors.light;
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
    },
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30 * 1000 },
      // Writes fail fast while offline instead of silently firing later, so the
      // app never implies a pickup was booked before the server confirmed it.
      // Retrying is safe: request creation is idempotent.
      mutations: { networkMode: 'always', retry: false },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const navTheme = useNavTheme();
  const dark = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {isSupabaseConfigured ? (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </QueryClientProvider>
        ) : (
          <HideSplash>
            <SetupRequired />
          </HideSplash>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function HideSplash({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return children;
}

function RootNavigator() {
  const { session, profile, initializing, profileError } = useAuth();
  useRealtimeSync(profile?.id ?? null);

  useEffect(() => {
    // Hand over from the native splash to the animated one immediately.
    SplashScreen.hideAsync();
  }, []);

  const role = profile?.role;
  const signedIn = !!session;
  const hasProfile = signedIn && !!profile;

  return (
    <View style={styles.fill}>
      {initializing ? null : session && !profile && profileError ? (
        <ProfileLoadError />
      ) : (
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />

          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={signedIn && !profile}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={hasProfile}>
            <Stack.Protected guard={role === 'customer'}>
              <Stack.Screen name="customer" options={{ headerShown: false }} />
              <Stack.Screen name="request-pickup" options={{ presentation: 'modal', title: 'Request a pickup' }} />
              <Stack.Screen name="pickup-confirmed/[id]" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="receipt/[id]" options={{ title: 'Receipt' }} />
              <Stack.Screen name="addresses" options={{ title: 'Saved addresses' }} />
            </Stack.Protected>

            <Stack.Protected guard={role === 'collector'}>
              <Stack.Screen name="collector" options={{ headerShown: false }} />
              <Stack.Screen name="collector-details" options={{ presentation: 'modal', title: 'Vehicle & service area' }} />
              <Stack.Screen name="log-dropoff" options={{ presentation: 'modal', title: 'Log a drop-off' }} />
            </Stack.Protected>

            <Stack.Protected guard={role === 'ops'}>
              <Stack.Screen name="ops" options={{ headerShown: false }} />
              <Stack.Screen name="assign/[id]" options={{ presentation: 'modal', title: 'Assign collector' }} />
              <Stack.Screen name="job-amount/[id]" options={{ presentation: 'modal', title: 'Record amount' }} />
            </Stack.Protected>

            <Stack.Protected guard={role === 'partner'}>
              <Stack.Screen name="partner" options={{ headerShown: false }} />
              <Stack.Screen name="confirm-dropoff/[id]" options={{ presentation: 'modal', title: 'Confirm drop-off' }} />
            </Stack.Protected>

            <Stack.Screen name="job/[id]" options={{ title: 'Pickup details' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal', title: 'Edit profile' }} />
            <Stack.Screen name="notification-settings" options={{ title: 'Notifications' }} />
            <Stack.Screen name="help" options={{ title: 'Help & support' }} />
            <Stack.Screen name="new-ticket" options={{ presentation: 'modal', title: 'Contact support' }} />
            <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
          </Stack.Protected>
        </Stack>
      )}
      <OfflineBanner />
      <AnimatedSplash ready={!initializing} />
    </View>
  );
}

/** Route-level error boundary (expo-router renders this when a screen throws). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <ErrorState title="Something went wrong" error={error} />
      <Button title="Try again" onPress={retry} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { justifyContent: 'center' },
});
