import { Platform } from 'react-native';

const tint = '#6366f1';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tint,
    pageBackground: '#F2F2F7',
    card: '#FFFFFF',
    textSecondary: '#3C3C43',
    textMuted: '#8E8E93',
    border: '#C6C6C8',
    divider: '#C6C6C840',
    tabBarBg: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tint,
    pageBackground: '#000000',
    card: '#1C1C1E',
    textSecondary: '#EBEBF599',
    textMuted: '#8E8E93',
    border: '#38383A',
    divider: '#38383A',
    tabBarBg: '#1C1C1E',
  },
};

export type AppTheme = typeof Colors.light;

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
