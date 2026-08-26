// ============================================================
// app-tabs.web.tsx — Navigation หลักสำหรับ Web platform
// ============================================================
// ไฟล์นี้ใช้แทน app-tabs.tsx เฉพาะบน Web (Expo platform-specific)
// ใช้ expo-router/ui: Tabs, TabList, TabTrigger, TabSlot
//
// โครงสร้าง:
//   AppTabs           ← root component: ครอบ Tabs + TabSlot + TabList
//     ├── TabSlot     ← พื้นที่แสดงหน้าปัจจุบัน (content area)
//     ├── CustomTabList (top)    ← แถบ navigation บนสุด
//     └── WebFooterNav          ← แถบ navigation ล่างสุด
//
// ⚠️ สำคัญ: ทุก route ที่ต้องการนำทางถึงต้องลงทะเบียนเป็น TabTrigger
//   ใน TabList ก่อน มิฉะนั้น TabSlot จะไม่ render หน้านั้น
//   (login/register ก็ต้องลงทะเบียนแม้จะไม่ได้แสดงในเมนูปกติ)
//
// RBAC ใน Navigation:
//   - ปุ่ม "Add" แสดงเฉพาะ isAdmin = true
//   - ปุ่ม "Login" แสดงเฉพาะ user = null (ยังไม่ได้ login)
//   - ปุ่ม "Logout" แสดงเฉพาะ user != null (login แล้ว)
// ============================================================

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
import { useAuth } from '@/context/AuthContext'; // ดึง user/isAdmin สำหรับ RBAC
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
          {/* Add — Admin only */}
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

          {/* Orders tab — Logged in users */}
          {user && (
            <TabTrigger name="orders" href="/orders" asChild>
              <TabButton>{isAdmin ? '📋 Orders' : '📦 My Orders'}</TabButton>
            </TabTrigger>
          )}

          {/* Login tab — แสดงเมื่อยังไม่ login เพื่อให้ Expo TabSlot รู้จักเส้นทาง */}
          {!user && (
            <TabTrigger name="login" href="/login" asChild>
              <TabButton>🔑 Login</TabButton>
            </TabTrigger>
          )}

          {/* Register tab trigger ซ่อนไว้เพื่อให้ Slot route ได้ */}
          <TabTrigger name="register" href="/register" asChild style={{ display: 'none' }}>
            <TabButton>Register</TabButton>
          </TabTrigger>

          {/* Orders trigger ซ่อนไว้ เมื่อยังไม่ได้ login เพื่อให้ Slot render หน้าได้เสมอ */}
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

        {/* Add — Admin only */}
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

        {/* Orders link if logged in */}
        {user && (
          <Link href="/orders" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={getButtonType('/orders')} style={styles.tabButtonView}>
                <ThemedText type="small" themeColor={getTextColor('/orders')}>{isAdmin ? 'Orders' : 'My Orders'}</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}

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

        {/* Login Tab if not logged in */}
        {!user && (
          <Link href="/login" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type={getButtonType('/login')} style={styles.tabButtonView}>
                <ThemedText type="small" themeColor={getTextColor('/login')}>🔑 Login</ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}

        {/* User Info + Logout */}
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

            {/* User Info */}
            {user && (
              <ThemedText type="small" themeColor="textSecondary">
                {user.role === 'admin' ? '👑' : '👤'} {user.username}
              </ThemedText>
            )}

            {/* Logout Button */}
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
    paddingTop: 80,
    paddingBottom: 80,
  },
  tabListContainerTop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
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
    gap: Spacing.two,
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
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
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
