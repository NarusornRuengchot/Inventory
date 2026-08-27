require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3024;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Static uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// [SEARCH: DB-CONNECT] จุดเชื่อมต่อ Database MySQL โดยตรงผ่าน Connection Pool
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

// [SEARCH: DB-INIT] จุดทดสอบเชื่อมต่อ Database และสร้างตารางอัตโนมัติ
(async function initDB() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);

    // Users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
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

    // Create default admin account if not exists
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

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// Middleware: Verify JWT
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

// Middleware: Admin access only
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Middleware: Optional JWT check for guests
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

// --- Auth Routes ---

// [SEARCH: REGISTER-API] สมัครสมาชิก (บันทึก User ใหม่ลง Database)
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

// [SEARCH: LOGIN-API] เข้าสู่ระบบ (ตรวจสอบรหัสผ่านกับ Database และออก JWT Token)
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

// [SEARCH: GET-CURRENT-USER-API] ดึงข้อมูลผู้ใช้ปัจจุบันจาก Database
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

// --- Product Routes ---

// [SEARCH: GET-PRODUCTS-DB] ดึงรายการรถยนต์ทั้งหมดจากตาราง used_car_inventory
app.get('/api/products', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM used_car_inventory ORDER BY updated_at DESC');

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

// [SEARCH: ADD-CAR-DB] เพิ่มข้อมูลรถยนต์ใหม่ลงตาราง used_car_inventory (Admin only)
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

// [SEARCH: EDIT-CAR-DB] แก้ไขข้อมูลรถยนต์ในตาราง used_car_inventory
app.patch('/api/products/:id', authToken, async (req, res) => {
  const carId = req.params.id;
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // Users can only mark car as Sold
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

// [SEARCH: DELETE-CAR-DB] ลบข้อมูลรถยนต์ออกจากตาราง used_car_inventory (Admin only)
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

// --- Order Routes ---

// [SEARCH: ORDER-CAR-DB] สร้าง Order สั่งซื้อรถยนต์ลงตาราง orders
app.post('/api/orders', authToken, async (req, res) => {
  try {
    const { car_id, buyer_name, buyer_phone, buyer_address, delivery_type } = req.body;

    if (!car_id || !buyer_name || !buyer_phone || !buyer_address || !delivery_type) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }
    if (!['pickup', 'delivery'].includes(delivery_type)) {
      return res.status(400).json({ error: 'Invalid delivery type' });
    }

    const [cars] = await pool.query('SELECT * FROM used_car_inventory WHERE car_id = ?', [car_id]);
    if (cars.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    if (cars[0].status !== 'Available') {
      return res.status(409).json({ error: 'This car is not available for purchase' });
    }

    const [result] = await pool.query(
      'INSERT INTO orders (car_id, user_id, buyer_name, buyer_phone, buyer_address, delivery_type) VALUES (?, ?, ?, ?, ?, ?)',
      [car_id, req.user.id, buyer_name.trim(), buyer_phone.trim(), buyer_address.trim(), delivery_type]
    );

    await pool.query('UPDATE used_car_inventory SET status = ? WHERE car_id = ?', ['Reserved', car_id]);

    res.status(201).json({
      message: 'Order created successfully',
      order_id: result.insertId
    });
  } catch (e) {
    console.error('Create Order Error:', e.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// [SEARCH: GET-ORDERS-DB] ดึงรายการ Orders พร้อม JOIN ตาราง used_car_inventory และ users
app.get('/api/orders', authToken, async (req, res) => {
  try {
    let query = `
      SELECT
        o.*,
        c.brand, c.model, c.model_year, c.selling_price,
        c.license_plate, c.image_emoji, c.image_url,
        u.username as buyer_username
      FROM orders o
      LEFT JOIN used_car_inventory c ON o.car_id = c.car_id
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      query += ` WHERE o.user_id = ? `;
      params.push(req.user.id);
    }

    query += ` ORDER BY o.created_at DESC `;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error('Get Orders Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// [SEARCH: APPROVE-ORDER-DB] อนุมัติ / ปฏิเสธ Order และอัปเดตสถานะรถใน Database (Admin only)
app.patch('/api/orders/:id', authToken, requireAdmin, async (req, res) => {
  const orderId = req.params.id;
  const { status, admin_note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];
    if (order.status !== 'pending') {
      return res.status(409).json({ error: 'Order already processed' });
    }

    await pool.query(
      'UPDATE orders SET status = ?, admin_note = ? WHERE id = ?',
      [status, admin_note || null, orderId]
    );

    const carStatus = status === 'approved' ? 'Sold' : 'Available';
    const soldDate = status === 'approved' ? new Date().toISOString().split('T')[0] : null;
    await pool.query(
      'UPDATE used_car_inventory SET status = ?, sold_date = ? WHERE car_id = ?',
      [carStatus, soldDate, order.car_id]
    );

    res.json({
      message: status === 'approved' ? 'Order approved' : 'Order rejected',
      status
    });
  } catch (e) {
    console.error('Update Order Error:', e.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// --- Upload Routes ---

// [SEARCH: UPLOAD-IMAGE-API] รับภาพ Base64 จาก Frontend แล้วบันทึกไฟล์ลงโฟลเดอร์ uploads
app.post('/api/upload', authToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 3) {
      const mimeType = matches[1].toLowerCase();
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';
      else if (mimeType.includes('gif')) ext = 'gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const uniqueName = `car_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    const host = req.get('host') || `119.59.102.161:${port}`;
    const protocol = req.protocol || 'http';
    const imageUrl = `${protocol}://${host}/uploads/${uniqueName}`;

    res.json({
      message: 'Image uploaded successfully',
      imageUrl,
      filename: uniqueName
    });
  } catch (e) {
    console.error('Upload Error:', e.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Health check
app.get('/api', (req, res) => {
  res.send('API is running');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
