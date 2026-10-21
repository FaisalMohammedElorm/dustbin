import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';

import type { IconName } from '@/constants/labels';
import { useTheme } from '@/hooks/use-theme';

export type RoleTab = {
  name: string;
  title: string;
  icon: IconName;
  /** Icon used when the tab is focused (defaults to `icon`). */
  activeIcon?: IconName;
  headerShown?: boolean;
  badge?: number;
  /** Route exists in this navigator but is reached from elsewhere, not the tab bar. */
  hidden?: boolean;
};

/** Bottom-tab navigator shared by every role's area. */
export function RoleTabs({ tabs }: { tabs: RoleTab[] }) {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarBadgeStyle: { backgroundColor: theme.danger, fontSize: 10 },
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: theme.text },
        sceneStyle: { backgroundColor: theme.background },
        animation: 'shift',
      }}>
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            href: t.hidden ? null : undefined,
            headerShown: t.headerShown ?? true,
            tabBarBadge: t.badge ? (t.badge > 9 ? '9+' : t.badge) : undefined,
            tabBarAccessibilityLabel: t.badge ? `${t.title}, ${t.badge} unread` : t.title,
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons name={focused ? (t.activeIcon ?? t.icon) : t.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
