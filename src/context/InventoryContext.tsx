import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';

export interface Car {
  car_id: number;
  vin: string;
  license_plate: string;
  brand: string;
  model: string;
  model_year: number;
  color: string;
  mileage: number;
  transmission: 'Auto' | 'Manual';
  fuel_type: 'Gasoline' | 'Diesel' | 'EV' | 'Hybrid';
  purchase_price: number;
  selling_price: number;
  status: 'Available' | 'Reserved' | 'Maintenance' | 'Sold';
  purchase_date: string;
  sold_date: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  
  // UI helper fields
  image_url?: string;
  image_emoji?: string;
}

export interface Sale {
  id: string;
  carId: string;
  carName: string;
  sellPrice: number;
  sellDate: string;
}

const PRODUCTS_URL = 'https://raw.githubusercontent.com/NarusornRuengchot/Inventory/refs/heads/master/products.json';

interface InventoryContextType {
  cars: Car[];
  sales: Sale[];
  loading: boolean;
  addCar: (car: Omit<Car, 'car_id' | 'status' | 'sold_date'>) => void;
  sellCar: (carId: number, sellPrice: number) => void;
  deleteCar: (carId: number) => void;
  updateCar: (carId: number, updatedFields: Partial<Car>) => void;
  setCars: React.Dispatch<React.SetStateAction<Car[]>>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const initialCars: Car[] = [
  {
    car_id: 1,
    vin: '5YJSA1E21NF000001',
    license_plate: 'กข-1234',
    brand: 'Tesla',
    model: 'Model S Plaid',
    model_year: 2023,
    color: 'White',
    mileage: 8500,
    transmission: 'Auto',
    fuel_type: 'EV',
    purchase_price: 78000,
    selling_price: 89990,
    status: 'Available',
    purchase_date: '2023-05-10',
    sold_date: null,
    notes: 'Excellent condition, tri-motor AWD',
    image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=400&q=80',
    image_emoji: '⚡'
  },
  {
    car_id: 2,
    vin: 'WBS53AY00NC000002',
    license_plate: 'ชย-5678',
    brand: 'BMW',
    model: 'M3 Competition',
    model_year: 2022,
    color: 'Gray',
    mileage: 12400,
    transmission: 'Auto',
    fuel_type: 'Gasoline',
    purchase_price: 65000,
    selling_price: 74500,
    status: 'Available',
    purchase_date: '2022-09-15',
    sold_date: null,
    notes: '3.0L twin-turbo I6, pristine interior',
    image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80',
    image_emoji: '🏁'
  },
  {
    car_id: 3,
    vin: 'WP0AD2A90NS000003',
    license_plate: 'ฏภ-911',
    brand: 'Porsche',
    model: '911 GT3 RS',
    model_year: 2023,
    color: 'Green',
    mileage: 1800,
    transmission: 'Auto',
    fuel_type: 'Gasoline',
    purchase_price: 200000,
    selling_price: 223800,
    status: 'Available',
    purchase_date: '2023-11-20',
    sold_date: null,
    notes: 'Track-focused, 4.0L flat-6',
    image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80',
    image_emoji: '🏎️'
  },
  {
    car_id: 4,
    vin: '1FMCU0E10NK000004',
    license_plate: 'ฮม-4321',
    brand: 'Ford',
    model: 'Mustang Mach-E',
    model_year: 2022,
    color: 'Blue',
    mileage: 21500,
    transmission: 'Auto',
    fuel_type: 'EV',
    purchase_price: 38000,
    selling_price: 45990,
    status: 'Sold',
    purchase_date: '2022-04-05',
    sold_date: '2026-07-01',
    notes: 'Single motor RWD, minor scratches on rear bumper',
    image_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=400&q=80',
    image_emoji: '🔋'
  },
  {
    car_id: 5,
    vin: 'SALLS2D10NA000005',
    license_plate: 'รร-777',
    brand: 'Land Rover',
    model: 'Range Rover Sport',
    model_year: 2023,
    color: 'Black',
    mileage: 9500,
    transmission: 'Auto',
    fuel_type: 'Hybrid',
    purchase_price: 90000,
    selling_price: 104900,
    status: 'Available',
    purchase_date: '2023-07-18',
    sold_date: null,
    notes: '3.0L Turbo I6 MHEV, panoramic sunroof',
    image_url: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=400&q=80',
    image_emoji: '⛰️'
  },
  {
    car_id: 6,
    vin: 'JTDBA1D10NK000006',
    license_plate: 'สส-88',
    brand: 'Toyota',
    model: 'GR Supra',
    model_year: 2021,
    color: 'Red',
    mileage: 25300,
    transmission: 'Auto',
    fuel_type: 'Gasoline',
    purchase_price: 43000,
    selling_price: 50900,
    status: 'Sold',
    purchase_date: '2021-12-05',
    sold_date: '2026-07-05',
    notes: '3.0L Twin-scroll Turbo I6, custom exhaust',
    image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=400&q=80',
    image_emoji: '🇯🇵'
  }
];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<Car[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('carhub_cars_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved cars:', e);
        }
      }
    }
    return initialCars;
  });

  // Derived sales list based on cars with Sold status
  const sales: Sale[] = cars
    .filter((car) => car.status === 'Sold')
    .map((car) => ({
      id: `s_${car.car_id}`,
      carId: car.car_id.toString(),
      carName: `${car.model_year} ${car.brand} ${car.model}`,
      sellPrice: car.selling_price,
      sellDate: car.sold_date || new Date().toISOString().split('T')[0],
    }));

  // Save to localStorage when state changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('carhub_cars_v2', JSON.stringify(cars));
    }
  }, [cars]);

  // Fetch/sync products on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(PRODUCTS_URL);
        let fetchedData: Car[] = [];
        if (response.ok) {
          fetchedData = await response.json();
        } else {
          try {
            const localProducts = require('../../products.json');
            fetchedData = localProducts as Car[];
          } catch {
            fetchedData = initialCars;
          }
        }

        setCars((currentCars) => {
          const merged = [...currentCars];
          fetchedData.forEach((fetchedCar) => {
            const index = merged.findIndex((c) => c.car_id === fetchedCar.car_id);
            const fallbackCar = initialCars.find((c) => c.car_id === fetchedCar.car_id);
            
            const defaultFields = fallbackCar || {
              vin: 'VIN_UNKNOWN_' + fetchedCar.car_id,
              license_plate: 'PLATE_UNKNOWN',
              brand: fetchedCar.brand || 'Unknown',
              model: fetchedCar.model || 'Unknown',
              model_year: fetchedCar.model_year || 2023,
              color: fetchedCar.color || 'Unknown',
              mileage: fetchedCar.mileage || 10000,
              transmission: fetchedCar.transmission || 'Auto',
              fuel_type: fetchedCar.fuel_type || 'Gasoline',
              purchase_price: fetchedCar.purchase_price || 15000,
              selling_price: fetchedCar.selling_price || 20000,
              status: fetchedCar.status || 'Available',
              purchase_date: fetchedCar.purchase_date || new Date().toISOString().split('T')[0],
              sold_date: fetchedCar.sold_date || null,
              notes: fetchedCar.notes || '',
              image_url: fetchedCar.image_url,
              image_emoji: fetchedCar.image_emoji
            };

            if (index > -1) {
              merged[index] = {
                ...defaultFields,
                ...merged[index],
                ...fetchedCar,
              };
            } else {
              merged.push({
                ...defaultFields,
                ...fetchedCar,
              });
            }
          });
          return merged;
        });
      } catch (error) {
        console.warn('Could not fetch products on init:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const addCar = (newCarFields: Omit<Car, 'car_id' | 'status' | 'sold_date'>) => {
    const car: Car = {
      ...newCarFields,
      car_id: Date.now(),
      status: 'Available',
      sold_date: null,
    };
    setCars((prev) => [car, ...prev]);
  };

  const sellCar = (carId: number, sellPrice: number) => {
    const sellDate = new Date().toISOString().split('T')[0];
    setCars((prev) =>
      prev.map((c) =>
        c.car_id === carId
          ? { ...c, status: 'Sold', selling_price: sellPrice, sold_date: sellDate }
          : c
      )
    );
  };

  const deleteCar = (carId: number) => {
    setCars((prev) => prev.filter((c) => c.car_id !== carId));
  };

  const updateCar = (carId: number, updatedFields: Partial<Car>) => {
    setCars((prev) =>
      prev.map((c) => (c.car_id === carId ? { ...c, ...updatedFields } : c))
    );
  };

  return (
    <InventoryContext.Provider value={{ cars, sales, loading, addCar, sellCar, deleteCar, updateCar, setCars }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
