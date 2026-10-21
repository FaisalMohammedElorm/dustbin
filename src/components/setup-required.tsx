import { StyleSheet, View } from 'react-native';

import { BrandMark, TAGLINE } from '@/components/brand-mark';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/layout';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Fonts, Spacing } from '@/constants/theme';

/** Shown instead of the app when the backend environment variables are missing. */
export function SetupRequired() {
  return (
    <Screen>
      <View style={styles.header}>
        <BrandMark size="lg" />
        <AppText variant="caption">{TAGLINE}</AppText>
      </View>
      <Notice tone="warning" icon="cloud-off-outline">
        <AppText variant="bodyStrong">Backend not configured</AppText>
        <AppText variant="caption" color="text">
          This build has no Supabase connection, so sign-in and pickups are unavailable. No demo data is shown.
        </AppText>
      </Notice>
      <Card>
        <AppText variant="heading">Developer setup</AppText>
        <Step n={1} text="Create a Supabase project and run supabase/migrations/*.sql (SQL editor or `supabase db push`)." />
        <Step n={2} text="Copy .env.example to .env.local and fill in:" />
        <AppText style={styles.code}>EXPO_PUBLIC_SUPABASE_URL{'\n'}EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY</AppText>
        <Step n={3} text="Restart the dev server: npx expo start --clear" />
      </Card>
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <AppText variant="label" color="primary">
        {n}.
      </AppText>
      <AppText variant="body" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  step: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  code: { fontFamily: Fonts.mono, fontSize: 13, paddingLeft: Spacing.four },
});
