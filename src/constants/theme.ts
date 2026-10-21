/**
 * DustBin Africa design tokens.
 * Brand: environmental green (#16863B) + deep navy (#10243A) on light neutrals.
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Brand = {
  green: '#16863B',
  greenDark: '#0F6A2D',
  navy: '#10243A',
  navyLight: '#1B3653',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    primary: Brand.green,
    primaryPressed: Brand.greenDark,
    primarySoft: '#E7F4EB',
    onPrimary: '#FFFFFF',
    secondary: Brand.navy,
    onSecondary: '#FFFFFF',
    text: '#1C2430',
    textSecondary: '#5B6573',
    textMuted: '#8A939F',
    background: '#F5F7F6',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2F0',
    border: '#E1E7E3',
    success: '#16863B',
    successSoft: '#E7F4EB',
    warning: '#A86410',
    warningSoft: '#FFF4DE',
    danger: '#C0352B',
    dangerSoft: '#FDECEA',
    info: '#1F5FA8',
    infoSoft: '#E7F0FA',
    tabBar: '#FFFFFF',
  },
  dark: {
    primary: '#2BA35A',
    primaryPressed: '#23894B',
    primarySoft: '#14301F',
    onPrimary: '#FFFFFF',
    secondary: '#2A4A6E',
    onSecondary: '#FFFFFF',
    text: '#EEF2F5',
    textSecondary: '#A3AFBC',
    textMuted: '#738191',
    background: '#0B1622',
    surface: '#12202F',
    surfaceAlt: '#1A2B3D',
    border: '#24374B',
    success: '#3DBA6B',
    successSoft: '#14301F',
    warning: '#E0A43F',
    warningSoft: '#33270F',
    danger: '#EF6A5F',
    dangerSoft: '#3A1A18',
    info: '#6AA6EC',
    infoSoft: '#16283D',
    tabBar: '#0F1C2A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = { [K in ThemeColor]: string };

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 720;

/** Minimum touch target (Apple HIG 44pt / Material 48dp). */
export const MinTouch = 48;

export const Typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;

/** Restrained, navy-tinted shadows (boxShadow works on iOS, Android and web). */
export const Elevation = {
  none: {},
  sm: { boxShadow: '0px 1px 2px rgba(16, 36, 58, 0.06), 0px 1px 3px rgba(16, 36, 58, 0.06)' },
  md: { boxShadow: '0px 4px 12px rgba(16, 36, 58, 0.08)' },
  lg: { boxShadow: '0px 12px 32px rgba(16, 36, 58, 0.14)' },
} as const satisfies Record<string, ViewStyle>;

export const Motion = {
  fast: 160,
  base: 260,
  slow: 420,
  stagger: 50,
  pressScale: 0.97,
} as const;
