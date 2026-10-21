import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { Divider, Notice, Section } from '@/components/ui/layout';
import { MenuRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { TICKET_CATEGORIES, TICKET_STATUS } from '@/constants/labels';
import { Spacing } from '@/constants/theme';
import { formatGhanaPhone } from '@/domain/phone';
import { useTickets } from '@/features/account/hooks';
import { useCatalog } from '@/features/jobs/hooks';
import { formatRelative } from '@/lib/format';

const FAQ = [
  {
    q: 'How is my price calculated?',
    a: 'You see an estimate range for the service you choose. The final amount is confirmed by DustBin after collection, based on the actual load.',
  },
  {
    q: 'How do I pay?',
    a: 'Pay your collector by cash or Mobile Money after the pickup. Never share your Mobile Money PIN with anyone.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes — you can cancel a pickup from its tracking screen until your collector is on the way.',
  },
  {
    q: 'What proof do I get?',
    a: 'Collectors photograph the waste before and after collection. The photos appear on your pickup once uploaded.',
  },
];

export default function Help() {
  const tickets = useTickets();
  const catalog = useCatalog();
  const settings = catalog.data?.settings;

  return (
    <Screen edges={['bottom']} refreshing={tickets.isRefetching} onRefresh={tickets.refetch}>
      <Card style={styles.menu}>
        <MenuRow icon="message-plus-outline" label="Contact support" detail="Report a problem or make a complaint" onPress={() => router.push('/new-ticket')} />
        {settings?.support_phone ? (
          <>
            <Divider />
            <MenuRow
              icon="phone-outline"
              label="Call DustBin Africa"
              detail={formatGhanaPhone(settings.support_phone)}
              onPress={() => Linking.openURL(`tel:${settings.support_phone}`)}
            />
          </>
        ) : null}
        {settings?.support_email ? (
          <>
            <Divider />
            <MenuRow icon="email-outline" label="Email us" detail={settings.support_email} onPress={() => Linking.openURL(`mailto:${settings.support_email}`)} />
          </>
        ) : null}
      </Card>
      {catalog.data && !settings?.support_phone && !settings?.support_email ? (
        <Notice>Phone and email support details have not been published yet. Use “Contact support” and our team will reply.</Notice>
      ) : null}

      <Section title="Your requests">
        {tickets.isPending ? (
          <SkeletonList count={1} />
        ) : tickets.isError ? (
          <ErrorState error={tickets.error} onRetry={tickets.refetch} />
        ) : tickets.data.length === 0 ? (
          <AppText variant="caption">You haven&apos;t contacted support yet.</AppText>
        ) : (
          tickets.data.map((t) => (
            <Card key={t.id}>
              <View style={styles.ticketTop}>
                <AppText variant="bodyStrong">{TICKET_CATEGORIES[t.category].label}</AppText>
                <Badge label={TICKET_STATUS[t.status].label} tone={TICKET_STATUS[t.status].tone} />
              </View>
              <AppText variant="caption" color="text" numberOfLines={3}>
                {t.message}
              </AppText>
              <AppText variant="caption">{formatRelative(t.created_at)}</AppText>
            </Card>
          ))
        )}
      </Section>

      <Section title="Common questions">
        <Card>
          {FAQ.map((f, i) => (
            <View key={f.q}>
              {i > 0 ? <Divider /> : null}
              <Collapsible title={f.q}>
                <AppText variant="body" color="textSecondary">
                  {f.a}
                </AppText>
              </Collapsible>
            </View>
          ))}
        </Card>
      </Section>
      <Button title="Privacy information" variant="ghost" icon="shield-lock-outline" onPress={() => router.push('/privacy')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  menu: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one, gap: 0 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
