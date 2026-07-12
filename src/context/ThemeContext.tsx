import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme, Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('carhub_theme_mode');
      if (saved) return saved as ThemeMode;
    }
    return 'system';
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('carhub_theme_mode', themeMode);
    }
  }, [themeMode]);

  const colorScheme = themeMode === 'system' 
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : (themeMode === 'dark' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
}
