import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize database
const db = new Database("./database.sqlite");

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    requirement_id TEXT,
    job_title TEXT,
    status TEXT DEFAULT 'Open',
    slots INTEGER DEFAULT 1,
    assigned_recruiter TEXT DEFAULT '',
    working TEXT DEFAULT ''
  )
`).run();

// Helper: check if user already has a working row
function userHasWorkingRow(username) {
  const row = db.prepare(
    "SELECT * FROM requirements WHERE assigned_recruiter = ? AND working = 'Yes'"
  ).get(username);
  return !!row;
}

// GET all requirements
app.get("/api/requirements", (req, res) => {
  const rows = db.prepare("SELECT * FROM requirements").all();
  res.json(rows);
});

// POST new requirement
app.post("/api/requirements", (req, res) => {
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
  const stmt = db.prepare(`
    INSERT INTO requirements (client_name, requirement_id, job_title, status, slots, assigned_recruiter, working)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(client_name || "", requirement_id || "", job_title || "", status || "Open", slots || 1, assigned_recruiter || "", working || "");
  const newRow = db.prepare("SELECT * FROM requirements WHERE id = ?").get(info.lastInsertRowid);
  res.json(newRow);
});

// PUT update requirement
app.put("/api/requirements/:id", (req, res) => {
  const rowId = parseInt(req.params.id);
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;

  const row = db.prepare("SELECT * FROM requirements WHERE id = ?").get(rowId);
  if (!row) return res.status(404).json({ error: "Row not found" });

  let newWorking = working?.toLowerCase() === "yes" ? "Yes" : "";
  let newAssignedRecruiter = assigned_recruiter || "";

  // Handle working logic: only one row per user
  if (newWorking === "Yes") {
    if (userHasWorkingRow(newAssignedRecruiter) && row.working !== "Yes") {
      return res.status(400).json({ error: "You're already working on another requisition. Please mark it free and try again." });
    }
  } else {
    // reset assigned recruiter if working removed or Non-Workable
    newAssignedRecruiter = "";
  }

  db.prepare(`
    UPDATE requirements
    SET client_name = ?, requirement_id = ?, job_title = ?, status = ?, slots = ?, assigned_recruiter = ?, working = ?
    WHERE id = ?
  `).run(client_name, requirement_id, job_title, status, slots, newAssignedRecruiter, newWorking, rowId);

  const updatedRow = db.prepare("SELECT * FROM requirements WHERE id = ?").get(rowId);
  res.json(updatedRow);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
