import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0a0a0f',
    background: '#ffffff',
    tint: '#0099bb',
    icon: '#5a6478',
    tabIconDefault: '#5a6478',
    tabIconSelected: '#0099bb',
    pageBackground: '#f0f4ff',
    card: '#ffffff',
    surface2: '#e8eeff',
    surface3: '#dde5ff',
    textSecondary: '#374151',
    textMuted: 'rgba(10,10,20,0.5)',
    border: 'rgba(0,0,0,0.1)',
    divider: 'rgba(0,0,0,0.08)',
    tabBarBg: '#ffffff',
    amber: '#d4820a',
  },
  dark: {
    text: '#eeeeff',
    background: '#0a0a0f',
    tint: '#00d4ff',
    icon: 'rgba(238,238,255,0.45)',
    tabIconDefault: 'rgba(238,238,255,0.45)',
    tabIconSelected: '#00d4ff',
    pageBackground: '#0a0a0f',
    card: '#0d0d1a',
    surface2: '#0f0f1e',
    surface3: '#111120',
    textSecondary: 'rgba(238,238,255,0.7)',
    textMuted: 'rgba(238,238,255,0.45)',
    border: 'rgba(255,255,255,0.07)',
    divider: 'rgba(255,255,255,0.07)',
    tabBarBg: '#0d0d1a',
    amber: '#f5a623',
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
