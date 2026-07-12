import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInventory } from '@/context/InventoryContext';
import { TopNavigation } from '@/components/top-navigation';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { cars, sales } = useInventory();

  // Calculations for dashboard metrics
  const availableCars = cars.filter((c) => c.status === 'Available');
  const soldCars = cars.filter((c) => c.status === 'Sold');

  const totalValueAvailable = availableCars.reduce((sum, c) => sum + c.price, 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.sellPrice, 0);

  const themeStyles = {
    container: isDark ? styles.darkContainer : styles.lightContainer,
    cardBg: isDark ? styles.darkCard : styles.lightCard,
    border: isDark ? styles.darkBorder : styles.lightBorder,
    text: isDark ? '#ffffff' : '#111111',
    textSecondary: isDark ? '#b0b4ba' : '#666666',
  };

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : '#f8f9fa'} />
      
      {/* Header */}
      {Platform.OS !== 'web' && <TopNavigation activeTab="home" />}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Welcome Section */}
        <View style={styles.welcomeRow}>
          <Text style={[styles.welcomeTitle, { color: themeStyles.text }]}>Hello Dealer 👋</Text>
          <Text style={[styles.welcomeSub, { color: themeStyles.textSecondary }]}>
            Here is your dealership status for today.
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Card 1: Revenue */}
          <View style={[styles.statCard, themeStyles.cardBg, themeStyles.border]}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.cardEmoji}>💰</Text>
            </View>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={[styles.statValue, { color: '#2E7D32' }]}>
              ${totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.statSub}>{sales.length} Deals Completed</Text>
          </View>

          {/* Card 2: Active Inventory Value */}
          <View style={[styles.statCard, themeStyles.cardBg, themeStyles.border]}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Text style={styles.cardEmoji}>🚗</Text>
            </View>
            <Text style={styles.statLabel}>Active Value</Text>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
              ${totalValueAvailable.toLocaleString()}
            </Text>
            <Text style={styles.statSub}>{availableCars.length} Cars Listed</Text>
          </View>

          {/* Card 3: Available Cars */}
          <View style={[styles.statCard, themeStyles.cardBg, themeStyles.border]}>
            <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.cardEmoji}>🔑</Text>
            </View>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={[styles.statValue, { color: '#1565C0' }]}>
              {availableCars.length}
            </Text>
            <Text style={styles.statSub}>Ready for Sale</Text>
          </View>

          {/* Card 4: Sold Cars */}
          <View style={[styles.statCard, themeStyles.cardBg, themeStyles.border]}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.cardEmoji}>📈</Text>
            </View>
            <Text style={styles.statLabel}>Sold Models</Text>
            <Text style={[styles.statValue, { color: '#EF6C00' }]}>
              {soldCars.length}
            </Text>
            <Text style={styles.statSub}>Dealership Velocity</Text>
          </View>
        </View>

        {/* Quick actions shortcut */}
        <View style={styles.shortcutRow}>
          <TouchableOpacity 
            style={[styles.shortcutBtn, { backgroundColor: '#8B5CF6' }]} 
            onPress={() => router.push('/add')}
          >
            <Text style={styles.shortcutBtnText}>+ Add New Car</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.shortcutBtn, { backgroundColor: isDark ? '#2E3135' : '#e0e1e6' }]} 
            onPress={() => router.push('/products')}
          >
            <Text style={[styles.shortcutBtnText, { color: isDark ? '#fff' : '#333' }]}>View Inventory</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions List */}
        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>Recent Sales</Text>
          <TouchableOpacity onPress={() => router.push('/products')}>
            <Text style={{ color: '#8B5CF6', fontSize: 13, fontWeight: '700' }}>See All</Text>
          </TouchableOpacity>
        </View>

        {sales.length === 0 ? (
          <View style={[styles.emptySalesCard, themeStyles.cardBg, themeStyles.border]}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>📊</Text>
            <Text style={{ color: themeStyles.textSecondary, textAlign: 'center' }}>
              No sales recorded yet. Click &quot;Sell&quot; on any available car in products listing!
            </Text>
          </View>
        ) : (
          <View style={styles.salesList}>
            {sales.slice(0, 4).map((sale) => (
              <View key={sale.id} style={[styles.saleItem, themeStyles.cardBg, themeStyles.border]}>
                <View style={styles.saleIconBg}>
                  <Text style={{ fontSize: 16 }}>🤝</Text>
                </View>
                <View style={styles.saleInfo}>
                  <Text style={[styles.saleCarName, { color: themeStyles.text }]}>{sale.carName}</Text>
                  <Text style={styles.saleDate}>{sale.sellDate}</Text>
                </View>
                <Text style={styles.saleAmount}>+${sale.sellPrice.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f8f9fa',
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  lightBorder: {
    borderColor: '#e9ecef',
  },
  darkBorder: {
    borderColor: '#212225',
  },
  menuButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeRow: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  welcomeSub: {
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  lightCard: {
    backgroundColor: 'white',
  },
  darkCard: {
    backgroundColor: '#161719',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statSub: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  shortcutBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shortcutBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptySalesCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesList: {
    gap: 10,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  saleIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f0f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleCarName: {
    fontSize: 14,
    fontWeight: '700',
  },
  saleDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  saleAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
  },
});
