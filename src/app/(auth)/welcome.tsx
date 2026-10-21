import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo, TAGLINE } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Brand, MaxContentWidth, Motion, Radius, Spacing } from '@/constants/theme';
import { localStore } from '@/lib/local-store';

const INTRO_KEY = 'intro-seen-v1';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'map-marker-radius-outline',
    title: 'Pickup at your door',
    body: 'Tell us what needs collecting and where. Choose a time that suits you.',
  },
  {
    icon: 'truck-check-outline',
    title: 'Verified local collectors',
    body: 'Tricycle and truck operators checked by DustBin, with photo proof of every collection.',
  },
  {
    icon: 'recycle',
    title: 'Cleaner communities',
    body: 'Waste is routed to recycling partners — cleaner Ghana, greener future.',
  },
];

/**
 * First launch: a short three-card introduction. Afterwards (or after Skip),
 * a compact branded welcome so the intro never replays.
 */
export default function Welcome() {
  const [introDone, setIntroDone] = useState(() => localStore.get<boolean>(INTRO_KEY) === true);

  const finishIntro = () => {
    localStore.set(INTRO_KEY, true);
    setIntroDone(true);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {introDone ? <Landing /> : <Intro onDone={finishIntro} />}
      </SafeAreaView>
    </View>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (next !== page) setPage(next);
  };

  return (
    <View style={styles.introRoot}>
      <View style={styles.introTop}>
        <View style={styles.logoChip}>
          <Logo size={56} />
        </View>
        <Button title="Skip" variant="onDark" size="sm" onPress={onDone} style={styles.skip} />
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ width: pageWidth, alignSelf: 'center' }}>
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width: pageWidth }]} accessible accessibilityLabel={`${s.title}. ${s.body}`}>
            <View style={styles.slideIconOuter}>
              <View style={styles.slideIconInner}>
                <Icon name={s.icon} size={56} color="onPrimary" />
              </View>
            </View>
            <AppText variant="display" align="center" style={styles.white}>
              {s.title}
            </AppText>
            <AppText variant="body" align="center" style={styles.muted}>
              {s.body}
            </AppText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.introBottom}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <Animated.View key={s.title} style={[styles.dotBase, i === page ? styles.dotActive : styles.dotIdle]} />
          ))}
        </View>
        <Button
          title={last ? 'Get started' : 'Next'}
          iconRight={last ? undefined : 'arrow-right'}
          onPress={() => (last ? onDone() : scroller.current?.scrollTo({ x: (page + 1) * pageWidth, animated: true }))}
        />
      </View>
    </View>
  );
}

function Landing() {
  return (
    <View style={styles.landing}>
      <Animated.View entering={FadeIn.duration(Motion.slow)} style={styles.landingLogo}>
        <Logo size={220} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(150).duration(Motion.slow)} style={styles.landingText}>
        <AppText variant="title" align="center" style={styles.white}>
          Waste pickup, sorted.
        </AppText>
        <AppText variant="body" align="center" style={styles.muted}>
          {TAGLINE}
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(300).duration(Motion.slow)} style={styles.actions}>
        <Button title="Create an account" onPress={() => router.push('/sign-up')} />
        <Button title="I already have an account" variant="onDark" onPress={() => router.push('/sign-in')} style={styles.outline} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navy },
  safe: { flex: 1 },
  white: { color: Brand.white },
  muted: { color: '#B5C3D3' },
  introRoot: { flex: 1, paddingVertical: Spacing.three },
  introTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  logoChip: { borderRadius: Radius.md, overflow: 'hidden' },
  skip: { borderColor: '#3A5674' },
  slide: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  slideIconOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: Brand.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  slideIconInner: { width: 112, height: 112, borderRadius: 56, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  introBottom: { gap: Spacing.four, paddingHorizontal: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  dotBase: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: '#7FD69C' },
  dotIdle: { width: 8, backgroundColor: '#3A5674' },
  landing: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  landingLogo: { alignItems: 'center', marginTop: Spacing.five, borderRadius: Radius.xl, overflow: 'hidden', alignSelf: 'center' },
  landingText: { gap: Spacing.two },
  actions: { gap: Spacing.two + 4 },
  outline: { borderColor: '#3A5674' },
});
