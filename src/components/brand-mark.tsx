import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Brand } from '@/constants/theme';
import { useIsDark } from '@/hooks/use-theme';

export const TAGLINE = 'Cleaner Ghana, Greener Future.';

const LOGO = require('@/assets/brand/logo.png');
const EMBLEM = require('@/assets/brand/emblem.png');

/** The full supplied DustBin Africa logo (white rounded tile), shown unmodified. */
export function Logo({ size = 200 }: { size?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="DustBin Africa — Africa's No 1 Waste Logistics Platform"
    />
  );
}

/**
 * Compact lockup for headers: the logo emblem on its white tile plus the wordmark.
 * `inverted` renders the wordmark for navy surfaces.
 */
export function BrandMark({ size = 'md', inverted }: { size?: 'sm' | 'md' | 'lg'; inverted?: boolean }) {
  const isDark = useIsDark();
  const tile = { sm: 36, md: 44, lg: 64 }[size];
  const fontSize = { sm: 17, md: 21, lg: 28 }[size];
  const navy = inverted || isDark ? Brand.white : Brand.navy;

  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="DustBin Africa">
      <View style={[styles.tile, { width: tile, height: tile, borderRadius: tile * 0.28 }]}>
        <Image source={EMBLEM} style={{ width: tile * 0.92, height: tile * 0.92 }} contentFit="contain" />
      </View>
      <View>
        <AppText style={{ fontSize, lineHeight: fontSize * 1.1, fontWeight: '800', color: navy, letterSpacing: 0.3 }}>
          DUST<AppText style={{ fontSize, fontWeight: '800', color: inverted ? '#7FD69C' : Brand.green }}>BIN</AppText>
        </AppText>
        <AppText
          style={{
            fontSize: fontSize * 0.42,
            lineHeight: fontSize * 0.55,
            fontWeight: '700',
            letterSpacing: fontSize * 0.22,
            color: inverted ? '#7FD69C' : Brand.green,
          }}>
          AFRICA
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tile: { backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
