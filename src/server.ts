import "dotenv/config";
import express from "express";
import { pool } from "./db/pool.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

const start = async () => {
  await pool.query("SELECT 1");
  console.log("Connected to Neon Postgres.");

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};


start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});