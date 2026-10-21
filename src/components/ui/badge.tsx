import { StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/text';
import { JOB_STATUS, type Tone } from '@/constants/labels';
import { Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { JobStatus } from '@/types/models';

const TONES: Record<Tone, { bg: ThemeColor; fg: ThemeColor }> = {
  neutral: { bg: 'surfaceAlt', fg: 'textSecondary' },
  info: { bg: 'infoSoft', fg: 'info' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  success: { bg: 'successSoft', fg: 'success' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
};

/**
 * Status pill. Keyed by label so a status change re-runs the entrance animation,
 * giving a subtle transition when realtime updates arrive.
 */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const t = TONES[tone];
  return (
    <Animated.View
      key={label}
      entering={ZoomIn.duration(Motion.base)}
      style={[styles.badge, { backgroundColor: theme[t.bg] }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}>
      <Animated.View style={[styles.dot, { backgroundColor: theme[t.fg] }]} />
      <AppText variant="caption" color={t.fg} style={styles.text}>
        {label}
      </AppText>
    </Animated.View>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const info = JOB_STATUS[status];
  return <Badge label={info.label} tone={info.tone} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontWeight: '600' },
});
