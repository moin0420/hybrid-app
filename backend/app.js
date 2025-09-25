import express from "express";
import cors from "cors";
import pg from "pg";
import path from "path";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL.includes("render") ? { rejectUnauthorized: false } : false,
});

// Initialize DB table if not exists
async function initializeDB() {
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
      )
    `);
    console.log("✅ DB initialized");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

// API routes

// Get all requirements
app.get("/api/requirements", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM requirements ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB fetch error" });
  }
});

// Add a new requirement
app.post("/api/requirements", async (req, res) => {
  try {
    const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO requirements (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB insert error" });
  }
});

// Update a requirement
app.put("/api/requirements/:id", async (req, res) => {
  const rowId = req.params.id;
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  try {
    // Check if any other row has working='Yes'
    if (working && working.toLowerCase() === "yes") {
      const { rows: activeRows } = await pool.query(
        "SELECT * FROM requirements WHERE working='Yes' AND id<>$1",
        [rowId]
      );
      if (activeRows.length > 0) {
        return res.json({ error: "You're already working on another req, please reset it to work on this req." });
      }
    }

    const { rows } = await pool.query(
      `UPDATE requirements SET
         client_name=$1, requirement_id=$2, job_title=$3, status=$4, slots=$5, assigned_recruiter=$6, working=$7
       WHERE id=$8 RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working, rowId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB update error" });
  }
});

// Serve React frontend
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`🌐 Using ${process.env.DB_URL.includes("render") ? "Render Database" : "Local Database"}`);
  await initializeDB();
});
