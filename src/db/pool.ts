import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: true },
});