// backend/app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const isProduction = !!process.env.DB_URL;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("../frontend/build"));

// DB setup
const pool = new Pool({
  connectionString: isProduction ? process.env.DB_URL : undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initializeDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        client_name TEXT,
        requirement_id TEXT,
        job_title TEXT,
        status TEXT DEFAULT 'Open',
        slots INT DEFAULT 1,
        assigned_recruiter TEXT,
        working TEXT
      )
    `);
    console.log("DB initialized");
  } catch (err) {
    console.error("DB init error:", err);
  } finally {
    client.release();
  }
};

// Routes
app.get("/api/requirements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requirements ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB fetch error" });
  }
});

app.post("/api/requirements", async (req, res) => {
  try {
    const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
    const result = await pool.query(
      `INSERT INTO requirements (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB insert error" });
  }
});

app.put("/api/requirements/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  try {
    // If working = "Yes", check if another row is already working
    if (working === "Yes") {
      const check = await pool.query("SELECT id FROM requirements WHERE working='Yes' AND id <> $1", [id]);
      if (check.rows.length > 0) {
        return res.status(400).json({ error: "Another requirement is already being worked on. Reset it first." });
      }
    }

    const result = await pool.query(
      `UPDATE requirements SET client_name=$1, requirement_id=$2, job_title=$3, status=$4, slots=$5, assigned_recruiter=$6, working=$7
       WHERE id=$8 RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB update error" });
  }
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "../frontend/build" });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`🌐 Using ${isProduction ? "Production Database" : "Local Database"}`);
  await initializeDB();
});
