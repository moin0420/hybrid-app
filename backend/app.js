require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Ensure DB_URL exists
if (!process.env.DB_URL) {
  console.error("❌ DB_URL not set in .env file");
  process.exit(1);
}

// PostgreSQL pool with conditional SSL
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL.includes("render")
    ? { rejectUnauthorized: false }
    : false,
});

// Initialize DB table if not exists
const initializeDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        client_name TEXT,
        requirement_id TEXT,
        job_title TEXT,
        status TEXT DEFAULT 'Open',
        slots INT DEFAULT 1,
        assigned_recruiter TEXT,
        working TEXT
      );
    `);
    console.log("✅ DB initialized");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
};

// API routes
app.get('/api/requirements', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM requirements ORDER BY id ASC;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

app.post('/api/requirements', async (req, res) => {
  try {
    const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO requirements (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *;`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add requirement' });
  }
});

app.put('/api/requirements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

    // Lock logic: only one row can have working = 'Yes'
    if (working && working.toLowerCase() === 'yes') {
      const { rows: workingRows } = await pool.query(
        `SELECT * FROM requirements WHERE working='Yes' AND id<>$1;`, [id]
      );
      if (workingRows.length > 0) {
        return res.json({ error: "You're already working on another req, please reset it first." });
      }
    }

    const { rows } = await pool.query(
      `UPDATE requirements SET client_name=$1, requirement_id=$2, job_title=$3, status=$4, slots=$5, assigned_recruiter=$6, working=$7
       WHERE id=$8 RETURNING *;`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`🌐 Using ${process.env.DB_URL.includes("render") ? "Render Database" : "Local Database"}`);
  await initializeDB();
});
