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

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    accent: '#6366f1',
    danger: isDark ? '#ff6b6b' : '#dc2626',
    dangerBg: isDark ? '#2d1515' : '#fef2f2',
    success: isDark ? '#4ade80' : '#16a34a',
    successBg: isDark ? '#0f2d1e' : '#f0fdf4',
  };

  const handleRegister = async () => {
    setError('');
    if (!username.trim()) {
      setError('กรุณากรอก Username');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username ต้องมีอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (password.length < 6) {
      setError('Password ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password ไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      await register(username.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'สมัครสมาชิกไม่สำเร็จ');
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
          {/* Back Button */}
          <TouchableOpacity
            id="go-back-to-login"
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: theme.accent }]}>← กลับ</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={[styles.logoContainer, { backgroundColor: '#10b981' }]}>
              <Text style={styles.logoEmoji}>✨</Text>
            </View>
            <Text style={[styles.appTitle, { color: theme.text }]}>สมัครสมาชิก</Text>
            <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
              สร้างบัญชีผู้ใช้ใหม่
            </Text>
          </View>

          {/* Role Info */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#0f2520' : '#f0fdf4', borderColor: isDark ? '#1a4a30' : '#bbf7d0' }]}>
            <Text style={[styles.infoTitle, { color: theme.success }]}>👤 Role: User</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              บัญชีที่สมัครจะมีสิทธิ์เป็น User สามารถดูและซื้อรถได้
            </Text>
          </View>

          {/* Register Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                shadowColor: isDark ? '#10b981' : '#000',
              },
            ]}
          >
            {/* Error */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  id="register-username"
                  style={[styles.input, { color: theme.text }]}
                  placeholder="อย่างน้อย 3 ตัวอักษร"
                  placeholderTextColor={theme.textSecondary}
                  value={username}
                  onChangeText={(t) => { setUsername(t); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  id="register-password"
                  style={[styles.input, { color: theme.text }]}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  id="toggle-register-password"
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                >
                  <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>ยืนยัน Password</Text>
              <View style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: confirmPassword && confirmPassword !== password
                    ? theme.danger
                    : theme.inputBorder,
                }
              ]}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  id="register-confirm-password"
                  style={[styles.input, { color: theme.text }]}
                  placeholder="กรอก password อีกครั้ง"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                {confirmPassword.length > 0 && (
                  <Text style={{ fontSize: 16 }}>
                    {confirmPassword === password ? '✅' : '❌'}
                  </Text>
                )}
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              id="register-submit-button"
              style={[
                styles.registerButton,
                { backgroundColor: '#10b981' },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>สมัครสมาชิก</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              id="go-to-login"
              onPress={() => router.back()}
              style={styles.loginLink}
            >
              <Text style={[styles.loginLinkText, { color: theme.textSecondary }]}>
                มีบัญชีแล้ว?{' '}
                <Text style={{ color: theme.accent, fontWeight: '700' }}>เข้าสู่ระบบ</Text>
              </Text>
            </TouchableOpacity>
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
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    gap: 14,
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
  registerButton: {
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
