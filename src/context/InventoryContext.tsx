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
  addCar: (car: Omit<Car, 'id' | 'status'>) => void;
  sellCar: (carId: string, sellPrice: number) => void;
  deleteCar: (carId: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const initialCars: Car[] = [
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
    sellPrice: 44500,
    sellDate: '2026-07-01',
    imageEmoji: '🔋',
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
    sellPrice: 49800,
    sellDate: '2026-07-05',
    imageEmoji: '🇯🇵',
  },
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

  return (
    <InventoryContext.Provider value={{ cars, sales, addCar, sellCar, deleteCar }}>
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
