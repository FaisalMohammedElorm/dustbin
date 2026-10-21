import { StyleSheet, Text, type TextProps } from 'react-native';

import { Typography, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant = keyof typeof Typography;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const defaultColor: ThemeColor =
    variant === 'caption' || variant === 'overline' ? 'textSecondary' : 'text';
  return (
    <Text
      style={[styles[variant], { color: theme[color ?? defaultColor] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create(Typography);
