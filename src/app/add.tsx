import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { customAlert } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useInventory, Car } from '@/context/InventoryContext';
import { TopNavigation } from '@/components/top-navigation';
import { useAuth } from '@/context/AuthContext';

const EMOJI_MAP: Record<string, string> = {
  tesla: '⚡',
  bmw: '🏁',
  porsche: '🏎️',
  ford: '🔋',
  toyota: '🇯🇵',
  honda: '🇯🇵',
  mercedes: '🇩🇪',
  audi: '🇩🇪',
  ferrari: '🐎',
  lamborghini: '🐂',
  nissan: '🚗',
  chevrolet: '🇺🇸',
  jeep: '⛰️',
  landrover: '⛰️',
};

export default function AddScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { addCar } = useInventory();
  const { isAdmin } = useAuth();

  // Guard: User role ไม่สามารถเข้าหน้านี้ได้
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/products');
    }
  }, [isAdmin]);

  // Form states matching used_car_inventory columns
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState(new Date().getFullYear().toString());
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [transmission, setTransmission] = useState<Car['transmission']>('Auto');
  const [fuelType, setFuelType] = useState<Car['fuel_type']>('Gasoline');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚗');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlError, setImageUrlError] = useState(false);

  // Auto-map emoji when brand changes
  const handleBrandChange = (text: string) => {
    setBrand(text);
    const key = text.toLowerCase().replace(/\s+/g, '');
    if (EMOJI_MAP[key]) {
      setSelectedEmoji(EMOJI_MAP[key]);
    } else {
      setSelectedEmoji('🚗');
    }
  };

  const handleSubmit = () => {
    // Validation
    if (
      !vin.trim() ||
      !licensePlate.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !modelYear.trim() ||
      !color.trim() ||
      !mileage.trim() ||
      !purchasePrice.trim() ||
      !sellingPrice.trim() ||
      !purchaseDate.trim()
    ) {
      customAlert('Missing Info', 'Please fill in all required (*) fields.');
      return;
    }

    if (vin.trim().length !== 17) {
      customAlert('Invalid VIN', 'VIN must be exactly 17 characters long.');
      return;
    }

    const yearVal = parseInt(modelYear);
    const mileageVal = parseInt(mileage);
    const purchaseVal = parseFloat(purchasePrice);
    const sellingVal = parseFloat(sellingPrice);

    if (isNaN(yearVal) || yearVal < 1900 || yearVal > 2100) {
      customAlert('Invalid Year', 'Please enter a valid year.');
      return;
    }

    if (isNaN(mileageVal) || mileageVal < 0) {
      customAlert('Invalid Mileage', 'Please enter a valid mileage.');
      return;
    }

    if (isNaN(purchaseVal) || purchaseVal <= 0) {
      customAlert('Invalid Price', 'Please enter a valid purchase price.');
      return;
    }

    if (isNaN(sellingVal) || sellingVal <= 0) {
      customAlert('Invalid Price', 'Please enter a valid selling price.');
      return;
    }

    // Submit
    addCar({
      vin: vin.trim().toUpperCase(),
      license_plate: licensePlate.trim(),
      brand: brand.trim(),
      model: model.trim(),
      model_year: yearVal,
      color: color.trim(),
      mileage: mileageVal,
      transmission,
      fuel_type: fuelType,
      purchase_price: purchaseVal,
      selling_price: sellingVal,
      purchase_date: purchaseDate.trim(),
      notes: notes.trim() || null,
      image_emoji: imageUrl.trim() ? undefined : selectedEmoji,
      image_url: imageUrl.trim() || undefined,
    });

    customAlert(
      'Success',
      `${brand} ${model} has been added to inventory!`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setVin('');
            setLicensePlate('');
            setBrand('');
            setModel('');
            setModelYear(new Date().getFullYear().toString());
            setColor('');
            setMileage('');
            setTransmission('Auto');
            setFuelType('Gasoline');
            setPurchasePrice('');
            setSellingPrice('');
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setSelectedEmoji('🚗');
            setImageUrl('');
            setImageUrlError(false);
            
            router.push('/products');
          },
        },
      ]
    );
  };

  const themeStyles = {
    container: isDark ? styles.darkContainer : styles.lightContainer,
    cardBg: isDark ? styles.darkCard : styles.lightCard,
    border: isDark ? styles.darkBorder : styles.lightBorder,
    inputBg: isDark ? '#2E3135' : '#ffffff',
    inputText: isDark ? '#ffffff' : '#000000',
    inputBorder: isDark ? '#3E4249' : '#ddd',
    labelColor: isDark ? '#b0b4ba' : '#444',
  };

  const inputStyle = [styles.input, { 
    borderColor: themeStyles.inputBorder,
    color: themeStyles.inputText,
    backgroundColor: themeStyles.inputBg
  }];

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : '#f8f9fa'} />
      
      {/* Header */}
      {Platform.OS !== 'web' && <TopNavigation activeTab="add" rightIcon={selectedEmoji} />}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.formContainer, themeStyles.cardBg, themeStyles.border]}>
          <Text style={[styles.formTitle, { color: isDark ? '#fff' : '#111' }]}>🚘 Add Vehicle to Stock</Text>

          {/* ─── IMAGE URL SECTION ─── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: isDark ? '#8B5CF6' : '#7C3AED' }]}>📸 Vehicle Photo</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeStyles.labelColor }]}>Image URL (optional)</Text>
            <TextInput
              style={[
                inputStyle,
                imageUrlError && styles.inputError,
              ]}
              placeholder="https://example.com/car-photo.jpg"
              placeholderTextColor={isDark ? '#8a8e94' : '#999'}
              value={imageUrl}
              onChangeText={(text) => {
                setImageUrl(text);
                setImageUrlError(false);
              }}
              autoCapitalize="none"
              keyboardType="url"
            />
            {imageUrl.trim() !== '' && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUrl.trim() }}
                  style={styles.imagePreview}
                  contentFit="cover"
                  transition={300}
                  onError={() => setImageUrlError(true)}
                />
                {imageUrlError && (
                  <View style={styles.imageErrorOverlay}>
                    <Text style={styles.imageErrorText}>⚠️ Cannot load image</Text>
                    <Text style={styles.imageErrorSubText}>Check URL and try again</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Visual Emoji Badge (shown only if no image_url) */}
          {!imageUrl.trim() && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Visual Badge Icon</Text>
              <View style={styles.emojiRow}>
                {['🚗', '⚡', '🏁', '🏎️', '🔋', '⛰️', '🇯🇵', '🇩🇪', '🇺🇸'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiSelectorChip,
                      selectedEmoji === emoji && styles.activeEmojiChip,
                      selectedEmoji !== emoji && { backgroundColor: isDark ? '#2E3135' : '#f0f0f3' }
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                  >
                    <Text style={styles.emojiSelectorText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ─── VEHICLE INFO ─── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: isDark ? '#8B5CF6' : '#7C3AED' }]}>🚗 Vehicle Info</Text>
          </View>

          {/* Brand & Model */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Brand / Make *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Toyota"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={brand}
                onChangeText={handleBrandChange}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Model *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Camry"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={model}
                onChangeText={setModel}
              />
            </View>
          </View>

          {/* Model Year & Color */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Model Year *</Text>
              <TextInput
                style={inputStyle}
                keyboardType="numeric"
                placeholder="2022"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={modelYear}
                onChangeText={setModelYear}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Color *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. White"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={color}
                onChangeText={setColor}
              />
            </View>
          </View>

          {/* VIN & License Plate */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1.3 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>VIN (17 chars) *</Text>
              <TextInput
                style={inputStyle}
                autoCapitalize="characters"
                maxLength={17}
                placeholder="Vehicle ID Number"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={vin}
                onChangeText={setVin}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 0.9, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>License Plate *</Text>
              <TextInput
                style={inputStyle}
                placeholder="ABC-1234"
                placeholderTextColor={isDark ? '#8A8E94' : '#999999'}
                autoCapitalize="characters"
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          </View>

          {/* ─── SPECS ─── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: isDark ? '#8B5CF6' : '#7C3AED' }]}>⚙️ Specifications</Text>
          </View>

          {/* Mileage & Purchase Date */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Mileage (km) *</Text>
              <TextInput
                style={inputStyle}
                keyboardType="numeric"
                placeholder="e.g. 25000"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={mileage}
                onChangeText={setMileage}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Purchase Date *</Text>
              <TextInput
                style={inputStyle}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
              />
            </View>
          </View>

          {/* Transmission Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeStyles.labelColor }]}>Transmission</Text>
            <View style={styles.selectorRow}>
              {(['Auto', 'Manual'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.selectorBtn,
                    transmission === t && styles.selectorBtnActive,
                    { borderColor: themeStyles.inputBorder }
                  ]}
                  onPress={() => setTransmission(t)}
                >
                  <Text style={[
                    styles.selectorBtnText,
                    transmission === t ? styles.selectorTextActive : { color: isDark ? '#b0b4ba' : '#333' }
                  ]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fuel Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeStyles.labelColor }]}>Fuel Type</Text>
            <View style={styles.selectorRow}>
              {(['Gasoline', 'Diesel', 'EV', 'Hybrid'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.selectorBtn,
                    fuelType === f && styles.selectorBtnActive,
                    { borderColor: themeStyles.inputBorder }
                  ]}
                  onPress={() => setFuelType(f)}
                >
                  <Text style={[
                    styles.selectorBtnText,
                    fuelType === f ? styles.selectorTextActive : { color: isDark ? '#b0b4ba' : '#333' }
                  ]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── PRICING ─── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: isDark ? '#8B5CF6' : '#7C3AED' }]}>💰 Pricing</Text>
          </View>

          {/* Cost vs Selling Prices */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Purchase Price ($) *</Text>
              <TextInput
                style={inputStyle}
                keyboardType="numeric"
                placeholder="Cost"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={purchasePrice}
                onChangeText={setPurchasePrice}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: themeStyles.labelColor }]}>Selling Price ($) *</Text>
              <TextInput
                style={inputStyle}
                keyboardType="numeric"
                placeholder="Retail"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={sellingPrice}
                onChangeText={setSellingPrice}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeStyles.labelColor }]}>Notes</Text>
            <TextInput
              style={[inputStyle, styles.textarea]}
              multiline={true}
              numberOfLines={3}
              placeholder="e.g. Pristine condition, warranty remaining..."
              placeholderTextColor={isDark ? '#8a8e94' : '#999'}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Add to Inventory 🚗</Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formContainer: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  lightCard: {
    backgroundColor: 'white',
  },
  darkCard: {
    backgroundColor: '#161719',
  },
  lightBorder: {
    borderColor: '#e9ecef',
  },
  darkBorder: {
    borderColor: '#212225',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.2)',
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textarea: {
    height: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  selectorBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  selectorBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectorTextActive: {
    color: '#ffffff',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiSelectorChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeEmojiChip: {
    backgroundColor: '#8B5CF6',
  },
  emojiSelectorText: {
    fontSize: 18,
  },
  imagePreviewContainer: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
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
    borderRadius: 16,
  },
  imageErrorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imageErrorSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
