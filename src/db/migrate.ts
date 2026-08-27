import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrate = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  console.log("Applying schema.sql to the database...");
  await pool.query(schemaSql);
  console.log("Migration complete: users table is ready.");

  await pool.end();
};

migrate().catch((error) => {
  console.error("Migration failed: ", error);
  process.exit(1);
});
