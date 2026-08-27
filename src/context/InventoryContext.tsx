import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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

export interface Order {
  id: number;
  car_id: number;
  user_id: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_address: string;
  delivery_type: 'pickup' | 'delivery';
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  brand?: string;
  model?: string;
  model_year?: number;
  selling_price?: number;
  license_plate?: string;
  image_emoji?: string;
  image_url?: string;
  buyer_username?: string;
}

export interface CreateOrderInput {
  car_id: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_address: string;
  delivery_type: 'pickup' | 'delivery';
}

// [SEARCH: API-CONNECT] จุดกำหนด URL เชื่อมต่อ Frontend ไปยัง Backend API
const API_BASE_URL = 'http://119.59.102.161:3024/api';

// [SEARCH: API-CALL-HELPER] ฟังก์ชันตัวกลางสำหรับยิง HTTP Request ไปยัง Backend
const makeApiCall = async (endpoint: string, token: string | null, options: any = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

interface InventoryContextType {
  cars: Car[];
  sales: Sale[];
  loading: boolean;
  addCar: (car: Omit<Car, 'car_id' | 'status' | 'sold_date'>) => Promise<void>;
  sellCar: (carId: number, sellPrice: number) => Promise<void>;
  deleteCar: (carId: number) => Promise<void>;
  updateCar: (carId: number, updatedFields: Partial<Car>) => Promise<void>;
  createOrder: (input: CreateOrderInput) => Promise<void>;
  uploadImage: (base64Image: string) => Promise<string>;
  setCars: React.Dispatch<React.SetStateAction<Car[]>>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const initialCars: Car[] = [];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const apiCall = (endpoint: string, options: any = {}) =>
    makeApiCall(endpoint, token, options);

  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<Car[]>([]);

  // Derived sales list from sold cars
  const sales: Sale[] = cars
    .filter((car) => car && car.status === 'Sold' && (car.car_id !== undefined && car.car_id !== null))
    .map((car) => ({
      id: `s_${car.car_id}`,
      carId: car.car_id.toString(),
      carName: `${car.model_year} ${car.brand} ${car.model}`,
      sellPrice: car.selling_price,
      sellDate: car.sold_date || new Date().toISOString().split('T')[0],
    }));

  // [SEARCH: GET-PRODUCTS] ดึงข้อมูลรายการรถทั้งหมดจาก Backend API (GET /api/products)
  useEffect(() => {
    async function loadProducts() {
      let fetchedData: Car[] = [];

      try {
        console.log('Fetching products from API:', `${API_BASE_URL}/products`);
        const data = await apiCall('/products');
        if (Array.isArray(data)) {
          fetchedData = data;
        }
      } catch (error: any) {
        console.warn('Could not fetch products from API:', error.message);
      }

      const normalizedData = fetchedData.map((fetchedCar) => {
        const fetchedId = fetchedCar.car_id || (fetchedCar as any).id || Math.floor(Math.random() * 100000);
        return {
          car_id: Number(fetchedId),
          vin: fetchedCar.vin || 'VIN_UNKNOWN_' + fetchedId,
          license_plate: fetchedCar.license_plate || (fetchedCar as any).location || 'PLATE_UNKNOWN',
          brand: fetchedCar.brand || 'Unknown',
          model: fetchedCar.model || (fetchedCar as any).name || 'Unknown',
          model_year: fetchedCar.model_year || 2023,
          color: fetchedCar.color || 'Unknown',
          mileage: fetchedCar.mileage || 10000,
          transmission: fetchedCar.transmission || 'Auto',
          fuel_type: fetchedCar.fuel_type || 'Gasoline',
          purchase_price: fetchedCar.purchase_price || 15000,
          selling_price: fetchedCar.selling_price || (fetchedCar as any).price || 20000,
          status: fetchedCar.status || 'Available',
          purchase_date: fetchedCar.purchase_date || new Date().toISOString().split('T')[0],
          sold_date: fetchedCar.sold_date || null,
          notes: fetchedCar.notes || '',
          image_url: fetchedCar.image_url || (fetchedCar as any).image,
          image_emoji: fetchedCar.image_emoji
        };
      });

      setCars(normalizedData);
      setLoading(false);
    }

    loadProducts();
  }, [token]);

  // [SEARCH: ADD-CAR] เพิ่มข้อมูลรถใหม่ (POST /api/products)
  const addCar = async (newCarFields: Omit<Car, 'car_id' | 'status' | 'sold_date'>) => {
    try {
      const savedCar = await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newCarFields,
          status: 'Available',
          sold_date: null,
        }),
      });
      setCars((prev) => [savedCar, ...prev]);
    } catch (error: any) {
      console.error('Failed to add car:', error.message);
      const fallbackCar: Car = {
        ...newCarFields,
        car_id: Date.now(),
        status: 'Available',
        sold_date: null,
      };
      setCars((prev) => [fallbackCar, ...prev]);
    }
  };

  // [SEARCH: SELL-CAR] ขายรถ / อัปเดตสถานะเป็น Sold (PATCH /api/products/:id)
  const sellCar = async (carId: number, sellPrice: number) => {
    const sellDate = new Date().toISOString().split('T')[0];
    try {
      await apiCall(`/products/${carId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Sold',
          selling_price: sellPrice,
          sold_date: sellDate,
        }),
      });
      setCars((prev) =>
        prev.map((c) =>
          c.car_id === carId
            ? { ...c, status: 'Sold', selling_price: sellPrice, sold_date: sellDate }
            : c
        )
      );
    } catch (error: any) {
      console.error('Failed to sell car:', error.message);
      setCars((prev) =>
        prev.map((c) =>
          c.car_id === carId
            ? { ...c, status: 'Sold', selling_price: sellPrice, sold_date: sellDate }
            : c
        )
      );
    }
  };

  // [SEARCH: DELETE-CAR] ลบข้อมูลรถ (DELETE /api/products/:id)
  const deleteCar = async (carId: number) => {
    try {
      await apiCall(`/products/${carId}`, {
        method: 'DELETE',
      });
      setCars((prev) => prev.filter((c) => c.car_id !== carId));
    } catch (error: any) {
      console.error('Failed to delete car:', error.message);
      setCars((prev) => prev.filter((c) => c.car_id !== carId));
    }
  };

  // [SEARCH: EDIT-CAR] แก้ไขข้อมูลรถ (PATCH /api/products/:id)
  const updateCar = async (carId: number, updatedFields: Partial<Car>) => {
    try {
      await apiCall(`/products/${carId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedFields),
      });
      setCars((prev) =>
        prev.map((c) => (c.car_id === carId ? { ...c, ...updatedFields } : c))
      );
    } catch (error: any) {
      console.error('Failed to update car:', error.message);
      setCars((prev) =>
        prev.map((c) => (c.car_id === carId ? { ...c, ...updatedFields } : c))
      );
    }
  };

  // [SEARCH: ORDER-CAR] สั่งซื้อรถ / สร้าง Order (POST /api/orders)
  const createOrder = async (input: CreateOrderInput) => {
    const result = await apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setCars((prev) =>
      prev.map((c) =>
        c.car_id === input.car_id ? { ...c, status: 'Reserved' } : c
      )
    );
    return result;
  };

  // [SEARCH: UPLOAD-IMAGE] อัปโหลดรูปภาพรถ (POST /api/upload)
  const uploadImage = async (base64Image: string): Promise<string> => {
    const result = await apiCall('/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    });
    return result.imageUrl;
  };

  return (
    <InventoryContext.Provider value={{ cars, sales, loading, addCar, sellCar, deleteCar, updateCar, createOrder, uploadImage, setCars }}>
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
