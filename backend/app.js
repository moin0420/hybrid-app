import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database setup
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL.includes("render")
    ? { rejectUnauthorized: false }
    : false,
});

// Initialize DB
async function initializeDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requisitions (
      id SERIAL PRIMARY KEY,
      title TEXT,
      department TEXT,
      location TEXT,
      working TEXT DEFAULT '',
      assigned_recruiter TEXT DEFAULT ''
    )
  `);
  console.log("✅ Database initialized");
}
initializeDB();

// ----------------------
// API Endpoints
// ----------------------

// Get all requisitions
app.get("/api/requisitions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requisitions ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching requisitions:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update a requisition row
app.put("/api/requisitions/:id", async (req, res) => {
  const { id } = req.params;
  let { title, department, location, working, assigned_recruiter, user } = req.body;

  try {
    // Normalize working value (case-insensitive)
    if (working) {
      working = working.toLowerCase() === "yes" ? "Yes" : working;
    }

    // If user tries to set "Yes"
    if (working && working.toLowerCase() === "yes") {
      // Check if this user already has another requisition marked "Yes"
      const check = await pool.query(
        `SELECT * FROM requisitions 
         WHERE working = 'Yes' AND assigned_recruiter = $1 AND id != $2`,
        [user, id]
      );

      if (check.rows.length > 0) {
        return res.status(400).json({
          error: "You're already working on another requisition. Please mark it free and try again.",
        });
      }

      // Assign recruiter if valid
      assigned_recruiter = user;
    }

    // If user sets "Non-Workable", reset recruiter
    if (working && working.toLowerCase() === "non-workable") {
      assigned_recruiter = "";
    }

    // If user clears "Yes" -> reset recruiter
    if (!working || working === "") {
      assigned_recruiter = "";
    }

    const result = await pool.query(
      `UPDATE requisitions
       SET title = $1, department = $2, location = $3, working = $4, assigned_recruiter = $5
       WHERE id = $6 RETURNING *`,
      [title, department, location, working || "", assigned_recruiter || "", id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating requisition:", err);
    res.status(500).json({ error: "Database update failed" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
