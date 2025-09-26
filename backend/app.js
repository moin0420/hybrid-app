// backend/app.js
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error("DB connection error:", err.message);
  else console.log("Connected to SQLite database.");
});

// Create table if not exists
db.run(
  `CREATE TABLE IF NOT EXISTS requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    requirement_id TEXT,
    job_title TEXT,
    status TEXT,
    slots INTEGER,
    assigned_recruiter TEXT,
    working TEXT
  )`,
  (err) => {
    if (err) console.error(err.message);
  }
);

// Get all requirements
app.get("/api/requirements", (req, res) => {
  db.all("SELECT * FROM requirements", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new requirement
app.post("/api/requirements", (req, res) => {
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
  db.run(
    `INSERT INTO requirements (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [client_name, requirement_id, job_title, status, slots, assigned_recruiter, working],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM requirements WHERE id = ?", [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

// Update a requirement
app.put("/api/requirements/:id", (req, res) => {
  const { id } = req.params;
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  // Handle working rules: only one row per user can have "Yes"
  if (working && working.toLowerCase() === "yes") {
    db.get(
      "SELECT * FROM requirements WHERE assigned_recruiter = ? AND working = 'Yes'",
      [assigned_recruiter],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.id != id) {
          return res.status(400).json({
            error: "You're already working on another requisition. Please mark it free and try again."
          });
        } else {
          updateRow();
        }
      }
    );
  } else {
    updateRow();
  }

  function updateRow() {
    db.run(
      `UPDATE requirements SET
        client_name = ?,
        requirement_id = ?,
        job_title = ?,
        status = ?,
        slots = ?,
        assigned_recruiter = ?,
        working = ?
       WHERE id = ?`,
      [
        client_name,
        requirement_id,
        job_title,
        status,
        slots,
        assigned_recruiter && working && working.toLowerCase() === "yes" ? assigned_recruiter : "",
        working && working.toLowerCase() === "yes" ? "Yes" : "",
        id
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM requirements WHERE id = ?", [id], (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(row);
        });
      }
    );
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
