import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.DB_URL.includes("render")
    ? { rejectUnauthorized: false }
    : false,
});

// Example API route
app.get("/api/requirements", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM requirements");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    res.status(500).send("Server error");
  }
});

// ---------- Serve Frontend React Build ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from frontend/build
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Catch-all route → React handles routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
