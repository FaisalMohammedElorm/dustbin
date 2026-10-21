import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { IconName } from '@/constants/labels';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type { IconName };

export function Icon({ name, size = 22, color = 'text' }: { name: IconName; size?: number; color?: ThemeColor }) {
  const theme = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={theme[color]} />;
}
