import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Car, useInventory } from '@/context/InventoryContext';
import { customAlert } from '@/utils/alert';

interface Product {
  id: string;
  name: string;
  stock_text: string;
  category: string;
  location_text: string;
  badge_status: Car['status'];
  image_url: string;
  originalCar: Car;
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
  return {
    id: car.car_id.toString(),
    name: `${car.brand} ${car.model} (${car.model_year})`,
    stock_text: car.status === 'Available' ? 'Ready' : car.status,
    category: `${car.fuel_type} / ${car.transmission}`,
    location_text: car.license_plate,
    badge_status: car.status,
    image_url: car.image_url || getImageUrlForEmoji(car.image_emoji || ''),
    originalCar: car,
  };
}

export default function ProductsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { cars, sellCar, deleteCar, updateCar, loading } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Car['status']>('All');

  // State for Sell Modal
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState('');

  // State for Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  // Edit fields
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editModelYear, setEditModelYear] = useState('');
  const [editVin, setEditVin] = useState('');
  const [editLicensePlate, setEditLicensePlate] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editMileage, setEditMileage] = useState('');
  const [editTransmission, setEditTransmission] = useState<Car['transmission']>('Auto');
  const [editFuelType, setEditFuelType] = useState<Car['fuel_type']>('Gasoline');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editStatus, setEditStatus] = useState<Car['status']>('Available');
  const [editNotes, setEditNotes] = useState('');

  // Map all context cars to product schema
  const products = cars.map(deriveProductFromCar);

  // Filter products based on search query and status filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.originalCar.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.originalCar.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.originalCar.color.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' ? true : product.badge_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleProductPress = (product: Product) => {
    const car = product.originalCar;
    const details = [
      `VIN: ${car.vin}`,
      `Plate: ${car.license_plate}`,
      `Color: ${car.color}`,
      `Mileage: ${car.mileage.toLocaleString()} km`,
      `Transmission: ${car.transmission}`,
      `Fuel Type: ${car.fuel_type}`,
      `Purchase Cost: $${car.purchase_price.toLocaleString()}`,
      `Selling Price: $${car.selling_price.toLocaleString()}`,
      `Status: ${car.status}`,
      `Purchase Date: ${car.purchase_date}`,
    ];
    if (car.status === 'Sold' && car.sold_date) {
      details.push(`Sold Date: ${car.sold_date}`);
    }
    if (car.notes) {
      details.push(`Notes: ${car.notes}`);
    }

    const buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit ✏️', onPress: () => handleOpenEditModal(car) },
    ];
    if (car.status !== 'Sold') {
      buttons.push({ text: 'Sell 💰', onPress: () => handleOpenSellModal(car) });
    }
    buttons.push({ text: 'Delete 🗑️', style: 'destructive', onPress: () => handleDelete(car) });

    customAlert(
      `${car.brand} ${car.model} (${car.model_year})`,
      details.join('\n'),
      buttons
    );
  };

  const handleOpenEditModal = (car: Car) => {
    setEditingCar(car);
    setEditBrand(car.brand);
    setEditModel(car.model);
    setEditModelYear(car.model_year.toString());
    setEditVin(car.vin);
    setEditLicensePlate(car.license_plate);
    setEditColor(car.color);
    setEditMileage(car.mileage.toString());
    setEditTransmission(car.transmission);
    setEditFuelType(car.fuel_type);
    setEditPurchasePrice(car.purchase_price.toString());
    setEditSellingPrice(car.selling_price.toString());
    setEditStatus(car.status);
    setEditNotes(car.notes || '');
    setEditModalVisible(true);
  };

  const handleConfirmEdit = () => {
    if (!editingCar) return;
    const yearVal = parseInt(editModelYear);
    const mileageVal = parseInt(editMileage);
    const purchaseVal = parseFloat(editPurchasePrice);
    const sellingVal = parseFloat(editSellingPrice);

    if (
      !editBrand.trim() ||
      !editModel.trim() ||
      isNaN(yearVal) ||
      !editVin.trim() ||
      !editLicensePlate.trim() ||
      !editColor.trim() ||
      isNaN(mileageVal) ||
      isNaN(purchaseVal) ||
      isNaN(sellingVal)
    ) {
      customAlert('Invalid Input', 'Please fill in all required fields.');
      return;
    }

    updateCar(editingCar.car_id, {
      brand: editBrand.trim(),
      model: editModel.trim(),
      model_year: yearVal,
      vin: editVin.trim().toUpperCase(),
      license_plate: editLicensePlate.trim(),
      color: editColor.trim(),
      mileage: mileageVal,
      transmission: editTransmission,
      fuel_type: editFuelType,
      purchase_price: purchaseVal,
      selling_price: sellingVal,
      status: editStatus,
      notes: editNotes.trim() || null,
      sold_date: editStatus === 'Sold' ? (editingCar.sold_date || new Date().toISOString().split('T')[0]) : null,
    });

    setEditModalVisible(false);
    setEditingCar(null);
    customAlert('Success', 'Car details updated successfully.');
  };

  const handleOpenSellModal = (car: Car) => {
    setSelectedCar(car);
    setSellPriceInput(car.selling_price.toString());
    setSellModalVisible(true);
  };

  const handleConfirmSell = () => {
    if (!selectedCar) return;
    const price = parseFloat(sellPriceInput);
    if (isNaN(price) || price <= 0) {
      customAlert('Invalid Price', 'Please enter a valid selling price.');
      return;
    }
    sellCar(selectedCar.car_id, price);
    setSellModalVisible(false);
    setSelectedCar(null);
    setSellPriceInput('');
    customAlert('Car Sold!', `${selectedCar.brand} ${selectedCar.model} sold for $${price.toLocaleString()}.`);
  };

  const handleDelete = (car: Car) => {
    customAlert(
      'Delete Car',
      `Are you sure you want to remove this ${car.model_year} ${car.brand} ${car.model} from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCar(car.car_id),
        },
      ]
    );
  };

  const handleAddProduct = () => {
    router.push('/add');
  };

  const toggleFilter = () => {
    const statuses: ('All' | Car['status'])[] = ['All', 'Available', 'Reserved', 'Maintenance', 'Sold'];
    const currentIndex = statuses.indexOf(statusFilter);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatusFilter(statuses[nextIndex]);
  };

  const getStatusBadgeStyle = (status: Car['status']) => {
    switch (status) {
      case 'Available':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'Reserved':
        return { bg: '#FFF3E0', text: '#EF6C00' };
      case 'Maintenance':
        return { bg: '#E3F2FD', text: '#1565C0' };
      case 'Sold':
        return { bg: '#EDE7F6', text: '#5E35B1' };
      default:
        return { bg: '#F5F5F5', text: '#9E9E9E' };
    }
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

      {/* Header */}
      <View style={[styles.header, theme.border, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity style={styles.headerButton}>
          <Text style={[styles.headerIcon, { color: theme.text.color }]}>☰</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text.color }]}>Car Inventory</Text>

        <TouchableOpacity style={styles.profileButton}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.inputText }]}
            placeholder="Search brand, vin, plate..."
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
          <Text style={styles.addProductText}>+ Add Car</Text>
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

      {/* Product List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, theme.textSecondary]}>No cars found 📦</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(product) => product.id}
          contentContainerStyle={styles.scrollContent}
          renderItem={({ item: product }) => {
            const badgeColors = getStatusBadgeStyle(product.badge_status);

            return (
              <TouchableOpacity
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
                    <Text style={[styles.detailLabel, theme.textSecondary]}>License:</Text>
                    <Text style={[styles.detailValue, theme.text]}>{product.location_text}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, theme.textSecondary]}>Fuel/Gear:</Text>
                    <Text style={[styles.detailValue, theme.text]} numberOfLines={1}>{product.category}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, theme.textSecondary]}>Price:</Text>
                    <Text style={[styles.detailValue, { color: '#8B5CF6', fontWeight: '800' }]}>
                      ${product.originalCar.selling_price.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: badgeColors.bg }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: badgeColors.text }
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
          }}
        />
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
                {selectedCar.model_year} {selectedCar.brand} {selectedCar.model}
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

      {/* Editing Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: isDark ? '#1C1D20' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#333' }]}>Edit Car Details</Text>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              {/* Brand & Model */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Brand *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    value={editBrand}
                    onChangeText={setEditBrand}
                    placeholder="e.g. Toyota"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Model *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    value={editModel}
                    onChangeText={setEditModel}
                    placeholder="e.g. Camry"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
              </View>

              {/* Model Year & Color */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Model Year *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    keyboardType="numeric"
                    value={editModelYear}
                    onChangeText={setEditModelYear}
                    placeholder="e.g. 2022"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Color *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    value={editColor}
                    onChangeText={setEditColor}
                    placeholder="e.g. Red"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
              </View>

              {/* VIN & License Plate */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1.2 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>VIN *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    autoCapitalize="characters"
                    maxLength={17}
                    value={editVin}
                    onChangeText={setEditVin}
                    placeholder="17-digit VIN"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 0.8 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Plate *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    value={editLicensePlate}
                    onChangeText={setEditLicensePlate}
                    placeholder="กข-1234"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
              </View>

              {/* Mileage & Transmission */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Mileage (km) *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    keyboardType="numeric"
                    value={editMileage}
                    onChangeText={setEditMileage}
                    placeholder="km"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Transmission</Text>
                  <View style={styles.selectorRow}>
                    {(['Auto', 'Manual'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.selectorBtn,
                          editTransmission === t && styles.selectorBtnActive,
                          { borderColor: isDark ? '#3E4249' : '#ddd' }
                        ]}
                        onPress={() => setEditTransmission(t)}
                      >
                        <Text style={[
                          styles.selectorBtnText,
                          editTransmission === t ? styles.selectorTextActive : { color: isDark ? '#fff' : '#333' }
                        ]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Fuel Type */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Fuel Type</Text>
                <View style={styles.selectorRow}>
                  {(['Gasoline', 'Diesel', 'EV', 'Hybrid'] as const).map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.selectorBtn,
                        styles.selectorBtnQuarter,
                        editFuelType === f && styles.selectorBtnActive,
                        { borderColor: isDark ? '#3E4249' : '#ddd' }
                      ]}
                      onPress={() => setEditFuelType(f)}
                    >
                      <Text style={[
                        styles.selectorBtnText,
                        editFuelType === f ? styles.selectorTextActive : { color: isDark ? '#fff' : '#333' }
                      ]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Purchase & Selling Prices */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Purchase Price ($) *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    keyboardType="numeric"
                    value={editPurchasePrice}
                    onChangeText={setEditPurchasePrice}
                    placeholder="Cost"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Selling Price ($) *</Text>
                  <TextInput
                    style={[styles.modalInput, {
                      borderColor: isDark ? '#2E3135' : '#ddd',
                      color: isDark ? '#fff' : '#000',
                      backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                    }]}
                    keyboardType="numeric"
                    value={editSellingPrice}
                    onChangeText={setEditSellingPrice}
                    placeholder="Retail"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Status</Text>
                <View style={styles.selectorRow}>
                  {(['Available', 'Reserved', 'Maintenance', 'Sold'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.selectorBtn,
                        styles.selectorBtnQuarter,
                        editStatus === s && styles.selectorBtnActive,
                        { borderColor: isDark ? '#3E4249' : '#ddd' }
                      ]}
                      onPress={() => setEditStatus(s)}
                    >
                      <Text style={[
                        styles.selectorBtnText,
                        editStatus === s ? styles.selectorTextActive : { color: isDark ? '#fff' : '#333' }
                      ]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Notes</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputTextarea, {
                    borderColor: isDark ? '#2E3135' : '#ddd',
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: isDark ? '#2e3135' : '#fcfcfc'
                  }]}
                  multiline={true}
                  numberOfLines={3}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Additional options, condition details..."
                  placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: isDark ? '#2e3135' : '#f0f0f0' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? '#fff' : '#333' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmEdit}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save Changes</Text>
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
    paddingBottom: 100,
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
  lightText: {
    color: '#111111',
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
  leftColumn: {
    flex: 1,
    gap: 10,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '800',
    marginTop: -2,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalContentLarge: {
    height: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalCarName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputGroup: {
    gap: 6,
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalInputTextarea: {
    height: 80,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  flexRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  selectorBtnQuarter: {
    flex: 1,
  },
  selectorBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  selectorBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {},
  modalBtnConfirm: {
    backgroundColor: '#8B5CF6',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
