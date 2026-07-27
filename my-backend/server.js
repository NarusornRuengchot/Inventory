require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3024; // This port should match the assigned port in slide 13

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// MySQL Connection Pool (Slide 15)
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

// Test connection on startup (Slide 15)
(async function testMySQL() {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('MySQL Failed:', err.message);
    process.exit(1);
  }
})();

// JWT Secret from .env or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// Middleware for checking token (Slide 22)
function authToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Token Required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid Token' });
    }
    req.user = user;
    next();
  });
}

// Get products endpoint (Slide 15 + Slide 22)
// NOTE: Exposing publicly since frontend has no login/token system yet.
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM used_car_inventory ORDER BY updated_at DESC');
    res.json(rows);
  } catch (e) {
    console.error('Products Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add new product
app.post('/api/products', async (req, res) => {
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

// Update product partially
app.patch('/api/products/:id', async (req, res) => {
  const carId = req.params.id;
  const updates = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
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

// Delete product
app.delete('/api/products/:id', async (req, res) => {
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

// Basic endpoint to check if API is running (Slide 21)
app.get('/api', (req, res) => {
  res.send('API is running');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
