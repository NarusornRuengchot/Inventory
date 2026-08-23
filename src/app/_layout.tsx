import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

import { InventoryProvider } from '@/context/InventoryContext';
import { ThemeModeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <TabLayoutContent />
      </AuthProvider>
    </ThemeModeProvider>
  );
}

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <InventoryProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </InventoryProvider>
    </ThemeProvider>
  );
}
