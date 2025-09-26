import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend/build")));

const dbPromise = open({
  filename: "./database.db",
  driver: sqlite3.Database
});

const initializeDB = async () => {
  const db = await dbPromise;
  await db.run(`
    CREATE TABLE IF NOT EXISTS requirements(
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
};
initializeDB();

// API routes
app.get("/api/requirements", async (req, res) => {
  const db = await dbPromise;
  const rows = await db.all("SELECT * FROM requirements");
  res.json(rows);
});

app.post("/api/requirements", async (req, res) => {
  const db = await dbPromise;
  const { client_name, requirement_id, job_title, status, slots, assigned_recruiter, working } = req.body;
  const result = await db.run(
    "INSERT INTO requirements(client_name, requirement_id, job_title, status, slots, assigned_recruiter, working) VALUES(?,?,?,?,?,?,?)",
    client_name, requirement_id, job_title, status, slots, assigned_recruiter, working
  );
  const newRow = await db.get("SELECT * FROM requirements WHERE id=?", result.lastID);
  res.json(newRow);
});

app.put("/api/requirements/:id", async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;
  const row = req.body;
  await db.run(
    `UPDATE requirements SET client_name=?, requirement_id=?, job_title=?, status=?, slots=?, assigned_recruiter=?, working=? WHERE id=?`,
    row.client_name, row.requirement_id, row.job_title, row.status, row.slots, row.assigned_recruiter, row.working, id
  );
  res.json({ success: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
