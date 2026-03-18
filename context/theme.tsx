import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = '@park_app_theme';

type ThemeContextValue = {
  colorScheme: 'light' | 'dark';
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  themePreference: 'system',
  setThemePreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? 'light';
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemePreferenceState(stored);
      }
    });
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  const colorScheme: 'light' | 'dark' =
    themePreference === 'system' ? systemScheme : themePreference;

  return (
    <ThemeContext.Provider value={{ colorScheme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
