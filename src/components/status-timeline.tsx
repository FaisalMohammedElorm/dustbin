import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeInLeft,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { JOB_STATUS } from '@/constants/labels';
import { Motion, Spacing } from '@/constants/theme';
import { PROGRESS_STATUSES, progressIndex, reachedAt, STATUS_DESCRIPTION } from '@/domain/job-status';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/format';
import type { Job } from '@/types/models';

const STEP_LABEL: Record<(typeof PROGRESS_STATUSES)[number], string> = {
  pending: 'Request received',
  assigned: 'Collector assigned',
  accepted: 'Collector confirmed',
  en_route: 'On the way',
  arrived: 'Arrived',
  collecting: 'Collecting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Needs assistance',
};

function PulseDot({ color }: { color: string }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1400 }), -1, false));
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.2 }] }));
  return <Animated.View style={[styles.pulse, { backgroundColor: color }, style]} />;
}

/** Vertical progress tracker driven by the job's real recorded timestamps. */
export function StatusTimeline({ job }: { job: Job }) {
  const theme = useTheme();
  const current = progressIndex(job.status);
  const halted = job.status === 'cancelled' || job.status === 'failed';

  return (
    <View accessibilityRole="list" accessibilityLabel={`Pickup progress: ${JOB_STATUS[job.status].label}`}>
      {PROGRESS_STATUSES.map((status, i) => {
        const done = !halted && i < current;
        const active = !halted && i === current;
        const reached = reachedAt(job, status);
        const showReached = reached && (done || active || halted);
        const last = i === PROGRESS_STATUSES.length - 1;
        const color = done || active ? theme.primary : theme.border;

        return (
          <Animated.View
            key={status}
            entering={FadeInLeft.delay(i * Motion.stagger).duration(Motion.base)}
            style={styles.row}
            accessibilityLabel={`${STEP_LABEL[status]}${active ? ', current step' : done ? ', done' : ''}`}>
            <View style={styles.rail}>
              <View style={styles.dotWrap}>
                {active && !(job.status === 'completed') ? <PulseDot color={theme.primary} /> : null}
                <View
                  style={[
                    styles.dot,
                    { borderColor: color, backgroundColor: done || (active && job.status === 'completed') ? theme.primary : theme.surface },
                    active && { backgroundColor: theme.primary },
                  ]}>
                  {done || active ? <Icon name={JOB_STATUS[status].icon} size={14} color="onPrimary" /> : null}
                </View>
              </View>
              {!last ? <View style={[styles.line, { backgroundColor: done ? theme.primary : theme.border }]} /> : null}
            </View>
            <View style={[styles.text, !last && styles.textGap]}>
              <View style={styles.titleRow}>
                <AppText variant={active ? 'bodyStrong' : 'body'} color={done || active ? 'text' : 'textMuted'}>
                  {status === 'accepted' && job.status === 'assigned' ? STEP_LABEL.assigned : STEP_LABEL[status]}
                </AppText>
                {showReached ? <AppText variant="caption">{formatTime(reached)}</AppText> : null}
              </View>
              {active ? <AppText variant="caption">{STATUS_DESCRIPTION[job.status]}</AppText> : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const DOT = 26;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  rail: { alignItems: 'center', width: DOT },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 18, marginVertical: 2, borderRadius: 1 },
  text: { flex: 1, paddingTop: 2 },
  textGap: { paddingBottom: Spacing.three },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
});
