import { useAuth } from '@/context/AuthContext';
import { Car, useInventory } from '@/context/InventoryContext';
import { customAlert } from '@/utils/alert';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  useWindowDimensions,
  View
} from 'react-native';

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
  const carId = car.car_id || (car as any).id || Math.floor(Math.random() * 100000);
  return {
    id: carId.toString(),
    name: `${car.brand || 'Unknown'} ${car.model || 'Model'} (${car.model_year || 2023})`,
    stock_text: car.status === 'Available' ? 'Ready' : car.status || 'Unknown',
    category: `${car.fuel_type || 'Gasoline'} / ${car.transmission || 'Auto'}`,
    location_text: car.license_plate || (car as any).location || 'Unknown',
    badge_status: car.status || 'Available',
    image_url: car.image_url || (car as any).image || getImageUrlForEmoji(car.image_emoji || ''),
    originalCar: car,
  };
}

export default function ProductsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const numColumns = width >= 1200 ? 4 : width >= 850 ? 3 : 2;
  // Explicit card width so all cells are identical (fixes FlatList last-row stretch)
  const CARD_MARGIN = 5;
  const CONTENT_PADDING = 16;
  const containerWidth = Math.min(width, 1200);
  const cardWidth = (containerWidth - CONTENT_PADDING * 2 - numColumns * CARD_MARGIN * 2) / numColumns;

  const { cars, sellCar, deleteCar, updateCar, createOrder, uploadImage, loading } = useInventory();
  const { isAdmin, user } = useAuth();
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Car['status']>('All');

  // Purchase Modal state
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [purchaseCar, setPurchaseCar] = useState<Car | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Sell Modal state (Admin direct sell)
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState('');

  // State for Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  // State for Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailCar, setDetailCar] = useState<Car | null>(null);

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
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageUrlError, setEditImageUrlError] = useState(false);

  // Map all context cars to product schema
  const products = cars.map(deriveProductFromCar);

  // Filter products based on search query and status filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // VIN search เฉพาะ Admin
      (isAdmin && product.originalCar.vin && product.originalCar.vin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      product.originalCar.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.originalCar.color.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' ? true : product.badge_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleProductPress = (product: Product) => {
    setDetailCar(product.originalCar);
    setDetailModalVisible(true);
  };

  const handlePickEditFile = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        setIsEditUploading(true);
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64 = reader.result as string;
              const uploadedUrl = await uploadImage(base64);
              setEditImageUrl(uploadedUrl);
              setEditImageUrlError(false);
            } catch (err: any) {
              customAlert('Upload Error', err.message || 'Failed to upload image');
            } finally {
              setIsEditUploading(false);
            }
          };
          reader.readAsDataURL(file);
        } catch (err: any) {
          customAlert('Upload Error', err.message || 'Failed to read file');
          setIsEditUploading(false);
        }
      };
      input.click();
    }
  };

  // [SEARCH: UI-EDIT-CAR] ฟังก์ชันเปิดหน้าต่างแก้ไขข้อมูลรถ (Modal)
  const handleOpenEditModal = (car: Car) => {
    setDetailModalVisible(false);
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
    setEditImageUrl(car.image_url || '');
    setEditImageUrlError(false);
    setEditModalVisible(true);
  };

  // [SEARCH: UI-EDIT-CONFIRM] ฟังก์ชันกดยืนยันบันทึกการแก้ไขข้อมูลรถ (เรียก updateCar)
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
      image_url: editImageUrl.trim() || undefined,
      sold_date: editStatus === 'Sold' ? (editingCar.sold_date || new Date().toISOString().split('T')[0]) : null,
    });

    setEditModalVisible(false);
    setEditingCar(null);
    customAlert('Success', 'Car details updated successfully.');
  };

  // [SEARCH: UI-BUY-CAR] ฟังก์ชันเปิดหน้าต่างสั่งซื้อรถ (สำหรับ User)
  const handleOpenPurchaseModal = (car: Car) => {
    setDetailModalVisible(false);
    setPurchaseCar(car);
    setBuyerName('');
    setBuyerPhone('');
    setBuyerAddress('');
    setDeliveryType('pickup');
    setPurchaseModalVisible(true);
  };

  // [SEARCH: UI-BUY-CONFIRM] ฟังก์ชันกดยืนยันการสั่งซื้อรถ (เรียก createOrder)
  const handleConfirmPurchase = async () => {
    if (!purchaseCar || !user) return;
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerAddress.trim()) {
      customAlert('Incomplete Information', 'Please fill in your name, phone number, and address.');
      return;
    }
    if (!/^[0-9\-+\s]{9,15}$/.test(buyerPhone.trim())) {
      customAlert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }
    setPurchaseLoading(true);
    try {
      await createOrder({
        car_id: purchaseCar.car_id,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_address: buyerAddress.trim(),
        delivery_type: deliveryType,
      });
      setPurchaseModalVisible(false);
      setPurchaseCar(null);
      customAlert(
        'Order Placed!',
        `Your purchase order for ${purchaseCar.brand} ${purchaseCar.model} has been submitted to Admin for approval.`
      );
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to place order.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  // [SEARCH: UI-SELL-CAR] ฟังก์ชันเปิดหน้าต่างขายรถโดยตรง (สำหรับ Admin)
  const handleOpenSellModal = (car: Car) => {
    setDetailModalVisible(false);
    setSelectedCar(car);
    setSellPriceInput(car.selling_price.toString());
    setSellModalVisible(true);
  };

  // [SEARCH: UI-SELL-CONFIRM] ฟังก์ชันกดยืนยันการขายรถ (เรียก sellCar)
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
    customAlert('Car Sold!', `${selectedCar.brand} ${selectedCar.model} sold for ฿${Number(price).toLocaleString('th-TH')}.`);
  };

  // [SEARCH: UI-DELETE-CAR] ฟังก์ชันลบรถออกจากระบบ (เรียก deleteCar)
  const handleDelete = (car: Car) => {
    setDetailModalVisible(false);
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

  // [SEARCH: UI-ADD-CAR] ปุ่มนำทางไปหน้าเพิ่มรถใหม่ (Add Screen)
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
    modalBg: isDark ? '#1C1D20' : '#ffffff',
    inputBorder: isDark ? '#2E3135' : '#ddd',
    inputFieldBg: isDark ? '#2e3135' : '#fcfcfc',
  };

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={styles.mainContentWrapper}>
        {/* Page Title & Action Bar */}
        <View style={styles.topHeaderSection}>
          <Text style={[styles.pageTitleText, { color: theme.text.color }]}>Car Inventory</Text>
          <Text style={[styles.pageSubText, theme.textSecondary]}>
            {filteredProducts.length} vehicle{filteredProducts.length !== 1 ? 's' : ''} in stock
          </Text>
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

          {/* Add Car button — Admin only */}
          {isAdmin && (
            <TouchableOpacity style={styles.addProductButton} onPress={handleAddProduct}>
              <Text style={styles.addProductText}>+ Add Car</Text>
            </TouchableOpacity>
          )}

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
            key={`grid_${numColumns}`}
            data={filteredProducts}
            keyExtractor={(product) => product.id}
            numColumns={numColumns}
            contentContainerStyle={styles.scrollContent}
            columnWrapperStyle={styles.columnWrapper}
            renderItem={({ item: product }) => {
              const badgeColors = getStatusBadgeStyle(product.badge_status);

              return (
                <TouchableOpacity
                  style={[styles.productCard, theme.cardBg, theme.border, { width: cardWidth }]}
                  onPress={() => handleProductPress(product)}
                  activeOpacity={0.88}
                >
                  {/* Product Image */}
                  <View style={styles.productImageContainer}>
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.productImage}
                      contentFit="cover"
                      transition={200}
                    />
                    {/* Gradient overlay at bottom of image */}
                    <View style={styles.imageGradient} />

                    {/* Status Badge */}
                    <View style={[styles.statusBadgeOverlay, { backgroundColor: badgeColors.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
                        {product.badge_status}
                      </Text>
                    </View>

                    {/* Price overlaid on image bottom */}
                    <Text style={styles.priceOverlay}>
                      ฿{Number(product.originalCar.selling_price).toLocaleString('th-TH')}
                    </Text>
                  </View>

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    <Text style={[styles.productName, theme.text]} numberOfLines={1}>
                      {product.name}
                    </Text>

                    <View style={styles.cardDetailRow}>
                      <Text style={[styles.detailChip, theme.textSecondary]}>
                        ⛽ {product.originalCar.fuel_type}
                      </Text>
                      <Text style={[styles.detailChip, theme.textSecondary]}>
                        ⚙️ {product.originalCar.transmission}
                      </Text>
                    </View>

                    {/* Action Row */}
                    <View style={styles.cardBottom}>
                      <Text style={[styles.plateSmall, theme.textSecondary]}>
                        {product.originalCar.license_plate}
                      </Text>
                      <View style={styles.quickActions}>
                        {/* Detail View */}
                        <TouchableOpacity
                          style={styles.detailIconBtn}
                          onPress={() => handleProductPress(product)}
                        >
                          <Text style={styles.detailIconText}>👁️</Text>
                        </TouchableOpacity>

                        {/* Order (User) */}
                        {product.originalCar.status === 'Available' && !isAdmin && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, styles.sellBtn]}
                            onPress={() => user ? handleOpenPurchaseModal(product.originalCar) : customAlert('Login Required', 'Please login to buy.')}
                          >
                            <Text style={styles.quickActionText}>🛍</Text>
                          </TouchableOpacity>
                        )}

                        {/* Edit (Admin) */}
                        {isAdmin && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, styles.editBtn]}
                            onPress={() => handleOpenEditModal(product.originalCar)}
                          >
                            <Text style={styles.quickActionText}>✏️</Text>
                          </TouchableOpacity>
                        )}

                        {/* Sell (Admin) */}
                        {isAdmin && product.originalCar.status !== 'Sold' && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, styles.sellBtn]}
                            onPress={() => handleOpenSellModal(product.originalCar)}
                          >
                            <Text style={styles.quickActionText}>💰</Text>
                          </TouchableOpacity>
                        )}

                        {/* Delete (Admin) */}
                        {isAdmin && (
                          <TouchableOpacity
                            style={[styles.quickActionBtn, styles.deleteBtn]}
                            onPress={() => handleDelete(product.originalCar)}
                          >
                            <Text style={styles.quickActionText}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
            {detailCar && (() => {
              const badgeColors = getStatusBadgeStyle(detailCar.status);
              return (
                <>
                  {/* Car Image Preview */}
                  <View style={styles.detailImageWrapper}>
                    <Image
                      source={{ uri: detailCar.image_url || getImageUrlForEmoji(detailCar.image_emoji || '') }}
                      style={styles.detailModalImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.detailImageGradient} />
                    {/* Status badge on image */}
                    <View style={[styles.detailStatusBadge, { backgroundColor: badgeColors.bg }]}>
                      <Text style={[styles.detailStatusBadgeText, { color: badgeColors.text }]}>
                        {detailCar.status}
                      </Text>
                    </View>
                    {/* Price on image */}
                    <Text style={styles.detailPriceOnImage}>
                      ฿{Number(detailCar.selling_price).toLocaleString('th-TH')}
                    </Text>
                  </View>

                  {/* Car Title */}
                  <Text style={[styles.detailCarTitle, { color: isDark ? '#fff' : '#111' }]}>
                    {detailCar.model_year} {detailCar.brand} {detailCar.model}
                  </Text>
                  <Text style={[styles.detailPlateText, { color: isDark ? '#8A8E9A' : '#777E90' }]}>
                    🪪 {detailCar.license_plate}  ·  🎨 {detailCar.color}
                  </Text>

                  {/* Info Grid */}
                  <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 0 }}>
                    {[
                      // VIN เฉพาะ Admin
                      ...(isAdmin ? [['VIN', detailCar.vin || 'N/A']] : []),
                      ['Mileage', `${detailCar.mileage.toLocaleString()} km`],
                      ['Transmission', detailCar.transmission],
                      ['Fuel Type', detailCar.fuel_type],
                      ['Purchase Cost', `฿${Number(detailCar.purchase_price).toLocaleString('th-TH')}`],
                      ['Selling Price', `฿${Number(detailCar.selling_price).toLocaleString('th-TH')}`],
                      ['Purchase Date', detailCar.purchase_date],
                      ...(detailCar.status === 'Sold' && detailCar.sold_date ? [['Sold Date', detailCar.sold_date]] : []),
                      ...(detailCar.notes ? [['Notes', detailCar.notes]] : []),
                    ].map(([label, value]) => (
                      <View key={label} style={[styles.detailInfoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
                        <Text style={[styles.detailInfoLabel, { color: isDark ? '#8A8E9A' : '#777E90' }]}>{label}</Text>
                        <Text style={[styles.detailInfoValue, { color: isDark ? '#fff' : '#111' }]}>{value}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Actions */}
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.detailActionBtn, { backgroundColor: isDark ? '#1E2028' : '#F0F2F8' }]}
                      onPress={() => setDetailModalVisible(false)}
                    >
                      <Text style={{ color: isDark ? '#fff' : '#333', fontWeight: '700', fontSize: 13 }}>✕ Close</Text>
                    </TouchableOpacity>

                    {/* Edit — Admin only */}
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.detailActionBtn, { backgroundColor: '#3B82F6' }]}
                        onPress={() => handleOpenEditModal(detailCar)}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
                      </TouchableOpacity>
                    )}

                    {/* Order Button — User (Logged In) */}
                    {detailCar.status === 'Available' && !isAdmin && user && (
                      <TouchableOpacity
                        style={[styles.detailActionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleOpenPurchaseModal(detailCar)}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🛍 Buy Now</Text>
                      </TouchableOpacity>
                    )}

                    {/* Order Button — Not Logged In */}
                    {detailCar.status === 'Available' && !isAdmin && !user && (
                      <TouchableOpacity
                        style={[styles.detailActionBtn, { backgroundColor: '#6B7280' }]}
                        onPress={() => customAlert('Login Required', 'Please login before placing a purchase order.')}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔑 Login to Buy</Text>
                      </TouchableOpacity>
                    )}

                    {/* ปุ่ม Admin Sell — Admin ขายตรงไม่ผ่าน Order */}
                    {detailCar.status !== 'Sold' && isAdmin && (
                      <TouchableOpacity
                        style={[styles.detailActionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleOpenSellModal(detailCar)}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>💰 Sell</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete — Admin only */}
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.detailActionBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleDelete(detailCar)}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>


      {/* Purchase Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={purchaseModalVisible}
        onRequestClose={() => setPurchaseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: theme.modalBg }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#333' }]}>🛍 Buyer Information</Text>
            {purchaseCar && (
              <Text style={[styles.modalCarName, { color: isDark ? '#b0b4ba' : '#666' }]}>
                {purchaseCar.model_year} {purchaseCar.brand} {purchaseCar.model} • ฿{Number(purchaseCar.selling_price).toLocaleString('th-TH')}
              </Text>
            )}

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
              {/* Buyer Name */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>👤 Full Name *</Text>
                <TextInput
                  style={[styles.modalInput, {
                    borderColor: theme.inputBorder,
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: theme.inputFieldBg
                  }]}
                  value={buyerName}
                  onChangeText={setBuyerName}
                  placeholder="First and Last Name"
                  placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  autoCapitalize="words"
                />
              </View>

              {/* Phone */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>📱 Phone Number *</Text>
                <TextInput
                  style={[styles.modalInput, {
                    borderColor: theme.inputBorder,
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: theme.inputFieldBg
                  }]}
                  value={buyerPhone}
                  onChangeText={setBuyerPhone}
                  placeholder="0XX-XXX-XXXX"
                  placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Address */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>🏠 Delivery / Contact Address *</Text>
                <TextInput
                  style={[styles.modalInput, {
                    borderColor: theme.inputBorder,
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: theme.inputFieldBg,
                    minHeight: 72,
                    textAlignVertical: 'top',
                  }]}
                  value={buyerAddress}
                  onChangeText={setBuyerAddress}
                  placeholder="House number, Street, District, Province, Postal Code"
                  placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Delivery Option */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>🚗 Delivery Method *</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.deliveryOptionBtn,
                      deliveryType === 'pickup' && styles.deliveryOptionBtnActive,
                      { borderColor: deliveryType === 'pickup' ? '#8B5CF6' : (isDark ? '#444' : '#ddd') }
                    ]}
                    onPress={() => setDeliveryType('pickup')}
                  >
                    <Text style={{ fontSize: 22 }}>🏛</Text>
                    <Text style={[
                      styles.deliveryOptionText,
                      { color: deliveryType === 'pickup' ? '#8B5CF6' : (isDark ? '#aaa' : '#666') }
                    ]}>Pickup at Office</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deliveryOptionBtn,
                      deliveryType === 'delivery' && styles.deliveryOptionBtnActive,
                      { borderColor: deliveryType === 'delivery' ? '#8B5CF6' : (isDark ? '#444' : '#ddd') }
                    ]}
                    onPress={() => setDeliveryType('delivery')}
                  >
                    <Text style={{ fontSize: 22 }}>🚚</Text>
                    <Text style={[
                      styles.deliveryOptionText,
                      { color: deliveryType === 'delivery' ? '#8B5CF6' : (isDark ? '#aaa' : '#666') }
                    ]}>Home Delivery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalButtons, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: isDark ? '#2e3135' : '#f0f0f0' }]}
                onPress={() => setPurchaseModalVisible(false)}
                disabled={purchaseLoading}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? '#fff' : '#333' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, { opacity: purchaseLoading ? 0.7 : 1 }]}
                onPress={handleConfirmPurchase}
                disabled={purchaseLoading}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {purchaseLoading ? 'Submitting...' : '✓ Place Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sell Modal (Admin) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sellModalVisible}
        onRequestClose={() => setSellModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#333' }]}>💰 Record Car Sale</Text>
            {selectedCar && (
              <Text style={[styles.modalCarName, { color: isDark ? '#b0b4ba' : '#666' }]}>
                {selectedCar.model_year} {selectedCar.brand} {selectedCar.model}
              </Text>
            )}

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Final Selling Price ($)</Text>
              <TextInput
                style={[styles.modalInput, {
                  borderColor: theme.inputBorder,
                  color: isDark ? '#fff' : '#000',
                  backgroundColor: theme.inputFieldBg
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

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: theme.modalBg }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#333' }]}>✏️ Edit Car Details</Text>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>

              {/* ── Image URL ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>📸 Photo</Text>
              </View>

              {/* Upload from Device */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Upload New Photo from Device</Text>
                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    { backgroundColor: isDark ? '#1F2430' : '#EDE9FE', borderColor: '#8B5CF6' },
                    isEditUploading && { opacity: 0.6 }
                  ]}
                  onPress={handlePickEditFile}
                  disabled={isEditUploading}
                >
                  <Text style={{ fontSize: 18 }}>{isEditUploading ? '⏳' : '📁'}</Text>
                  <Text style={[styles.uploadBtnText, { color: '#8B5CF6' }]}>
                    {isEditUploading ? 'Uploading Image to Server...' : 'Choose Image File / Browse'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Or Paste Image URL</Text>
                <TextInput
                  style={[styles.modalInput, {
                    borderColor: editImageUrlError ? '#EF4444' : theme.inputBorder,
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: theme.inputFieldBg,
                  }]}
                  value={editImageUrl}
                  onChangeText={(t) => { setEditImageUrl(t); setEditImageUrlError(false); }}
                  placeholder="https://example.com/car.jpg"
                  placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                {editImageUrl.trim() !== '' && (
                  <View style={styles.editImagePreviewContainer}>
                    <Image
                      source={{ uri: editImageUrl.trim() }}
                      style={styles.editImagePreview}
                      contentFit="cover"
                      transition={300}
                      onError={() => setEditImageUrlError(true)}
                    />
                    {editImageUrlError && (
                      <View style={styles.imageErrorOverlay}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>⚠️ Cannot load image</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ── Vehicle Info ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>🚗 Vehicle Info</Text>
              </View>

              {/* Brand & Model */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Brand *</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
                    value={editBrand}
                    onChangeText={setEditBrand}
                    placeholder="e.g. Toyota"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Model *</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
                    value={editLicensePlate}
                    onChangeText={setEditLicensePlate}
                    placeholder="ABC-1234"
                    placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* ── Specs ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>⚙️ Specifications</Text>
              </View>

              {/* Mileage & Transmission */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Mileage (km) *</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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

              {/* ── Pricing ── */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>💰 Pricing & Status</Text>
              </View>

              {/* Purchase & Selling Prices */}
              <View style={styles.flexRow}>
                <View style={[styles.modalInputGroup, { flex: 1 }]}>
                  <Text style={[styles.modalInputLabel, { color: isDark ? '#b0b4ba' : '#555' }]}>Purchase Price ($) *</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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
                    style={[styles.modalInput, { borderColor: theme.inputBorder, color: isDark ? '#fff' : '#000', backgroundColor: theme.inputFieldBg }]}
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
                    borderColor: theme.inputBorder,
                    color: isDark ? '#fff' : '#000',
                    backgroundColor: theme.inputFieldBg
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
    backgroundColor: '#F0F2F8',
  },
  darkContainer: {
    backgroundColor: '#0A0B0E',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: 0,
    marginBottom: 0,
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
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainContentWrapper: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 0,
    flex: 1,
  },
  topHeaderSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitleText: {
    fontSize: 22,
    fontWeight: '800',
  },
  pageSubText: {
    fontSize: 13,
    marginTop: 2,
  },
  plateSmall: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Grid Product Card ──
  productCard: {
    margin: 5,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lightCard: {
    backgroundColor: '#FFFFFF',
  },
  darkCard: {
    backgroundColor: '#16181E',
  },
  lightBorder: {
    borderColor: '#E4E8F0',
  },
  darkBorder: {
    borderColor: '#1E2028',
  },
  lightText: {
    color: '#111111',
  },
  darkText: {
    color: '#FFFFFF',
  },
  lightTextSecondary: {
    color: '#777E90',
  },
  darkTextSecondary: {
    color: '#8A8E9A',
  },

  // Image area
  productImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#EAEAEA',
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EAEAEA',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card body
  cardContent: {
    padding: 10,
    gap: 6,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  cardDetailRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  detailChip: {
    fontSize: 10,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(139,92,246,0.08)',
    overflow: 'hidden',
  },
  // legacy (kept for backward compat)
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 5,
  },
  quickActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: 'rgba(59,130,246,0.13)',
  },
  sellBtn: {
    backgroundColor: 'rgba(16,185,129,0.13)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.13)',
  },
  quickActionText: {
    fontSize: 13,
  },
  detailIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailIconText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Detail Modal ──
  detailImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 2,
  },
  detailImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  detailStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailPriceOnImage: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  detailCarTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 2,
  },
  detailPlateText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  detailModalImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EAEAEA',
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  detailInfoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  detailActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Modal Styles ──
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
    height: '90%',
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
  // Edit modal image preview
  editImagePreviewContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  editImagePreview: {
    width: '100%',
    height: 150,
    backgroundColor: '#EAEAEA',
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Edit section headers
  editSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.2)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  editSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Delivery Option Buttons (Purchase Modal)
  deliveryOptionBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  deliveryOptionBtnActive: {
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  deliveryOptionText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

