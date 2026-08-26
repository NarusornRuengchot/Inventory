// ============================================================
// AuthContext.tsx — ระบบจัดการ Authentication (Login/Logout)
// ============================================================
// ให้บริการ: user, token, isAdmin, login(), register(), logout()
// เชื่อมต่อ: POST /api/auth/login  → login()
//            POST /api/auth/register → register()
//            GET  /api/auth/me      → restoreSession() (auto-login)
// Storage:   AsyncStorage ('auth_token') รองรับทั้ง Web และ Native
// ใช้งานใน: ทุก component ที่ต้องรู้ว่า login อยู่มั้ย หรือ role คืออะไร
// ============================================================

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL ของ Backend API (เปลี่ยนที่นี่ที่เดียวถ้า server เปลี่ยน)
const API_BASE_URL = 'http://119.59.102.161:3024/api';

// ─────────────────────────────────────────
// Types — โครงสร้างข้อมูล User
// ─────────────────────────────────────────
export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: AuthUser | null;       // null = ยังไม่ได้ login
  token: string | null;        // JWT token สำหรับแนบใน Authorization header
  isLoading: boolean;          // true ระหว่างตรวจสอบ session ตอน app เปิด
  isAdmin: boolean;            // shorthand: user?.role === 'admin'
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─────────────────────────────────────────
// Context — สร้าง React Context สำหรับ Auth
// ─────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'auth_token';  // key ที่ใช้เก็บ token ใน AsyncStorage

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);  // เริ่มต้น true เพื่อรอ restore session

  // shorthand: true ถ้า login แล้วและเป็น admin
  const isAdmin = user?.role === 'admin';

  // ─── Auto-login: โหลด token จาก AsyncStorage เมื่อ app เปิด ───
  // Flow: อ่าน token → ส่งไป GET /api/auth/me → ถ้าผ่าน = restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          setIsLoading(false);  // ไม่มี token = guest mode
          return;
        }

        // ตรวจสอบ token กับ backend ว่ายังใช้ได้อยู่ไหม
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setToken(storedToken);
          setUser(data.user);  // restore user state โดยไม่ต้อง login ใหม่
        } else {
          // Token หมดอายุหรือไม่ valid ให้ลบออก
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Failed to restore session:', error);
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setIsLoading(false);  // ตรวจสอบเสร็จแล้ว ไม่ว่าจะ success หรือ fail
      }
    }

    restoreSession();
  }, []);

  // ─── Login ───
  // ส่ง username/password → รับ token + user กลับมา → เก็บใน AsyncStorage
  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);  // เก็บ token ถาวร
    setToken(data.token);
    setUser(data.user);
  };

  // ─── Register ───
  // สมัครสมาชิกแล้ว login อัตโนมัติ (role = 'user' เสมอ)
  const register = async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  // ─── Logout ───
  // ลบ token จาก storage และล้าง state → app กลับสู่ guest mode
  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────
// Hook: useAuth()
// วิธีใช้: const { user, isAdmin, login, logout } = useAuth();
// ต้องอยู่ภายใต้ <AuthProvider> เสมอ (จัดการใน _layout.tsx)
// ─────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
