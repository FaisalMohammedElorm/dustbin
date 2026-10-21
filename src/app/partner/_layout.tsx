import { RoleTabs } from '@/components/role-tabs';

export default function PartnerLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Drop-offs', icon: 'recycle', headerShown: false },
        { name: 'account', title: 'Account', icon: 'account-circle-outline' },
      ]}
    />
  );
}
