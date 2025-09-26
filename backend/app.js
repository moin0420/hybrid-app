// backend/app.js
import express from "express";
import pg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ================== Database Config ==================
const { Pool } = pg;

if (!process.env.DB_URL) {
  console.error("❌ Missing DB_URL in environment variables!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL.includes("render")
    ? { rejectUnauthorized: false }
    : false,
});

// Test DB connection
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
})();

// ================== API Routes ==================
app.get("/api/requisitions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requisitions");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching requisitions:", err);
    res.status(500).json({ error: "Failed to fetch requisitions" });
  }
});

app.post("/api/requisitions/:id/update", async (req, res) => {
  const { id } = req.params;
  const { working, assigned_recruiter } = req.body;

  try {
    // Case-insensitive check for "yes"
    let normalizedWorking = null;
    if (typeof working === "string" && working.trim().toLowerCase() === "yes") {
      normalizedWorking = "Yes";
    } else if (working && working.trim() !== "") {
      normalizedWorking = working.trim();
    }

    const query = `
      UPDATE requisitions
      SET working = $1, assigned_recruiter = $2
      WHERE id = $3
      RETURNING *;
    `;

    const values = [normalizedWorking, assigned_recruiter || null, id];
    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating requisition:", err);
    res.status(500).json({ error: "Failed to update requisition" });
  }
});

// ================== Serve React Frontend ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// ================== Start Server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
