import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme, Platform } from 'react-native';
import { useRouter } from 'expo-router';

interface TopNavigationProps {
  activeTab: 'home' | 'products' | 'add' | 'categories';
  rightIcon?: string;
}

export function TopNavigation({ activeTab, rightIcon = '👤' }: TopNavigationProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Do not render on Web to avoid duplicating top navigation
  if (Platform.OS === 'web') {
    return null;
  }

  const themeStyles = {
    border: isDark ? styles.darkBorder : styles.lightBorder,
    text: isDark ? '#ffffff' : '#111111',
    textSecondary: isDark ? '#b0b4ba' : '#666666',
  };

  return (
    <View style={[styles.header, themeStyles.border, { backgroundColor: isDark ? '#161719' : 'white' }]}>
      <View style={styles.topRow}>
        <Text style={styles.headerTitle}>🚗 CarHub Portal</Text>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/products')}>
          <Text style={styles.profileIcon}>{rightIcon}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'home' ? styles.activeText : { color: themeStyles.textSecondary }]}>
            Home
          </Text>
          {activeTab === 'home' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/products')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'products' ? styles.activeText : { color: themeStyles.textSecondary }]}>
            Products
          </Text>
          {activeTab === 'products' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/add')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'add' ? styles.activeText : { color: themeStyles.textSecondary }]}>
            Add
          </Text>
          {activeTab === 'add' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/categories')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'categories' ? styles.activeText : { color: themeStyles.textSecondary }]}>
            Categories
          </Text>
          {activeTab === 'categories' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  lightBorder: {
    borderColor: '#e9ecef',
  },
  darkBorder: {
    borderColor: '#212225',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  profileButton: {
    width: 34,
    height: 34,
    backgroundColor: '#8B5CF6',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 16,
    color: 'white',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  navText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeText: {
    color: '#8B5CF6',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8B5CF6',
  },
});
