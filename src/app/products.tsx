import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  useColorScheme,
  Platform,
} from 'react-native';
import { customAlert } from '@/utils/alert';
import { useInventory, Car } from '@/context/InventoryContext';
import { TopNavigation } from '@/components/top-navigation';

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { cars, sellCar, deleteCar } = useInventory();
  
  // State for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Sold'>('All');
  
  // State for Sell Modal
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState('');

  // Filter cars based on search query and status filter
  const filteredCars = cars.filter((car) => {
    const matchesSearch =
      `${car.make} ${car.model} ${car.year}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      car.type.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus =
      statusFilter === 'All' ? true : car.status === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  const handleOpenSellModal = (car: Car) => {
    setSelectedCar(car);
    setSellPriceInput(car.price.toString()); // default to asking price
    setSellModalVisible(true);
  };

  const handleConfirmSell = () => {
    if (!selectedCar) return;
    const price = parseFloat(sellPriceInput);
    if (isNaN(price) || price <= 0) {
      customAlert('Invalid Price', 'Please enter a valid selling price.');
      return;
    }
    sellCar(selectedCar.id, price);
    setSellModalVisible(false);
    setSelectedCar(null);
    setSellPriceInput('');
    customAlert('Car Sold!', `${selectedCar.make} ${selectedCar.model} sold for $${price.toLocaleString()}.`);
  };

  const handleDelete = (car: Car) => {
    customAlert(
      'Delete Car',
      `Are you sure you want to remove this ${car.year} ${car.make} ${car.model} from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCar(car.id),
        },
      ]
    );
  };

  // Theme-aware styles
  const themeStyles = {
    container: isDark ? styles.darkContainer : styles.lightContainer,
    text: isDark ? styles.darkText : styles.lightText,
    cardBg: isDark ? styles.darkCard : styles.lightCard,
    border: isDark ? styles.darkBorder : styles.lightBorder,
    inputBg: isDark ? '#2E3135' : '#f0f0f3',
    inputText: isDark ? '#ffffff' : '#000000',
  };

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : '#f8f9fa'} />
      
      {/* Header */}
      {Platform.OS !== 'web' && <TopNavigation activeTab="products" />}

      {/* Search and Filter panel */}
      <View style={styles.searchAndActionContainer}>
        <View style={[styles.searchBar, { backgroundColor: themeStyles.inputBg }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: themeStyles.inputText }]}
            placeholder="Search make, model, year..."
            placeholderTextColor={isDark ? '#8a8e94' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={true}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Text style={{ color: isDark ? '#8a8e94' : '#999', fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        
        <View style={styles.actionRow}>
          {/* Quick Filters */}
          <View style={styles.filterChips}>
            {(['All', 'Available', 'Sold'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  statusFilter === filter && styles.activeFilterChip,
                  statusFilter !== filter && { backgroundColor: themeStyles.inputBg }
                ]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === filter ? styles.activeFilterChipText : { color: isDark ? '#b0b4ba' : '#60646c' }
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Car Listings ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        {filteredCars.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚗💤</Text>
            <Text style={[styles.emptyText, { color: isDark ? '#8a8e94' : '#666' }]}>
              No cars found matching &quot;{searchQuery}&quot;
            </Text>
          </View>
        ) : (
          filteredCars.map((car) => (
            <View key={car.id} style={[styles.carCard, themeStyles.cardBg, themeStyles.border]}>
              {/* Car Card Header/Meta */}
              <View style={styles.cardHeader}>
                <View style={styles.emojiWrapper}>
                  <Text style={styles.carEmoji}>{car.imageEmoji}</Text>
                </View>
                <View style={styles.titleWrapper}>
                  <Text style={[styles.carBrand, { color: isDark ? '#b0b4ba' : '#666' }]}>
                    {car.make}
                  </Text>
                  <Text style={[styles.carName, { color: isDark ? '#fff' : '#111' }]}>
                    {car.model} <Text style={styles.carYear}>({car.year})</Text>
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  car.status === 'Available' ? styles.badgeAvailable : styles.badgeSold
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    car.status === 'Available' ? styles.statusAvailableText : styles.statusSoldText
                  ]}>
                    {car.status}
                  </Text>
                </View>
              </View>

              {/* Specifications row */}
              <View style={[styles.specsRow, { borderColor: isDark ? '#2E3135' : '#f0f0f3' }]}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Engine</Text>
                  <Text style={[styles.specValue, { color: isDark ? '#fff' : '#333' }]}>{car.engine}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Mileage</Text>
                  <Text style={[styles.specValue, { color: isDark ? '#fff' : '#333' }]}>
                    {car.mileage.toLocaleString()} mi
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Type</Text>
                  <Text style={[styles.specValue, { color: isDark ? '#fff' : '#333' }]}>{car.type}</Text>
                </View>
              </View>

              {/* Pricing & Action Area */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.priceLabel}>
                    {car.status === 'Sold' ? 'Sold Price' : 'Asking Price'}
                  </Text>
                  <Text style={styles.priceValue}>
                    ${(car.status === 'Sold' && car.sellPrice ? car.sellPrice : car.price).toLocaleString()}
                  </Text>
                  {car.status === 'Sold' && car.sellDate && (
                    <Text style={[styles.soldDateText, { color: isDark ? '#8a8e94' : '#888' }]}>
                      on {car.sellDate}
                    </Text>
                  )}
                </View>

                <View style={styles.cardActions}>
                  {car.status === 'Available' ? (
                    <>
                      <TouchableOpacity
                        style={styles.sellButton}
                        onPress={() => handleOpenSellModal(car)}
                      >
                        <Text style={styles.sellButtonText}>Sell 💰</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(car)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.deleteButton, { opacity: 0.8 }]}
                      onPress={() => handleDelete(car)}
                    >
                      <Text style={styles.deleteButtonText}>Delete History</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Selling Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sellModalVisible}
        onRequestClose={() => setSellModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#212225' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#333' }]}>Record Car Sale</Text>
            {selectedCar && (
              <Text style={[styles.modalCarName, { color: isDark ? '#b0b4ba' : '#666' }]}>
                {selectedCar.year} {selectedCar.make} {selectedCar.model}
              </Text>
            )}

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Final Selling Price ($)</Text>
              <TextInput
                style={[styles.modalInput, { 
                  borderColor: isDark ? '#2E3135' : '#ddd',
                  color: isDark ? '#fff' : '#000',
                  backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                }]}
                keyboardType="numeric"
                value={sellPriceInput}
                onChangeText={setSellPriceInput}
                placeholder="Enter selling price"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                autoFocus={true}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: isDark ? '#2e3135' : '#f0f0f0' }]}
                onPress={() => setSellModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? '#fff' : '#333' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmSell}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirm Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  lightText: {
    color: '#000000',
  },
  darkText: {
    color: '#ffffff',
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
  menuIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6', // Purple signature
    letterSpacing: 0.5,
  },
  profileButton: {
    width: 34,
    height: 34,
    backgroundColor: '#8B5CF6',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  profileIcon: {
    fontSize: 16,
    color: 'white',
  },
  searchAndActionContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearSearch: {
    padding: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeFilterChip: {
    backgroundColor: '#8B5CF6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilterChipText: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Safe inset for bottom menu
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  carCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
  },
  emojiWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  carEmoji: {
    fontSize: 22,
  },
  titleWrapper: {
    flex: 1,
  },
  carBrand: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  carName: {
    fontSize: 16,
    fontWeight: '700',
  },
  carYear: {
    fontWeight: '400',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeAvailable: {
    backgroundColor: '#E8F5E9',
  },
  badgeSold: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusAvailableText: {
    color: '#2E7D32',
  },
  statusSoldText: {
    color: '#C62828',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  soldDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sellButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sellButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#f0f0f3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d32f2f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalCarName: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalBtnConfirm: {
    backgroundColor: '#8B5CF6',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
