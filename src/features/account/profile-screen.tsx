import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandMark, TAGLINE } from '@/components/brand-mark';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/layout';
import { Avatar, MenuRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { COLLECTOR_STATUS, ROLE_INFO, VEHICLES } from '@/constants/labels';
import { Motion, Spacing } from '@/constants/theme';
import { formatGhanaPhone } from '@/domain/phone';
import { useAuth, useProfile } from '@/features/auth/auth-provider';
import { useCollectorProfile } from '@/features/collector/hooks';
import { confirm, notify } from '@/lib/dialogs';
import { errorMessage } from '@/lib/format';

/** Profile & settings hub for every role. */
export default function ProfileScreen() {
  const profile = useProfile();
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const isCollector = profile.role === 'collector';
  const collector = useCollectorProfile(isCollector ? profile.id : '');

  async function onSignOut() {
    if (!(await confirm('Sign out?', 'You will need to sign in again to use DustBin Africa.', 'Sign out', true))) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      notify('Could not sign out', errorMessage(e));
      setSigningOut(false);
    }
  }

  return (
    <Screen edges={[]}>
      <Animated.View entering={FadeInDown.duration(Motion.base)}>
        <Card>
          <View style={styles.identity}>
            <Avatar name={profile.full_name} size={60} />
            <View style={styles.flex}>
              <AppText variant="heading">{profile.full_name}</AppText>
              <AppText variant="caption">{formatGhanaPhone(profile.phone)}</AppText>
              <AppText variant="caption">{session?.user.email}</AppText>
            </View>
          </View>
          <View style={styles.badges}>
            <Badge label={ROLE_INFO[profile.role].label} tone="info" />
            {isCollector && collector.data ? (
              <Badge label={COLLECTOR_STATUS[collector.data.status].label} tone={COLLECTOR_STATUS[collector.data.status].tone} />
            ) : null}
          </View>
          {profile.organization_name ? <AppText variant="caption">{profile.organization_name}</AppText> : null}
        </Card>
      </Animated.View>

      <Card style={styles.menu}>
        <MenuRow icon="account-edit-outline" label="Edit profile" detail="Name, phone, organisation" onPress={() => router.push('/edit-profile')} />
        {profile.role === 'customer' ? (
          <>
            <Divider />
            <MenuRow icon="map-marker-star-outline" label="Saved addresses" onPress={() => router.push('/addresses')} />
            <Divider />
            <MenuRow icon="history" label="Pickup history" onPress={() => router.navigate('/customer/pickups')} />
          </>
        ) : null}
        {isCollector ? (
          <>
            <Divider />
            <MenuRow
              icon={collector.data ? VEHICLES[collector.data.vehicle_type].icon : 'truck-outline'}
              label="Vehicle & service area"
              detail={collector.data ? `${VEHICLES[collector.data.vehicle_type].label}${collector.data.vehicle_plate ? ` · ${collector.data.vehicle_plate}` : ''}` : undefined}
              onPress={() => router.push('/collector-details')}
            />
            <Divider />
            <MenuRow icon="recycle" label="Recycling drop-offs" onPress={() => router.navigate('/collector/dropoffs')} />
          </>
        ) : null}
        <Divider />
        <MenuRow icon="bell-cog-outline" label="Notification preferences" onPress={() => router.push('/notification-settings')} />
      </Card>

      <Card style={styles.menu}>
        <MenuRow icon="lifebuoy" label="Help & support" onPress={() => router.push('/help')} />
        <Divider />
        <MenuRow icon="shield-lock-outline" label="Privacy" onPress={() => router.push('/privacy')} />
        <Divider />
        <MenuRow icon="logout" label={signingOut ? 'Signing out…' : 'Sign out'} destructive onPress={onSignOut} trailing={<View />} />
      </Card>

      <View style={styles.footer}>
        <BrandMark size="sm" />
        <AppText variant="caption">{TAGLINE}</AppText>
        <AppText variant="caption">Version {Constants.expoConfig?.version ?? '—'}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  menu: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one, gap: 0 },
  footer: { alignItems: 'center', gap: Spacing.one, marginTop: Spacing.three },
});
