import { Link, usePathname } from 'expo-router';
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TouchableOpacity, useColorScheme, useWindowDimensions, View } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();
  const { isAdmin, user } = useAuth();

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
          {isAdmin && (
            <TabTrigger name="add" href="/add" asChild>
              <TabButton>Add</TabButton>
            </TabTrigger>
          )}
          <TabTrigger name="products" href="/products" asChild>
            <TabButton>Products</TabButton>
          </TabTrigger>
          <TabTrigger name="categories" href="/categories" asChild>
            <TabButton>Categories</TabButton>
          </TabTrigger>

          {user && (
            <TabTrigger name="orders" href="/orders" asChild>
              <TabButton>{isAdmin ? '📋 Orders' : '📦 My Orders'}</TabButton>
            </TabTrigger>
          )}

          {!user && (
            <TabTrigger name="login" href="/login" asChild>
              <TabButton>🔑 Login</TabButton>
            </TabTrigger>
          )}

          <TabTrigger name="register" href="/register" asChild style={{ display: 'none' }}>
            <TabButton>Register</TabButton>
          </TabTrigger>

          {!user && (
            <TabTrigger name="orders" href="/orders" asChild style={{ display: 'none' }}>
              <TabButton>Orders</TabButton>
            </TabTrigger>
          )}
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
  const { isAdmin, user, logout } = useAuth();
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

        {isAdmin && (
          <Link href="/add" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={getButtonType('/add')} style={styles.tabButtonView}>
                <ThemedText type="small" themeColor={getTextColor('/add')}>Add</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}

        <Link href="/products" asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type={getButtonType('/products')} style={styles.tabButtonView}>
              <ThemedText type="small" themeColor={getTextColor('/products')}>Products</ThemedText>
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

        {user && (
          <Link href="/orders" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={getButtonType('/orders')} style={styles.tabButtonView}>
                <ThemedText type="small" themeColor={getTextColor('/orders')}>{isAdmin ? 'Orders' : 'My Orders'}</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}

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

        {!user && (
          <Link href="/login" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={getButtonType('/login')} style={styles.tabButtonView}>
                <ThemedText type="small" themeColor={getTextColor('/login')}>🔑 Login</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}

        {user && (
          <>
            {!isNarrow && (
              <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 4 }}>
                {user.role === 'admin' ? '👑' : '👤'} {user.username}
              </ThemedText>
            )}
            <TouchableOpacity
              id="footer-logout-button"
              onPress={logout}
              style={styles.logoutButton}
            >
              <ThemedText type="small" style={{ color: '#ef4444', fontWeight: '600' }}>Logout</ThemedText>
            </TouchableOpacity>
          </>
        )}
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
  const { user, logout } = useAuth();
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

            {user && (
              <ThemedText type="small" themeColor="textSecondary">
                {user.role === 'admin' ? '👑' : '👤'} {user.username}
              </ThemedText>
            )}

            {user && (
              <TouchableOpacity
                id="top-logout-button"
                onPress={logout}
                style={[styles.externalPressable, styles.logoutButtonTop]}
              >
                <ThemedText type="small" style={{ color: '#ef4444', fontWeight: '600' }}>Logout</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  slotContainer: {
    flex: 1,
    paddingTop: 110,
    paddingBottom: 64,
  },
  tabListContainerTop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  tabListContainerBottom: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.four,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    maxWidth: MaxContentWidth,
    flexWrap: 'wrap',
  },
  brandText: {
    marginRight: Spacing.two,
    marginLeft: Spacing.one,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
  logoutButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonTop: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
});
