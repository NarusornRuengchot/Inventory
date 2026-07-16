import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: 'Available' | 'Sold';
  type: 'Sedan' | 'SUV' | 'Sports' | 'Electric' | 'Coupe';
  mileage: number;
  engine: string;
  sellPrice?: number;
  sellDate?: string;
  imageEmoji: string;

  // Slide 4 matching fields
  name?: string;
  stock?: number;
  stock_text?: string;
  category?: string;
  location_count?: number;
  location_text?: string;
  badge_status?: string;
  image_url?: string;
}

export interface Sale {
  id: string;
  carId: string;
  carName: string;
  sellPrice: number;
  sellDate: string;
}

interface InventoryContextType {
  cars: Car[];
  sales: Sale[];
  loading: boolean;
  addCar: (car: Omit<Car, 'id' | 'status'>) => void;
  sellCar: (carId: string, sellPrice: number) => void;
  deleteCar: (carId: string) => void;
  updateCar: (carId: string, updatedFields: Partial<Car>) => void;
  setCars: React.Dispatch<React.SetStateAction<Car[]>>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const initialCars: Car[] = [
  {
    id: '1',
    make: 'Tesla',
    model: 'Model S Plaid',
    year: 2023,
    price: 89990,
    status: 'Available',
    type: 'Electric',
    mileage: 8500,
    engine: 'Tri-Motor AWD',
    imageEmoji: '⚡',
    name: 'Tesla Model S Plaid (2023)',
    stock: 1,
    stock_text: '1 in stock',
    category: 'Electric',
    location_count: 2,
    location_text: '2 showrooms',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: '2',
    make: 'BMW',
    model: 'M3 Competition',
    year: 2022,
    price: 74500,
    status: 'Available',
    type: 'Sports',
    mileage: 12400,
    engine: '3.0L Twin-Turbo I6',
    imageEmoji: '🏁',
    name: 'BMW M3 Competition (2022)',
    stock: 1,
    stock_text: '1 in stock',
    category: 'Sports',
    location_count: 3,
    location_text: '3 showrooms',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: '3',
    make: 'Porsche',
    model: '911 GT3 RS',
    year: 2023,
    price: 223800,
    status: 'Available',
    type: 'Sports',
    mileage: 1800,
    engine: '4.0L Flat-6',
    imageEmoji: '🏎️',
    name: 'Porsche 911 GT3 RS (2023)',
    stock: 1,
    stock_text: '1 in stock',
    category: 'Sports',
    location_count: 1,
    location_text: '1 showroom',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: '4',
    make: 'Ford',
    model: 'Mustang Mach-E',
    year: 2022,
    price: 45990,
    status: 'Sold',
    type: 'SUV',
    mileage: 21500,
    engine: 'Single Motor RWD',
    imageEmoji: '🔋',
    sellPrice: 44500,
    sellDate: '2026-07-01',
    name: 'Ford Mustang Mach-E (2022)',
    stock: 0,
    stock_text: 'Out of stock',
    category: 'SUV',
    location_count: 0,
    location_text: '0 showrooms',
    badge_status: 'Low in stock',
    image_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: '5',
    make: 'Land Rover',
    model: 'Range Rover Sport',
    year: 2023,
    price: 104900,
    status: 'Available',
    type: 'SUV',
    mileage: 9500,
    engine: '3.0L Turbo I6 MHEV',
    imageEmoji: '⛰️',
    name: 'Range Rover Sport (2023)',
    stock: 1,
    stock_text: '1 in stock',
    category: 'SUV',
    location_count: 2,
    location_text: '2 showrooms',
    badge_status: 'Active',
    image_url: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: '6',
    make: 'Toyota',
    model: 'GR Supra',
    year: 2021,
    price: 50900,
    status: 'Sold',
    type: 'Sports',
    mileage: 25300,
    engine: '3.0L Turbo I6',
    imageEmoji: '🇯🇵',
    sellPrice: 49800,
    sellDate: '2026-07-05',
    name: 'Toyota GR Supra (2021)',
    stock: 0,
    stock_text: 'Out of stock',
    category: 'Sports',
    location_count: 0,
    location_text: '0 showrooms',
    badge_status: 'Low in stock',
    image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=400&q=80'
  }
];

const initialSales: Sale[] = [
  {
    id: 's1',
    carId: '4',
    carName: '2022 Ford Mustang Mach-E',
    sellPrice: 44500,
    sellDate: '2026-07-01',
  },
  {
    id: 's2',
    carId: '6',
    carName: '2021 Toyota GR Supra',
    sellPrice: 49800,
    sellDate: '2026-07-05',
  },
];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  // Load initial state with localStorage support for web
  const [cars, setCars] = useState<Car[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('carhub_cars');
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

  const [sales, setSales] = useState<Sale[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('carhub_sales');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved sales:', e);
        }
      }
    }
    return initialSales;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('carhub_cars', JSON.stringify(cars));
    }
  }, [cars]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('carhub_sales', JSON.stringify(sales));
    }
  }, [sales]);

  // Fetch from GitHub raw URL on mount to load/sync and auto-heal missing fields
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('https://raw.githubusercontent.com/NarusornRuengchot/Inventory/refs/heads/master/products.json');
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
            const index = merged.findIndex((c) => c.id === fetchedCar.id);
            const fallbackCar = initialCars.find((c) => c.id === fetchedCar.id);
            const defaultFields = fallbackCar || {
              make: fetchedCar.name ? fetchedCar.name.split(' ')[0] : 'Unknown',
              model: fetchedCar.name ? fetchedCar.name.replace(/^[^\s]+\s+/, '').replace(/\s*\(\d{4}\)$/, '') : 'Unknown',
              year: fetchedCar.name ? parseInt(fetchedCar.name.match(/\((\d{4})\)/)?.[1] || '2023') : 2023,
              price: fetchedCar.category === 'Electric' ? 89990 : fetchedCar.category === 'Sports' ? 74500 : 45990,
              type: (fetchedCar.category as any) || 'Sedan',
              mileage: 10000,
              engine: 'Turbo I4',
              imageEmoji: fetchedCar.category === 'Electric' ? '⚡' : fetchedCar.category === 'Sports' ? '🏎️' : '🚗',
            };

            if (index > -1) {
              merged[index] = {
                ...defaultFields,
                ...merged[index],
                ...fetchedCar,
                make: merged[index].make || defaultFields.make,
                model: merged[index].model || defaultFields.model,
                year: merged[index].year || defaultFields.year,
                price: merged[index].price || defaultFields.price,
                type: merged[index].type || defaultFields.type,
                mileage: merged[index].mileage || defaultFields.mileage,
                engine: merged[index].engine || defaultFields.engine,
                imageEmoji: merged[index].imageEmoji || defaultFields.imageEmoji,
                status: merged[index].status || 'Available',
                sellPrice: merged[index].sellPrice,
                sellDate: merged[index].sellDate,
              };
            } else {
              merged.push({
                ...defaultFields,
                ...fetchedCar,
                status: 'Available',
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

  const addCar = (newCar: Omit<Car, 'id' | 'status'>) => {
    const car: Car = {
      ...newCar,
      id: Date.now().toString(),
      status: 'Available',
    };
    setCars((prev) => [car, ...prev]);
  };

  const sellCar = (carId: string, sellPrice: number) => {
    const sellDate = new Date().toISOString().split('T')[0];
    
    setCars((prev) =>
      prev.map((c) =>
        c.id === carId ? { ...c, status: 'Sold', sellPrice, sellDate } : c
      )
    );

    const carToSell = cars.find((c) => c.id === carId);
    if (carToSell) {
      const sale: Sale = {
        id: `s_${Date.now()}`,
        carId,
        carName: `${carToSell.year} ${carToSell.make} ${carToSell.model}`,
        sellPrice,
        sellDate,
      };
      setSales((prev) => [sale, ...prev]);
    }
  };

  const deleteCar = (carId: string) => {
    setCars((prev) => prev.filter((c) => c.id !== carId));
    setSales((prev) => prev.filter((s) => s.carId !== carId));
  };

  const updateCar = (carId: string, updatedFields: Partial<Car>) => {
    setCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, ...updatedFields } : c))
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
