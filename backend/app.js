// ------------------------------
// app.js (Backend Entry Point)
// ------------------------------

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;
const app = express();

// ------------------------------
// Middleware
// ------------------------------
app.use(cors());
app.use(express.json());

// ------------------------------
// Database Connection
// ------------------------------
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL?.includes("render")
    ? { rejectUnauthorized: false }
    : false,
});

// ------------------------------
// API Routes
// ------------------------------

// Fetch all requirements
app.get("/api/requirements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requirements ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching requirements:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
});

// Insert a new requirement
app.post("/api/requirements", async (req, res) => {
  try {
    const {
      client_name,
      requirement_id,
      job_title,
      status,
      slots,
      assigned_recruiter,
      working,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO requirements 
       (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working) 
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error inserting requirement:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// Update an existing requirement
app.put("/api/requirements/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body;

    if (!Object.keys(fields).length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");

    const query = `UPDATE requirements SET ${setClause} WHERE id=${id} RETURNING *`;
    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating requirement:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ------------------------------
// Serve Frontend in Production
// ------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/build");
  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ------------------------------
// Start Server
// ------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
