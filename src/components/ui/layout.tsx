import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="overline">{title}</AppText>
        {action}
      </View>
      {children}
    </View>
  );
}

export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color="textSecondary" />
      <View style={styles.infoText}>
        <AppText variant="caption">{label}</AppText>
        {typeof value === 'string' || typeof value === 'number' ? (
          <AppText variant="bodyStrong">{value}</AppText>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

export function Notice({
  tone = 'info',
  icon = 'information-outline',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: IconName;
  children: ReactNode;
}) {
  const theme = useTheme();
  const bg = { info: theme.infoSoft, warning: theme.warningSoft, danger: theme.dangerSoft, success: theme.successSoft }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Icon name={icon} size={20} color={tone} />
      <View style={styles.infoText}>
        {typeof children === 'string' ? <AppText variant="caption" color="text">{children}</AppText> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two + 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start', paddingVertical: Spacing.one },
  infoText: { flex: 1, gap: 2 },
  notice: { flexDirection: 'row', gap: Spacing.two + 2, padding: Spacing.three, borderRadius: 12, alignItems: 'flex-start' },
});
