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

export async function listUsersPublic(): Promise<UserPublic[]> {
  const result = await pool.query<UserPublic>(
    `SELECT id, email, role, status FROM users ORDER BY id`,
  );
  return result.rows;
}

/** Number of other active admin accounts besides `excludeId` (excluded user may still be admin). */
export async function countOtherActiveAdmins(excludeId: string): Promise<number> {
  const result = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM users
     WHERE role = 'admin' AND status = 'active' AND id <> $1`,
    [excludeId],
  );
  return Number(result.rows[0]?.n ?? 0);
}

async function nextUsrNumericId(): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE id ~ '^usr-[0-9]+$'`,
  );
  let max = 0;
  for (const row of result.rows) {
    const m = /^usr-(\d+)$/.exec(row.id);
    if (m) {
      max = Math.max(max, Number.parseInt(m[1], 10));
    }
  }
  const next = max + 1;
  return `usr-${String(next).padStart(3, "0")}`;
}

export async function createUser(params: {
  email: string;
  password_hash: string;
  role: UserRole;
}): Promise<UserPublic> {
  const id = await nextUsrNumericId();
  const result = await pool.query<UserPublic>(
    `INSERT INTO users (id, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, email, role, status`,
    [id, params.email.trim(), params.password_hash, params.role],
  );
  return result.rows[0]!;
}

export type UpdateUserResult =
  | { ok: true; user: UserPublic }
  | { ok: false; reason: "not_found" | "last_admin" };

export async function updateUserPublic(
  id: string,
  patch: { role?: UserRole; status?: UserStatus },
): Promise<UpdateUserResult> {
  const existing = await findUserPublicById(id);
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  const nextRole = patch.role ?? existing.role;
  const nextStatus = patch.status ?? existing.status;

  if (existing.role === "admin" && existing.status === "active") {
    const removingAdmin =
      nextRole !== "admin" || nextStatus === "disabled";
    if (removingAdmin) {
      const others = await countOtherActiveAdmins(id);
      if (others < 1) {
        return { ok: false, reason: "last_admin" };
      }
    }
  }

  const result = await pool.query<UserPublic>(
    `UPDATE users
     SET role = COALESCE($2, role),
         status = COALESCE($3, status),
         updated_at = now()
     WHERE id = $1
     RETURNING id, email, role, status`,
    [id, patch.role ?? null, patch.status ?? null],
  );
  const row = result.rows[0];
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, user: row };
}

export async function deleteUserById(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "last_admin" | "self" }> {
  if (id === actorId) {
    return { ok: false, reason: "self" };
  }
  const row = await findUserPublicById(id);
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  if (row.role === "admin" && row.status === "active") {
    const others = await countOtherActiveAdmins(id);
    if (others < 1) {
      return { ok: false, reason: "last_admin" };
    }
  }

  const del = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  if (del.rowCount === 0) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true };
}
