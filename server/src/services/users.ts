import { pool } from "../db/pool.js";

export type UserRole = "admin" | "analyst" | "viewer";
export type UserStatus = "active" | "disabled";

export type UserWithSecret = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
};

export type UserPublic = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export async function findUserByEmail(email: string): Promise<UserWithSecret | null> {
  const result = await pool.query<UserWithSecret>(
    `SELECT id, email, password_hash, role, status
     FROM users
     WHERE lower(trim(email)) = lower(trim($1))`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserPublicById(id: string): Promise<UserPublic | null> {
  const result = await pool.query<UserPublic>(
    `SELECT id, email, role, status FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

/** Role + status only (for authz checks without loading full row). */
export async function findUserRoleStatusById(id: string): Promise<Pick<UserPublic, "role" | "status"> | null> {
  const result = await pool.query<Pick<UserPublic, "role" | "status">>(
    `SELECT role, status FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}
