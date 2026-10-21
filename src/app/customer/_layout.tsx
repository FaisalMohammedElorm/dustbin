import { RoleTabs } from '@/components/role-tabs';
import { useUnreadCount } from '@/features/account/hooks';

export default function CustomerLayout() {
  const unread = useUnreadCount();
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Home', icon: 'home-variant-outline', activeIcon: 'home-variant', headerShown: false },
        { name: 'pickups', title: 'My Pickups', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
        { name: 'tracking', title: 'Tracking', icon: 'map-marker-path' },
        { name: 'notifications', title: 'Notifications', icon: 'bell-outline', activeIcon: 'bell', badge: unread.data },
        { name: 'profile', title: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
      ]}
    />
  );
}
