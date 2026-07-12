import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useColorScheme, View, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Link, usePathname } from 'expo-router';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/ThemeContext';

export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.slotContainer, { backgroundColor: theme.background }]}>
        <TabSlot style={{ height: '100%' }} />
      </View>
      
      {/* Top Navigation Menu */}
      <TabList asChild>
        <CustomTabList position="top">
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="products" href="/products" asChild>
            <TabButton>Products</TabButton>
          </TabTrigger>
          <TabTrigger name="add" href="/add" asChild>
            <TabButton>Add</TabButton>
          </TabTrigger>
          <TabTrigger name="categories" href="/categories" asChild>
            <TabButton>Categories</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>

      {/* Bottom Navigation Menu */}
      <WebFooterNav />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function WebFooterNav() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { colorScheme, setThemeMode } = useThemeMode();
  const isNarrow = width < 600;
  
  const getButtonType = (routePath: string) => {
    const isActive = pathname === routePath || (routePath !== '/' && pathname.startsWith(routePath));
    return isActive ? 'backgroundSelected' : 'backgroundElement';
  };

  const getTextColor = (routePath: string) => {
    const isActive = pathname === routePath || (routePath !== '/' && pathname.startsWith(routePath));
    return isActive ? 'text' : 'textSecondary';
  };

  return (
    <View style={styles.tabListContainerBottom}>
      <ThemedView 
        type="backgroundElement" 
        style={[
          styles.innerContainer, 
          isNarrow && { justifyContent: 'center', flexGrow: 0 }
        ]}
      >
        {!isNarrow && (
          <ThemedText type="smallBold" style={styles.brandText}>
            🚗 CarHub Footer
          </ThemedText>
        )}

        <Link href="/" asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type={getButtonType('/')} style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={getTextColor('/')}>Home</ThemedText>
            </ThemedView>
          </Pressable>
        </Link>

        <Link href="/products" asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type={getButtonType('/products')} style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={getTextColor('/products')}>Products</ThemedText>
            </ThemedView>
          </Pressable>
        </Link>

        <Link href="/add" asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type={getButtonType('/add')} style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={getTextColor('/add')}>Add</ThemedText>
            </ThemedView>
          </Pressable>
        </Link>

        <Link href="/categories" asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type={getButtonType('/categories')} style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={getTextColor('/categories')}>Categories</ThemedText>
            </ThemedView>
          </Pressable>
        </Link>

        {/* Theme Toggle Tab */}
        <Pressable 
          onPress={() => setThemeMode(colorScheme === 'dark' ? 'light' : 'dark')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <ThemedView type="backgroundElement" style={styles.tabButtonView}>
            <ThemedText type="small" themeColor="text">
              {colorScheme === 'dark' ? '☀️' : '🌙'}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </View>
  );
}

interface CustomTabListProps extends TabListProps {
  position?: 'top' | 'bottom';
}

export function CustomTabList({ position = 'top', ...props }: CustomTabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { width } = useWindowDimensions();
  const { colorScheme, setThemeMode } = useThemeMode();
  const isNarrow = width < 600;
  
  const containerStyle = position === 'bottom' ? styles.tabListContainerBottom : styles.tabListContainerTop;

  return (
    <View {...props} style={containerStyle}>
      <ThemedView 
        type="backgroundElement" 
        style={[
          styles.innerContainer, 
          isNarrow && { justifyContent: 'center', flexGrow: 0 }
        ]}
      >
        {!isNarrow && (
          <ThemedText type="smallBold" style={styles.brandText}>
            🚗 CarHub {position === 'bottom' ? 'Footer' : 'Portal'}
          </ThemedText>
        )}

        {props.children}

        {position === 'top' && !isNarrow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            {/* Theme Toggle Web */}
            <TouchableOpacity 
              onPress={() => setThemeMode(colorScheme === 'dark' ? 'light' : 'dark')}
              style={styles.externalPressable}
            >
              <ThemedText type="link">
                {colorScheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </ThemedText>
            </TouchableOpacity>

            <ExternalLink href="https://docs.expo.dev" asChild>
              <Pressable style={styles.externalPressable}>
                <ThemedText type="link">Docs</ThemedText>
                <SymbolView
                  tintColor={colors.text}
                  name={{ ios: 'arrow.up.right.square', web: 'link' }}
                  size={12}
                />
              </Pressable>
            </ExternalLink>
          </View>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  slotContainer: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 80,
  },
  tabListContainerTop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 1000,
  },
  tabListContainerBottom: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 1000,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
