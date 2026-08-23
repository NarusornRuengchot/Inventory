import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const theme = {
    bg: isDark ? '#0a0a0f' : '#f0f2f8',
    card: isDark ? '#12121a' : '#ffffff',
    cardBorder: isDark ? '#1e1e2e' : '#e2e8f0',
    text: isDark ? '#f0f0ff' : '#0f0f1a',
    textSecondary: isDark ? '#8888aa' : '#64748b',
    inputBg: isDark ? '#1a1a28' : '#f8fafc',
    inputBorder: isDark ? '#2a2a3e' : '#cbd5e1',
    inputFocus: '#6366f1',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    danger: isDark ? '#ff6b6b' : '#dc2626',
    dangerBg: isDark ? '#2d1515' : '#fef2f2',
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอก Username และ Password');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Header */}
          <View style={styles.headerSection}>
            <View style={[styles.logoContainer, { backgroundColor: theme.accent }]}>
              <Text style={styles.logoEmoji}>🚗</Text>
            </View>
            <Text style={[styles.appTitle, { color: theme.text }]}>CarHub</Text>
            <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
              ระบบจัดการรถยนต์มือสอง
            </Text>
          </View>

          {/* Login Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                shadowColor: isDark ? '#6366f1' : '#000',
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>เข้าสู่ระบบ</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              ยินดีต้อนรับกลับมา 👋
            </Text>

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  id="login-username"
                  style={[styles.input, { color: theme.text }]}
                  placeholder="กรอก username"
                  placeholderTextColor={theme.textSecondary}
                  value={username}
                  onChangeText={(t) => { setUsername(t); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  id="login-password"
                  style={[styles.input, { color: theme.text }]}
                  placeholder="กรอก password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  id="toggle-password-visibility"
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                >
                  <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              id="login-submit-button"
              style={[
                styles.loginButton,
                { backgroundColor: theme.accent },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>หรือ</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            </View>

            {/* Register Link */}
            <TouchableOpacity
              id="go-to-register"
              style={[styles.registerButton, { borderColor: theme.inputBorder }]}
              onPress={() => router.push('/register')}
              activeOpacity={0.8}
            >
              <Text style={[styles.registerButtonText, { color: theme.text }]}>
                ยังไม่มีบัญชี?{' '}
                <Text style={{ color: theme.accent, fontWeight: '700' }}>สมัครสมาชิก</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Default Credentials Hint */}
          <View style={[styles.hintBox, { backgroundColor: isDark ? '#1a1a28' : '#eef2ff', borderColor: isDark ? '#2a2a4e' : '#c7d2fe' }]}>
            <Text style={[styles.hintTitle, { color: theme.accent }]}>🔑 บัญชีเริ่มต้น (Admin)</Text>
            <Text style={[styles.hintText, { color: theme.textSecondary }]}>Username: admin</Text>
            <Text style={[styles.hintText, { color: theme.textSecondary }]}>Password: admin123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    gap: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: -8,
  },
  errorBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 50,
    gap: 8,
  },
  inputIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  registerButton: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hintBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  hintText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
