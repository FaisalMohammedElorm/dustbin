import { RoleTabs } from '@/components/role-tabs';

export default function OpsLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Dispatch', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', headerShown: false },
        { name: 'jobs', title: 'All jobs', icon: 'clipboard-list-outline', activeIcon: 'clipboard-list' },
        { name: 'collectors', title: 'Collectors', icon: 'account-hard-hat-outline', activeIcon: 'account-hard-hat' },
        { name: 'recycling', title: 'Recycling', icon: 'recycle' },
        { name: 'account', title: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
      ]}
    />
  );
}
