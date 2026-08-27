import "dotenv/config";
import { pool } from "./db/pool.js";
import { app } from "./app.js";

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