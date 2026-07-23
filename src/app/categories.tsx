import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { useInventory } from '@/context/InventoryContext';
import { TopNavigation } from '@/components/top-navigation';

export default function CategoriesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { cars } = useInventory();

  // Group by Brand
  const brandStats = cars.reduce((acc, car) => {
    if (!acc[car.brand]) {
      acc[car.brand] = { count: 0, totalValue: 0, available: 0, sold: 0, emoji: car.image_emoji || '🚗' };
    }
    acc[car.brand].count += 1;
    acc[car.brand].totalValue += car.selling_price;
    if (car.status === 'Available') {
      acc[car.brand].available += 1;
    } else if (car.status === 'Sold') {
      acc[car.brand].sold += 1;
    }
    return acc;
  }, {} as Record<string, { count: number; totalValue: number; available: number; sold: number; emoji: string }>);

  // Group by Fuel Type
  const fuelStats = cars.reduce((acc, car) => {
    const category = car.fuel_type || 'Gasoline';
    if (!acc[category]) {
      acc[category] = { count: 0, totalValue: 0, available: 0, sold: 0 };
    }
    acc[category].count += 1;
    acc[category].totalValue += car.selling_price;
    if (car.status === 'Available') {
      acc[category].available += 1;
    } else if (car.status === 'Sold') {
      acc[category].sold += 1;
    }
    return acc;
  }, {} as Record<string, { count: number; totalValue: number; available: number; sold: number }>);

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
      {Platform.OS !== 'web' && <TopNavigation activeTab="categories" />}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section: By Brand */}
        <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>Brands Overview</Text>
        
        <View style={styles.grid}>
          {Object.entries(brandStats).map(([brand, stat]) => (
            <View key={brand} style={[styles.card, themeStyles.cardBg, themeStyles.border]}>
              <View style={styles.cardHeader}>
                <View style={styles.emojiCircle}>
                  <Text style={styles.emojiText}>{stat.emoji}</Text>
                </View>
                <Text style={[styles.brandName, { color: themeStyles.text }]} numberOfLines={1}>{brand}</Text>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={[styles.statValue, { color: themeStyles.text }]}>{stat.count}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avail</Text>
                  <Text style={[styles.statValue, { color: '#2E7D32' }]}>{stat.available}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sold</Text>
                  <Text style={[styles.statValue, { color: '#C62828' }]}>{stat.sold}</Text>
                </View>
              </View>

              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Listed Value</Text>
                <Text style={styles.valueText}>${stat.totalValue.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section: Fuel Types */}
        <Text style={[styles.sectionTitle, { color: themeStyles.text, marginTop: 24 }]}>Fuel Types</Text>
        
        <View style={styles.typeList}>
          {Object.entries(fuelStats).map(([type, stat]) => {
            const progress = stat.count > 0 ? (stat.available / stat.count) * 100 : 0;
            return (
              <View key={type} style={[styles.typeCard, themeStyles.cardBg, themeStyles.border]}>
                <View style={styles.typeCardHeader}>
                  <Text style={[styles.typeName, { color: themeStyles.text }]}>{type}</Text>
                  <Text style={[styles.typeCount, { color: '#8B5CF6' }]}>
                    {stat.count} {stat.count === 1 ? 'car' : 'cars'}
                  </Text>
                </View>

                {/* Progress bar represent available vs sold */}
                <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#2E3135' : '#f0f0f3' }]}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>

                <View style={styles.typeStatsFooter}>
                  <Text style={[styles.typeFooterText, { color: themeStyles.textSecondary }]}>
                    {stat.available} Available / {stat.sold} Sold
                  </Text>
                  <Text style={[styles.typeFooterValText, { color: themeStyles.text }]}>
                    ${stat.totalValue.toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
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
  lightBorder: {
    borderColor: '#e9ecef',
  },
  darkBorder: {
    borderColor: '#212225',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  emojiCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 14,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f3',
    paddingBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    color: '#888',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'column',
  },
  valueLabel: {
    fontSize: 9,
    color: '#888',
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  typeList: {
    gap: 12,
  },
  typeCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  typeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  typeCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  typeStatsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeFooterText: {
    fontSize: 11,
  },
  typeFooterValText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
