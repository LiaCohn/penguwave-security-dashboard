import bcrypt from "bcryptjs";
import { pool } from "./db/pool.js";

/** Passwords aligned with previous UI demo data; hashed only at rest in PostgreSQL */
const baselineUsers = [
  { id: "usr-001", email: "admin@penguwave.io", password: "admin123", role: "admin", status: "active" },
  { id: "usr-002", email: "analyst@penguwave.io", password: "pass456", role: "analyst", status: "active" },
  { id: "usr-003", email: "viewer@penguwave.io", password: "view789", role: "viewer", status: "disabled" },
] as const;

async function main(): Promise<void> {
  for (const u of baselineUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, passwordHash, u.role, u.status],
    );
  }
  console.log("Seed complete (baseline usr-001 … usr-003)");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
