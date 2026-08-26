// ============================================================
// server.js — Backend API สำหรับระบบ Inventory รถยนต์มือสอง
// ============================================================
// เชื่อมต่อ: MySQL (ip_std6730202246) บน port 3024
// Auth:      JWT (jsonwebtoken) + bcrypt สำหรับ hash password
// RBAC:      role 'admin' และ 'user' — ดูรายละเอียดแต่ละ endpoint
// ============================================================

require('dotenv').config();         // โหลด .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET)
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3024;  // Port จาก .env หรือ default 3024

app.use(cors());                              // อนุญาต cross-origin request จาก frontend
app.use(express.json({ limit: '5mb' }));      // รับ JSON body สูงสุด 5MB (รองรับ image_url ยาวๆ)

// ─────────────────────────────────────────────────────────────
// MySQL Connection Pool
// เชื่อมต่อ DB ผ่าน pool เพื่อ reuse connection (ประสิทธิภาพดีกว่า)
// Config อ่านจาก .env ทั้งหมด
// ─────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'   // ใช้ timezone ไทย
});

// ─────────────────────────────────────────────────────────────
// initDB — ทำงานครั้งแรกตอน server start
// 1. ทดสอบ DB connection
// 2. สร้าง table `users` ถ้ายังไม่มี
// 3. สร้าง admin account เริ่มต้น (admin/admin123) ถ้ายังไม่มี
// ─────────────────────────────────────────────────────────────
(async function initDB() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);

    // สร้าง table users (เก็บข้อมูลผู้ใช้ระบบ)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // สร้าง table orders (เก็บคำสั่งซื้อจากผู้ใช้)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        car_id INT NOT NULL,
        user_id INT,
        buyer_name VARCHAR(100) NOT NULL,
        buyer_phone VARCHAR(20) NOT NULL,
        buyer_address TEXT NOT NULL,
        delivery_type ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup',
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // สร้าง admin เริ่มต้นอัตโนมัติ (เฉพาะครั้งแรก)
    const [existing] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await conn.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', hash, 'admin']
      );
      console.log('Default admin account created: admin / admin123');
    }

    conn.release();
  } catch (err) {
    console.error('MySQL Failed:', err.message);
    process.exit(1);
  }
})();

// JWT Secret key (ตั้งค่าใน .env ด้วย JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// ─────────────────────────────────────────────────────────────
// Middleware: authToken
// ตรวจสอบ JWT token ใน Authorization header
// ใช้กับ endpoint ที่ต้องการ login ก่อน
// ถ้าไม่มี token → 401 | token ผิด/หมดอายุ → 403
// ─────────────────────────────────────────────────────────────
function authToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // รูปแบบ: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access Token Required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or Expired Token' });
    }
    req.user = user;  // แนบข้อมูล user (id, username, role) ไปกับ request
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// Middleware: requireAdmin
// ใช้ต่อจาก authToken — block ถ้า role ไม่ใช่ 'admin'
// ใช้กับ endpoint ที่ admin เท่านั้นทำได้ (เพิ่ม/ลบรถ)
// ─────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// Middleware: optionalAuth
// เหมือน authToken แต่ไม่ block ถ้าไม่มี token
// req.user จะเป็น null ถ้าไม่ได้ login
// ใช้กับ GET /api/products เพื่อซ่อน VIN จาก guest/user
// ─────────────────────────────────────────────────────────────
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;  // token ผิด → ถือว่า guest
    } else {
      req.user = user;
    }
    next();
  });
}

// ═══════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// เชื่อมต่อกับ: src/context/AuthContext.tsx (frontend)
// ═══════════════════════════════════════════════════════════

// POST /api/auth/register
// รับ: { username, password }
// ส่งกลับ: { token, user } — สมัครแล้ว login อัตโนมัติ
// role ที่ได้: 'user' เสมอ (admin สร้างได้แค่ผ่าน DB โดยตรง)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);  // hash password ก่อนเก็บ
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, 'user']
    );

    // สร้าง JWT token อายุ 7 วัน
    const token = jwt.sign(
      { id: result.insertId, username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: result.insertId, username, role: 'user' }
    });
  } catch (e) {
    console.error('Register Error:', e.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
// รับ: { username, password }
// ส่งกลับ: { token, user } — frontend เก็บ token ใน AsyncStorage
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);  // เปรียบเทียบ hash
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (e) {
    console.error('Login Error:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
// ใช้ตอน app เปิดใหม่ — ตรวจสอบว่า token เก่าใน AsyncStorage ยังใช้ได้มั้ย
// ถ้าได้ → ส่ง user กลับ (auto-login)
app.get('/api/auth/me', authToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (e) {
    console.error('Me Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ═══════════════════════════════════════════════════════════
// PRODUCTS ENDPOINTS
// เชื่อมต่อกับ: src/context/InventoryContext.tsx (frontend)
// ตาราง DB: used_car_inventory
// ═══════════════════════════════════════════════════════════

// GET /api/products
// ทุกคนดูได้ (ไม่ต้อง login)
// RBAC: admin → เห็น VIN | user/guest → VIN ถูกซ่อน (vin: null)
app.get('/api/products', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM used_car_inventory ORDER BY updated_at DESC');

    const isAdmin = req.user && req.user.role === 'admin';
    const data = rows.map((row) => {
      if (!isAdmin) {
        // ซ่อน VIN สำหรับ user ทั่วไปและ guest
        const { vin, ...rest } = row;
        return { ...rest, vin: null };
      }
      return row;
    });

    res.json(data);
  } catch (e) {
    console.error('Products Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products — เพิ่มรถใหม่
// ต้อง login + เป็น admin เท่านั้น
// รับ: ข้อมูลรถทุก field (ดู Car interface ใน InventoryContext.tsx)
app.post('/api/products', authToken, requireAdmin, async (req, res) => {
  try {
    const {
      vin, license_plate, brand, model, model_year, color, mileage,
      transmission, fuel_type, purchase_price, selling_price, status,
      purchase_date, sold_date, notes, image_url, image_emoji
    } = req.body;

    const query = `
      INSERT INTO used_car_inventory (
        vin, license_plate, brand, model, model_year, color, mileage,
        transmission, fuel_type, purchase_price, selling_price, status,
        purchase_date, sold_date, notes, image_url, image_emoji
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      vin, license_plate, brand, model, model_year, color, mileage,
      transmission, fuel_type, purchase_price, selling_price, status || 'Available',
      purchase_date, sold_date || null, notes || null, image_url || null, image_emoji || null
    ]);

    const newCar = {
      car_id: result.insertId,
      vin, license_plate, brand, model, model_year, color, mileage,
      transmission, fuel_type, purchase_price, selling_price, status: status || 'Available',
      purchase_date, sold_date: sold_date || null, notes: notes || null,
      image_url: image_url || null, image_emoji: image_emoji || null
    };

    res.status(201).json(newCar);
  } catch (e) {
    console.error('Add Product Error:', e.message);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// PATCH /api/products/:id — แก้ไขข้อมูลรถ
// admin: แก้ไขได้ทุก field
// user:  แก้ได้เฉพาะ status='Sold', selling_price, sold_date (สำหรับการซื้อ)
app.patch('/api/products/:id', authToken, async (req, res) => {
  const carId = req.params.id;
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // จำกัดสิทธิ์ user role — ทำได้แค่ขาย (mark as Sold)
  if (req.user.role === 'user') {
    const allowedKeys = ['status', 'selling_price', 'sold_date'];
    const requestedKeys = Object.keys(updates);
    const hasDisallowed = requestedKeys.some((k) => !allowedKeys.includes(k));

    if (hasDisallowed || updates.status !== 'Sold') {
      return res.status(403).json({ error: 'Users can only mark cars as Sold' });
    }
  }

  try {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      // ข้าม field ที่ไม่ควร update โดยตรง
      if (key === 'car_id' || key === 'id' || key === 'created_at' || key === 'updated_at') continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(carId);
    const query = `UPDATE used_car_inventory SET ${fields.join(', ')} WHERE car_id = ?`;
    await pool.query(query, values);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (e) {
    console.error('Update Product Error:', e.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — ลบรถ
// ต้อง login + เป็น admin เท่านั้น
app.delete('/api/products/:id', authToken, requireAdmin, async (req, res) => {
  const carId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM used_car_inventory WHERE car_id = ?', [carId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (e) {
    console.error('Delete Product Error:', e.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ═══════════════════════════════════════════════════════════
// ORDERS ENDPOINTS
// เชื่อมต่อกับ: src/app/orders.tsx และ src/context/InventoryContext.tsx
// ตาราง DB: orders
// ═══════════════════════════════════════════════════════════

// POST /api/orders — สร้างคำสั่งซื้อใหม่
// ต้อง login (user หรือ admin)
// รับ: { car_id, buyer_name, buyer_phone, buyer_address, delivery_type }
// ผล: สร้าง order + เปลี่ยนสถานะรถเป็น 'Reserved'
app.post('/api/orders', authToken, async (req, res) => {
  try {
    const { car_id, buyer_name, buyer_phone, buyer_address, delivery_type } = req.body;

    if (!car_id || !buyer_name || !buyer_phone || !buyer_address || !delivery_type) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    if (!['pickup', 'delivery'].includes(delivery_type)) {
      return res.status(400).json({ error: 'delivery_type ต้องเป็น pickup หรือ delivery' });
    }

    // ตรวจสอบว่ารถมีอยู่และยังว่างอยู่
    const [cars] = await pool.query('SELECT * FROM used_car_inventory WHERE car_id = ?', [car_id]);
    if (cars.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรถคันนี้' });
    }
    if (cars[0].status !== 'Available') {
      return res.status(409).json({ error: 'รถคันนี้ไม่สามารถสั่งซื้อได้ในขณะนี้' });
    }

    // สร้าง order
    const [result] = await pool.query(
      'INSERT INTO orders (car_id, user_id, buyer_name, buyer_phone, buyer_address, delivery_type) VALUES (?, ?, ?, ?, ?, ?)',
      [car_id, req.user.id, buyer_name.trim(), buyer_phone.trim(), buyer_address.trim(), delivery_type]
    );

    // เปลี่ยนสถานะรถเป็น Reserved (รอ admin อนุมัติ)
    await pool.query('UPDATE used_car_inventory SET status = ? WHERE car_id = ?', ['Reserved', car_id]);

    res.status(201).json({
      message: 'ส่งคำสั่งซื้อสำเร็จ รอการอนุมัติจาก Admin',
      order_id: result.insertId
    });
  } catch (e) {
    console.error('Create Order Error:', e.message);
    res.status(500).json({ error: 'ไม่สามารถสร้างคำสั่งซื้อได้' });
  }
});

// GET /api/orders — ดูคำสั่งซื้อทั้งหมด
// Admin only — เห็นทุก order พร้อมข้อมูลรถและผู้ซื้อ
app.get('/api/orders', authToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        o.*,
        c.brand, c.model, c.model_year, c.selling_price,
        c.license_plate, c.image_emoji, c.image_url,
        u.username as buyer_username
      FROM orders o
      LEFT JOIN used_car_inventory c ON o.car_id = c.car_id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error('Get Orders Error:', e.message);
    res.status(500).json({ error: 'ไม่สามารถโหลดคำสั่งซื้อได้' });
  }
});

// PATCH /api/orders/:id — อนุมัติหรือปฏิเสธคำสั่งซื้อ
// Admin only
// รับ: { status: 'approved'|'rejected', admin_note? }
// ถ้า approved → รถเปลี่ยนเป็น Sold
// ถ้า rejected → รถกลับเป็น Available
app.patch('/api/orders/:id', authToken, requireAdmin, async (req, res) => {
  const orderId = req.params.id;
  const { status, admin_note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status ต้องเป็น approved หรือ rejected' });
  }

  try {
    // ดึงข้อมูล order
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    const order = orders[0];
    if (order.status !== 'pending') {
      return res.status(409).json({ error: 'คำสั่งซื้อนี้ถูกดำเนินการแล้ว' });
    }

    // อัปเดตสถานะ order
    await pool.query(
      'UPDATE orders SET status = ?, admin_note = ? WHERE id = ?',
      [status, admin_note || null, orderId]
    );

    // อัปเดตสถานะรถตาม decision
    const carStatus = status === 'approved' ? 'Sold' : 'Available';
    const soldDate = status === 'approved' ? new Date().toISOString().split('T')[0] : null;
    await pool.query(
      'UPDATE used_car_inventory SET status = ?, sold_date = ? WHERE car_id = ?',
      [carStatus, soldDate, order.car_id]
    );

    res.json({
      message: status === 'approved' ? 'อนุมัติคำสั่งซื้อแล้ว' : 'ปฏิเสธคำสั่งซื้อแล้ว',
      status
    });
  } catch (e) {
    console.error('Update Order Error:', e.message);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตคำสั่งซื้อได้' });
  }
});

// GET /api — Health check ตรวจสอบว่า server ทำงานอยู่
app.get('/api', (req, res) => {
  res.send('API is running');
});

// เริ่ม server รับ request จากทุก interface (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
