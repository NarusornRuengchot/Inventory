// ============================================================
// InventoryContext.tsx — ระบบจัดการข้อมูล Inventory รถยนต์
// ============================================================
// ให้บริการ: cars[], sales[], addCar(), sellCar(), deleteCar(), updateCar()
// เชื่อมต่อ: GET    /api/products        → โหลดข้อมูลรถทั้งหมด
//            POST   /api/products        → เพิ่มรถ (admin)
//            PATCH  /api/products/:id   → แก้ไข/ขายรถ
//            DELETE /api/products/:id   → ลบรถ (admin)
// Auth:     ส่ง JWT token ทุก request ผ่าน makeApiCall()
// Fallback: ถ้า API ล้มเหลว → อัปเดต local state แทน (ไม่ crash)
// ============================================================

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────
// Types — โครงสร้างข้อมูลรถยนต์ (ตรงกับ column ใน DB)
// ─────────────────────────────────────────
export interface Car {
  car_id: number;
  vin: string;              // เลขตัวถัง — ซ่อนจาก user/guest (backend ส่ง null)
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

  // UI helper fields (เก็บใน DB แต่ optional)
  image_url?: string;       // รูปภาพรถ (URL จาก Unsplash หรืออื่นๆ)
  image_emoji?: string;     // emoji แสดงแทนรูปถ้าไม่มี image_url
}

// ───────────────────────────────────────
// Type — โครงสร้างข้อมูลการขาย
// Derived จาก cars ที่มี status = 'Sold'
// ───────────────────────────────────────
export interface Sale {
  id: string;
  carId: string;
  carName: string;
  sellPrice: number;
  sellDate: string;
}

// ───────────────────────────────────────
// Type — โครงสร้างคำสั่งซื้อ (ใช้ในหน้า orders.tsx)
// ───────────────────────────────────────
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
  // joined fields from DB
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

// URL ของ Backend API (ต้องตรงกับ AuthContext.tsx)
const API_BASE_URL = 'http://119.59.102.161:3024/api';

// ─────────────────────────────────────────
// makeApiCall — Helper สำหรับเรียก API พร้อม JWT token
// ใช้แทนทุก fetch() call ใน context นี้
// ─────────────────────────────────────────
const makeApiCall = async (endpoint: string, token: string | null, options: any = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),  // แนบ token ถ้ามี
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

// ───────────────────────────────────────
// Context Type — สิ่งที่ส่งออกให้ component อื่นใช้
// ───────────────────────────────────────
interface InventoryContextType {
  cars: Car[];
  sales: Sale[];
  loading: boolean;
  addCar: (car: Omit<Car, 'car_id' | 'status' | 'sold_date'>) => Promise<void>;
  sellCar: (carId: number, sellPrice: number) => Promise<void>;
  deleteCar: (carId: number) => Promise<void>;
  updateCar: (carId: number, updatedFields: Partial<Car>) => Promise<void>;
  createOrder: (input: CreateOrderInput) => Promise<void>;
  setCars: React.Dispatch<React.SetStateAction<Car[]>>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const initialCars: Car[] = [];

// ─────────────────────────────────────────
// InventoryProvider — Wrapper ที่ครอบ component tree
// จัดการ state ของ cars และ CRUD operations ทั้งหมด
// ─────────────────────────────────────────
export function InventoryProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();  // ดึง JWT token จาก AuthContext

  // Shorthand ไม่ต้องส่ง token ทุกครั้ง
  const apiCall = (endpoint: string, options: any = {}) =>
    makeApiCall(endpoint, token, options);

  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<Car[]>([]);

  // ─── Derived: สร้าง sales list จาก cars ที่ขายแล้ว ───
  // ไม่ต้องเก็บ sales แยกต่างหาก — derive จาก cars ที่มี status = 'Sold'
  const sales: Sale[] = cars
    .filter((car) => car && car.status === 'Sold' && (car.car_id !== undefined && car.car_id !== null))
    .map((car) => ({
      id: `s_${car.car_id}`,
      carId: car.car_id.toString(),
      carName: `${car.model_year} ${car.brand} ${car.model}`,
      sellPrice: car.selling_price,
      sellDate: car.sold_date || new Date().toISOString().split('T')[0],
    }));

  // ─── โหลดข้อมูลรถจาก API ───
  // ทำงานตอน mount และทุกครั้งที่ token เปลี่ยน (login/logout)
  useEffect(() => {
    async function loadProducts() {
      let fetchedData: Car[] = [];

      try {
        console.log('Fetching products from cloud DB API:', `${API_BASE_URL}/products`);
        const data = await apiCall('/products');
        if (Array.isArray(data)) {
          fetchedData = data;
          console.log(`Loaded ${data.length} products from cloud DB`);
        }
      } catch (error: any) {
        console.warn('Could not fetch products from cloud DB API:', error.message);
      }

      // Normalize: แปลงข้อมูลให้ตรงกับ Car type เสมอ (ป้องกัน undefined)
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
  }, [token]);  // re-fetch เมื่อ token เปลี่ยน (เช่น login แล้ว admin เห็น VIN)

  // ─── addCar — เพิ่มรถใหม่ (admin only) ───
  // POST /api/products → เก็บใน DB แล้ว prepend ใน state
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
      setCars((prev) => [savedCar, ...prev]);  // เพิ่มรถใหม่ขึ้นหน้าสุด
    } catch (error: any) {
      console.error('Failed to add car to database:', error.message);
      // Fallback: เพิ่มใน local state ถ้า API ล้มเหลว
      const fallbackCar: Car = {
        ...newCarFields,
        car_id: Date.now(),
        status: 'Available',
        sold_date: null,
      };
      setCars((prev) => [fallbackCar, ...prev]);
    }
  };

  // ─── sellCar — ขายรถ (user และ admin ทำได้) ───
  // PATCH /api/products/:id → เปลี่ยน status เป็น 'Sold'
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
      console.error('Failed to sell car in database:', error.message);
      // Fallback: อัปเดต local state
      setCars((prev) =>
        prev.map((c) =>
          c.car_id === carId
            ? { ...c, status: 'Sold', selling_price: sellPrice, sold_date: sellDate }
            : c
        )
      );
    }
  };

  // ─── deleteCar — ลบรถ (admin only) ───
  // DELETE /api/products/:id
  const deleteCar = async (carId: number) => {
    try {
      await apiCall(`/products/${carId}`, {
        method: 'DELETE',
      });
      setCars((prev) => prev.filter((c) => c.car_id !== carId));
    } catch (error: any) {
      console.error('Failed to delete car from database:', error.message);
      // Fallback: ลบออกจาก local state
      setCars((prev) => prev.filter((c) => c.car_id !== carId));
    }
  };

  // ─── updateCar — แก้ไขข้อมูลรถ (admin only) ───
  // PATCH /api/products/:id ด้วย fields ที่ต้องการแก้
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
      console.error('Failed to update car in database:', error.message);
      // Fallback: อัปเดต local state
      setCars((prev) =>
        prev.map((c) => (c.car_id === carId ? { ...c, ...updatedFields } : c))
      );
    }
  };

  // ─── createOrder — สร้างคำสั่งซื้อ (user ทำได้) ───
  // POST /api/orders → สร้าง order และเปลี่ยนรถเป็น Reserved
  const createOrder = async (input: CreateOrderInput) => {
    const result = await apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    // อัปเดต local state ให้รถแสดง Reserved ทันทีแบบไม่ต้อง re-fetch
    setCars((prev) =>
      prev.map((c) =>
        c.car_id === input.car_id ? { ...c, status: 'Reserved' } : c
      )
    );
    return result;
  };

  return (
    <InventoryContext.Provider value={{ cars, sales, loading, addCar, sellCar, deleteCar, updateCar, createOrder, setCars }}>
      {children}
    </InventoryContext.Provider>
  );
}

// ─────────────────────────────────────────
// Hook: useInventory()
// วิธีใช้: const { cars, sales, addCar, sellCar } = useInventory();
// ต้องอยู่ภายใต้ <InventoryProvider> เสมอ (จัดการใน _layout.tsx)
// ─────────────────────────────────────────
export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
