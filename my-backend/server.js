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
// NOTE: If you are NOT using login/register in your frontend yet (Slide 26),
// you can remove `authToken` middleware from the parameters of this route (e.g. app.get('/api/products', async(req, res) => ...))
app.get('/api/products', authToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM used_car_inventory ORDER BY updated_at DESC');
    res.json(rows);
  } catch (e) {
    console.error('Products Error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Basic endpoint to check if API is running (Slide 21)
app.get('/api', (req, res) => {
  res.send('API is running');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
