import { RoleTabs } from '@/components/role-tabs';
import { COLLECTOR_ACTIVE_STATUSES } from '@/domain/job-status';
import { useUnreadCount } from '@/features/account/hooks';
import { useProfile } from '@/features/auth/auth-provider';
import { useJobList } from '@/features/jobs/hooks';

export default function CollectorLayout() {
  const profile = useProfile();
  const unread = useUnreadCount();
  const active = useJobList({ kind: 'collector', userId: profile.id, statuses: COLLECTOR_ACTIVE_STATUSES });

  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Jobs', icon: 'briefcase-search-outline', activeIcon: 'briefcase-search', headerShown: false },
        { name: 'my-jobs', title: 'My Jobs', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
        { name: 'active', title: 'Active', icon: 'navigation-variant-outline', activeIcon: 'navigation-variant', badge: active.data?.length },
        { name: 'earnings', title: 'Earnings', icon: 'wallet-outline', activeIcon: 'wallet' },
        { name: 'profile', title: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
        { name: 'notifications', title: 'Notifications', icon: 'bell-outline', hidden: true, badge: unread.data },
        { name: 'dropoffs', title: 'Recycling drop-offs', icon: 'recycle', hidden: true },
      ]}
    />
  );
}
