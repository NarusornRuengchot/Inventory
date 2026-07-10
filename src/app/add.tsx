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
  useColorScheme,
} from 'react-native';
import { customAlert } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useInventory, Car } from '@/context/InventoryContext';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Sports', 'Electric', 'Coupe'] as const;

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

  // Form states
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [engine, setEngine] = useState('');
  const [type, setType] = useState<Car['type']>('Sedan');
  const [selectedEmoji, setSelectedEmoji] = useState('🚗');

  // Auto-map emoji when make changes
  const handleMakeChange = (text: string) => {
    setMake(text);
    const key = text.toLowerCase().replace(/\s+/g, '');
    if (EMOJI_MAP[key]) {
      setSelectedEmoji(EMOJI_MAP[key]);
    } else {
      setSelectedEmoji('🚗');
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!make.trim() || !model.trim() || !price.trim() || !mileage.trim() || !engine.trim()) {
      customAlert('Missing Info', 'Please fill in all fields.');
      return;
    }

    const yearVal = parseInt(year);
    const priceVal = parseFloat(price);
    const mileageVal = parseFloat(mileage);

    if (isNaN(yearVal) || yearVal < 1900 || yearVal > 2100) {
      customAlert('Invalid Year', 'Please enter a valid year.');
      return;
    }

    if (isNaN(priceVal) || priceVal <= 0) {
      customAlert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    if (isNaN(mileageVal) || mileageVal < 0) {
      customAlert('Invalid Mileage', 'Please enter a valid mileage.');
      return;
    }

    // Submit
    addCar({
      make: make.trim(),
      model: model.trim(),
      year: yearVal,
      price: priceVal,
      type,
      mileage: mileageVal,
      engine: engine.trim(),
      imageEmoji: selectedEmoji,
    });

    customAlert(
      'Success',
      `${make} ${model} has been added to inventory!`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setMake('');
            setModel('');
            setYear(new Date().getFullYear().toString());
            setPrice('');
            setMileage('');
            setEngine('');
            setType('Sedan');
            setSelectedEmoji('🚗');
            
            // Navigate to products tab (unstable-native-tabs switches via router)
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
  };

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000000' : '#f8f9fa'} />
      
      {/* Header */}
      <View style={[styles.header, themeStyles.border, { backgroundColor: isDark ? '#161719' : 'white' }]}>
        <View style={styles.menuButton}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </View>
        <Text style={styles.headerTitle}>Add Car Model</Text>
        <View style={styles.profileButton}>
          <Text style={styles.profileIcon}>{selectedEmoji}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.formContainer, themeStyles.cardBg, themeStyles.border]}>
          
          {/* Brand/Make */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Car Make / Brand</Text>
            <TextInput
              style={[styles.input, { 
                borderColor: themeStyles.inputBorder,
                color: themeStyles.inputText,
                backgroundColor: themeStyles.inputBg
              }]}
              placeholder="e.g. Tesla, BMW, Porsche"
              placeholderTextColor={isDark ? '#8a8e94' : '#999'}
              value={make}
              onChangeText={handleMakeChange}
            />
          </View>

          {/* Model */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Car Model</Text>
            <TextInput
              style={[styles.input, { 
                borderColor: themeStyles.inputBorder,
                color: themeStyles.inputText,
                backgroundColor: themeStyles.inputBg
              }]}
              placeholder="e.g. Model S Plaid, M3 Competition"
              placeholderTextColor={isDark ? '#8a8e94' : '#999'}
              value={model}
              onChangeText={setModel}
            />
          </View>

          {/* Year and Price in a row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Year</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: themeStyles.inputBorder,
                  color: themeStyles.inputText,
                  backgroundColor: themeStyles.inputBg
                }]}
                keyboardType="numeric"
                placeholder="2024"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={year}
                onChangeText={setYear}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1.5, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Asking Price ($)</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: themeStyles.inputBorder,
                  color: themeStyles.inputText,
                  backgroundColor: themeStyles.inputBg
                }]}
                keyboardType="numeric"
                placeholder="89990"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={price}
                onChangeText={setPrice}
              />
            </View>
          </View>

          {/* Engine and Mileage */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Engine / Motor</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: themeStyles.inputBorder,
                  color: themeStyles.inputText,
                  backgroundColor: themeStyles.inputBg
                }]}
                placeholder="e.g. Tri-Motor AWD"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={engine}
                onChangeText={setEngine}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Mileage (mi)</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: themeStyles.inputBorder,
                  color: themeStyles.inputText,
                  backgroundColor: themeStyles.inputBg
                }]}
                keyboardType="numeric"
                placeholder="12000"
                placeholderTextColor={isDark ? '#8a8e94' : '#999'}
                value={mileage}
                onChangeText={setMileage}
              />
            </View>
          </View>

          {/* Vehicle Type selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Vehicle Type</Text>
            <View style={styles.typeSelector}>
              {VEHICLE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    type === t && styles.activeTypeChip,
                    type !== t && { backgroundColor: isDark ? '#2E3135' : '#f0f0f3' }
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[
                    styles.typeChipText,
                    type === t ? styles.activeTypeChipText : { color: isDark ? '#b0b4ba' : '#555' }
                  ]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Emoji Picker (Visual representation) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#b0b4ba' : '#444' }]}>Visual Badge / Icon</Text>
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

          {/* Submit Button */}
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
    fontSize: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formContainer: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  lightCard: {
    backgroundColor: 'white',
  },
  darkCard: {
    backgroundColor: '#161719',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeTypeChip: {
    backgroundColor: '#8B5CF6',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTypeChipText: {
    color: 'white',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiSelectorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeEmojiChip: {
    backgroundColor: '#8B5CF6',
    transform: [{ scale: 1.1 }],
  },
  emojiSelectorText: {
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
