const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

app.use(cors());
app.use(express.json());

// Initialize DB
async function initializeDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        client_name TEXT,
        requirement_id TEXT,
        job_title TEXT,
        status TEXT,
        slots INTEGER,
        assigned_recruiter TEXT,
        working TEXT
      );
    `);
    console.log(`✅ Database initialized (${isProduction ? "Render DB" : "Local DB"})`);
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

// Get all requirements
app.get("/api/requirements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requirements ORDER BY id ASC;");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requirements" });
  }
});

// Add new requirement
app.post("/api/requirements", async (req, res) => {
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO requirements (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *;`,
      [client_name || "", requirement_id || "", job_title || "", status || "", slots || 0, assigned_recruiter || "", working || ""]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add row" });
  }
});

// Update requirement by ID
app.put("/api/requirements/:id", async (req, res) => {
  const { id } = req.params;
  let { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  try {
    if (working && working.toLowerCase() === "yes") {
      // Enforce single "Yes" per user
      const { rows: existing } = await pool.query(
        `SELECT * FROM requirements WHERE working='Yes' AND assigned_recruiter=$1 AND id<>$2`,
        [assigned_recruiter, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "You're already working on another Requirement, please reset previous Requirement." });
      }
      working = "Yes"; // Correct capitalization
    }

    if (working !== "Yes") {
      assigned_recruiter = "";
    }

    const result = await pool.query(
      `UPDATE requirements SET
        client_name=$1, requirement_id=$2, job_title=$3, status=$4, slots=$5, assigned_recruiter=$6, working=$7
       WHERE id=$8 RETURNING *;`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update row" });
  }
});

// Serve React frontend
app.use(express.static(path.join(__dirname, "..", "frontend", "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "build", "index.html"));
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`🌐 Using ${isProduction ? "Render Database" : "Local Database"}`);
  await initializeDB();
});
