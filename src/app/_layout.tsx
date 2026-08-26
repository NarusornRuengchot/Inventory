// ============================================================
// _layout.tsx — Root Layout ของแอป
// ============================================================
// จัดการ Provider ทั้งหมดที่ครอบ component tree
// ลำดับการ nest (สำคัญมาก — ต้อง nest ถูกลำดับ):
//
//   ThemeModeProvider    ← จัดการ dark/light mode (global)
//     └── AuthProvider   ← จัดการ login state และ JWT token
//           └── ThemeProvider (expo-router)
//                 └── InventoryProvider  ← จัดการข้อมูลรถ (ใช้ token จาก AuthProvider)
//                       └── AnimatedSplashOverlay
//                             └── AppTabs  ← ตัว navigation หลัก
//
// หมายเหตุ: InventoryProvider อยู่ใต้ AuthProvider
//           เพื่อให้ดึง token ผ่าน useAuth() ได้
// ============================================================

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

import { InventoryProvider } from '@/context/InventoryContext';
import { ThemeModeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

// ป้องกัน splash screen หายก่อนที่ font จะโหลดเสร็จ
SplashScreen.preventAutoHideAsync();

// Root component — ครอบด้วย ThemeModeProvider + AuthProvider ก่อน
export default function TabLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <TabLayoutContent />
      </AuthProvider>
    </ThemeModeProvider>
  );
}

// แยก TabLayoutContent ออกมาเพื่อให้ useColorScheme() ทำงานได้ภายใต้ Provider
function TabLayoutContent() {
  const colorScheme = useColorScheme();
  return (
    // ThemeProvider ของ expo-router (ใช้กับ DarkTheme/DefaultTheme)
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* InventoryProvider อยู่ใต้ AuthProvider เพื่อดึง token ได้ */}
      <InventoryProvider>
        <AnimatedSplashOverlay />  {/* แสดง splash screen animation ตอนเปิดแอป */}
        <AppTabs />               {/* Navigation หลัก (Tabs) */}
      </InventoryProvider>
    </ThemeProvider>
  );
}
