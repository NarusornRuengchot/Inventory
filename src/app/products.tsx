import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { customAlert } from '@/utils/alert';
import { useInventory, Car } from '@/context/InventoryContext';

// Import local JSON fallback
import localProducts from '../../products.json';

// Raw GitHub URL as requested in Slide 11
// Replace USERNAME/REPOSITORY with the actual GitHub details when pushing
const PRODUCTS_URL = 'https://raw.githubusercontent.com/USERNAME/REPOSITORY/main/products.json';

interface Product {
  id: string;
  name: string;
  stock: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
  originalCar: Car; // reference back to inventory context object
}

function getImageUrlForEmoji(emoji: string): string {
  if (emoji === '⚡') return 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=400&q=80';
  if (emoji === '🏁') return 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80';
  if (emoji === '🏎️') return 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80';
  if (emoji === '🔋') return 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=400&q=80';
  if (emoji === '⛰️') return 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=400&q=80';
  if (emoji === '🇯🇵') return 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=400&q=80';
  return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80';
}

function deriveProductFromCar(car: Car): Product {
  const isAvailable = car.status === 'Available';
  return {
    id: car.id,
    name: car.name || `${car.make} ${car.model} (${car.year})`,
    stock: car.stock !== undefined ? car.stock : (isAvailable ? 1 : 0),
    stock_text: car.stock_text || (isAvailable ? '1 in stock' : 'Out of stock'),
    category: car.category || car.type,
    location_count: car.location_count !== undefined ? car.location_count : (isAvailable ? 1 : 0),
    location_text: car.location_text || (isAvailable ? '1 showroom' : '0 showrooms'),
    badge_status: car.status === 'Sold' ? 'Low in stock' : (car.badge_status || 'Active'),
    image_url: car.image_url || getImageUrlForEmoji(car.imageEmoji),
    originalCar: car,
  };
}

export default function ProductsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { cars, setCars, sellCar, deleteCar } = useInventory();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Low in stock'>('All');

  // State for Sell Modal
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState('');

  // Fetch product data from GitHub with local fallback and sync with context
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(PRODUCTS_URL);
        let fetchedData: Car[] = [];
        if (response.ok) {
          fetchedData = await response.json();
        } else {
          fetchedData = localProducts as Car[];
        }

        // Merge fetched cars into Context state to maintain consistency and keep user adjustments
        setCars((currentCars) => {
          const merged = [...currentCars];
          fetchedData.forEach((fetchedCar) => {
            const index = merged.findIndex((c) => c.id === fetchedCar.id);
            if (index > -1) {
              // Retain user local edits like 'status', 'sellPrice', 'sellDate' and preserve original properties
              merged[index] = {
                ...merged[index],
                ...fetchedCar,
                status: merged[index].status,
                sellPrice: merged[index].sellPrice,
                sellDate: merged[index].sellDate,
              };
            } else {
              merged.push(fetchedCar);
            }
          });
          return merged;
        });
      } catch (error) {
        console.warn('Could not fetch products from GitHub, using local fallback:', error);
        // Fallback merge
        setCars((currentCars) => {
          const merged = [...currentCars];
          (localProducts as Car[]).forEach((fetchedCar) => {
            const index = merged.findIndex((c) => c.id === fetchedCar.id);
            if (index > -1) {
              merged[index] = {
                ...merged[index],
                ...fetchedCar,
                status: merged[index].status,
                sellPrice: merged[index].sellPrice,
                sellDate: merged[index].sellDate,
              };
            } else {
              merged.push(fetchedCar);
            }
          });
          return merged;
        });
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Map all context cars to product schema
  const products = cars.map(deriveProductFromCar);

  // Filter products based on search query and status filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' ? true : product.badge_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleProductPress = (product: Product) => {
    const car = product.originalCar;
    if (car.status === 'Available') {
      customAlert(
        product.name,
        `Category: ${product.category}\nStock: ${product.stock_text}\nLocation: ${product.location_text}\nPrice: $${(car.price ?? 0).toLocaleString()}\nStatus: ${car.status}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sell 💰', onPress: () => handleOpenSellModal(car) },
          { text: 'Delete 🗑️', style: 'destructive', onPress: () => handleDelete(car) }
        ]
      );
    } else {
      customAlert(
        product.name,
        `Category: ${product.category}\nStock: ${product.stock_text}\nLocation: ${product.location_text}\nSold Price: $${(car.sellPrice ?? car.price ?? 0).toLocaleString()}\nSold Date: ${car.sellDate ?? 'N/A'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete History 🗑️', style: 'destructive', onPress: () => handleDelete(car) }
        ]
      );
    }
  };

  const handleOpenSellModal = (car: Car) => {
    setSelectedCar(car);
    setSellPriceInput(car.price.toString());
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

  const handleAddProduct = () => {
    router.push('/add');
  };

  const toggleFilter = () => {
    // Cycles filter status
    if (statusFilter === 'All') setStatusFilter('Active');
    else if (statusFilter === 'Active') setStatusFilter('Low in stock');
    else setStatusFilter('All');
  };

  // Theme colors
  const theme = {
    container: isDark ? styles.darkContainer : styles.lightContainer,
    cardBg: isDark ? styles.darkCard : styles.lightCard,
    border: isDark ? styles.darkBorder : styles.lightBorder,
    text: isDark ? styles.darkText : styles.lightText,
    textSecondary: isDark ? styles.darkTextSecondary : styles.lightTextSecondary,
    inputBg: isDark ? '#2A2C30' : '#F0F0F3',
    inputText: isDark ? '#FFFFFF' : '#000000',
    headerBg: isDark ? '#161719' : '#FFFFFF',
  };

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      {/* Slide 3: Header Component */}
      <View style={[styles.header, theme.border, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity style={styles.headerButton}>
          <Text style={[styles.headerIcon, { color: theme.text.color }]}>☰</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text.color }]}>Car Inventory</Text>

        <TouchableOpacity style={styles.profileButton}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Slide 3: Action Bar */}
      <View style={styles.actionBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.inputText }]}
            placeholder="Search cars..."
            placeholderTextColor={isDark ? '#8A8E94' : '#999999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Text style={{ color: isDark ? '#8A8E94' : '#999999', fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.addProductButton} onPress={handleAddProduct}>
          <Text style={styles.addProductText}>+ Add Product</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.filterButton, 
            statusFilter !== 'All' && styles.filterButtonActive,
            { backgroundColor: statusFilter !== 'All' ? '#8B5CF6' : theme.inputBg }
          ]} 
          onPress={toggleFilter}
        >
          <Text style={[
            styles.filterButtonText, 
            { color: statusFilter !== 'All' ? '#FFFFFF' : theme.text.color }
          ]}>
            Filter{statusFilter !== 'All' ? `: ${statusFilter}` : ''} ▽
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slide 3: Product List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, theme.textSecondary]}>No products found 📦</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredProducts.map((product) => {
            const isActive = product.badge_status === 'Active';
            
            return (
              <TouchableOpacity
                key={product.id}
                style={[styles.productCard, theme.cardBg, theme.border]}
                onPress={() => handleProductPress(product)}
                activeOpacity={0.8}
              >
                {/* Left Side: Product Image & Name */}
                <View style={styles.leftColumn}>
                  <Image
                    source={{ uri: product.image_url }}
                    style={styles.productImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <Text style={[styles.productName, theme.text]} numberOfLines={2}>
                    {product.name}
                  </Text>
                </View>

                {/* Right Side: Details & Badge Status */}
                <View style={styles.rightColumn}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, theme.textSecondary]}>Stock:</Text>
                    <Text style={[styles.detailValue, theme.text]}>{product.stock_text}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, theme.textSecondary]}>Category:</Text>
                    <Text style={[styles.detailValue, theme.text]}>{product.category}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, theme.textSecondary]}>Location:</Text>
                    <Text style={[styles.detailValue, theme.text]}>{product.location_text}</Text>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={[
                      styles.statusBadge,
                      isActive ? styles.badgeActive : styles.badgeLowStock
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        isActive ? styles.statusActiveText : styles.statusLowStockText
                      ]}>
                        {product.badge_status}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.arrowButton}
                      onPress={() => handleProductPress(product)}
                    >
                      <Text style={styles.arrowButtonText}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

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
    backgroundColor: '#F8F9FA',
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // inset for bottom tab nav
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  addProductButton: {
    backgroundColor: '#8B5CF6',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProductText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterButton: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lightCard: {
    backgroundColor: '#FFFFFF',
  },
  darkCard: {
    backgroundColor: '#161719',
  },
  lightBorder: {
    borderColor: '#E9ECEF',
  },
  darkBorder: {
    borderColor: '#212225',
  },
  leftColumn: {
    width: 110,
    alignItems: 'center',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 75,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeLowStock: {
    backgroundColor: '#EAE8FF',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#2E7D32',
  },
  statusLowStockText: {
    color: '#4F46E5',
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
    marginTop: -2,
  },
  lightText: {
    color: '#000000',
  },
  darkText: {
    color: '#FFFFFF',
  },
  lightTextSecondary: {
    color: '#666666',
  },
  darkTextSecondary: {
    color: '#B0B4BA',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
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
