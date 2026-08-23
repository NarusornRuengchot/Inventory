require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3024;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'
});

// Test connection and setup users table on startup
(async function initDB() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);

    // Create users table if not exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin if not exists
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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// ─────────────────────────────────────────
// Middleware: Verify JWT token
// ─────────────────────────────────────────
function authToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Token Required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or Expired Token' });
    }
    req.user = user;
    next();
  });
}

// ─────────────────────────────────────────
// Middleware: Admin only
// ─────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ─────────────────────────────────────────
// Middleware: Optional auth (ไม่ block ถ้าไม่มี token)
// ─────────────────────────────────────────
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

// ─────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────

// POST /api/auth/register — สร้าง user ใหม่ (role = user เสมอ)
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

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, 'user']
    );

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
    const isMatch = await bcrypt.compare(password, user.password_hash);
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

// GET /api/auth/me — ดึงข้อมูล user จาก token (สำหรับ auto-login)
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

// ─────────────────────────────────────────
// PRODUCTS ENDPOINTS
// ─────────────────────────────────────────

// GET /api/products — ทุก role เห็นได้ แต่ User/Guest ไม่เห็น VIN
app.get('/api/products', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM used_car_inventory ORDER BY updated_at DESC');

    // ถ้า role เป็น admin ให้เห็น VIN, อื่นๆ ซ่อน VIN
    const isAdmin = req.user && req.user.role === 'admin';
    const data = rows.map((row) => {
      if (!isAdmin) {
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

// POST /api/products — Admin only
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

// PATCH /api/products/:id
// Admin: แก้ไขได้ทุก field
// User: แก้ได้เฉพาะ status='Sold', selling_price, sold_date (สำหรับการซื้อ)
app.patch('/api/products/:id', authToken, async (req, res) => {
  const carId = req.params.id;
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // ถ้า user role ให้ทำได้แค่ซื้อ (เปลี่ยน status เป็น Sold เท่านั้น)
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

// DELETE /api/products/:id — Admin only
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

// Basic health check
app.get('/api', (req, res) => {
  res.send('API is running');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
