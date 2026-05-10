import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db/pool.js";

const dir = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(dir, "..", "db", "schema.sql");

async function main(): Promise<void> {
  const sql = readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  console.log("Schema applied");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
