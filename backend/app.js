import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL.includes("render")
    ? { rejectUnauthorized: false }
    : false
});

// Initialize DB (example table: requirements)
async function initializeDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        client_name TEXT,
        requirement_id TEXT,
        job_title TEXT,
        status TEXT,
        slots INT,
        assigned_recruiter TEXT,
        working TEXT
      )
    `);
    console.log("DB initialized");
  } catch (err) {
    console.error("DB init error:", err);
  }
}
initializeDB();

// API routes
app.get("/api/requirements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requirements ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/requirements", async (req, res) => {
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO requirements(client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/requirements/:id", async (req, res) => {
  const { id } = req.params;
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
  try {
    const result = await pool.query(
      `UPDATE requirements SET client_name=$1, requirement_id=$2, job_title=$3, status=$4, slots=$5, assigned_recruiter=$6, working=$7
       WHERE id=$8 RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
