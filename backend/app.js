import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database init
const dbPromise = open({
  filename: path.join(process.cwd(), "requirements.db"),
  driver: sqlite3.Database,
});

// Create table if not exists
(async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT,
      requirement_id TEXT,
      job_title TEXT,
      status TEXT,
      slots INTEGER,
      assigned_recruiter TEXT,
      working TEXT
    )
  `);
})();

// ✅ GET all requirements
app.get("/api/requirements", async (req, res) => {
  const db = await dbPromise;
  const rows = await db.all("SELECT * FROM requirements");
  res.json(rows);
});

// ✅ POST new requirement
app.post("/api/requirements", async (req, res) => {
  const db = await dbPromise;
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  const result = await db.run(
    `INSERT INTO requirements 
     (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [client_name, requirement_id, job_title, status, slots, assigned_recruiter || "", working || ""]
  );

  const newRow = await db.get("SELECT * FROM requirements WHERE id = ?", result.lastID);
  res.json(newRow);
});

// ✅ PUT update a requirement
app.put("/api/requirements/:id", async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  // Normalize working value
  let finalWorking = working?.trim().toLowerCase() === "yes" ? "Yes" : "";

  let finalRecruiter = assigned_recruiter || "";

  if (finalWorking === "Yes") {
    // Check if same recruiter already working on another requisition
    const conflict = await db.get(
      `SELECT * FROM requirements 
       WHERE working = 'Yes' 
       AND assigned_recruiter = ? 
       AND id != ?`,
      [assigned_recruiter, id]
    );
    if (conflict) {
      return res.status(400).json({
        error: "You're already working on another requisition. Please mark it free and try again.",
      });
    }
    finalRecruiter = assigned_recruiter;
  } else {
    // Reset recruiter if not working
    finalRecruiter = "";
  }

  // If non-workable (Closed, Cancelled, Filled, slots <= 0) → reset recruiter
  const nonWorkable = ["Closed", "Cancelled", "Filled"].includes(status) || slots <= 0;
  if (nonWorkable) {
    finalWorking = "";
    finalRecruiter = "";
  }

  await db.run(
    `UPDATE requirements 
     SET client_name = ?, requirement_id = ?, job_title = ?, status = ?, slots = ?, assigned_recruiter = ?, working = ?
     WHERE id = ?`,
    [client_name, requirement_id, job_title, status, slots, finalRecruiter, finalWorking, id]
  );

  const updatedRow = await db.get("SELECT * FROM requirements WHERE id = ?", id);
  res.json(updatedRow);
});

// Root test
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
