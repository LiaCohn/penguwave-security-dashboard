import jwt, { type SignOptions } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { findUserRoleStatusById, type UserRole } from "../services/users.js";

const JWT_ALG = "HS256" as const;

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s && s.length > 0) {
    return s;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("JWT_SECRET not set; using insecure dev-only fallback");
    return "penguwave-dev-insecure-secret";
  }
  throw new Error(
    "JWT_SECRET is required unless NODE_ENV=development (e.g. set JWT_SECRET or run via npm run dev)",
  );
}

function getExpiresIn(): SignOptions["expiresIn"] {
  const v = process.env.JWT_EXPIRES_IN?.trim();
  return (v && v.length > 0 ? v : "8h") as SignOptions["expiresIn"];
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "analyst" || value === "viewer";
}

export function signAccessToken(claims: { sub: string; role: UserRole }): string {
  const options: SignOptions = { expiresIn: getExpiresIn(), algorithm: JWT_ALG };
  return jwt.sign({ sub: claims.sub, role: claims.role }, getJwtSecret(), options);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALG],
    }) as jwt.JwtPayload & { role?: unknown };
    const sub = decoded.sub;
    const role = decoded.role;
    if (typeof sub !== "string" || !sub || !isUserRole(role)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.user = { id: sub, role };
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}

/**
 * Requires a valid JWT (use after requireAuth). Re-checks role and status from the DB
 * so demoted/disabled admins cannot rely on stale token claims alone.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const row = await findUserRoleStatusById(req.user.id);
    if (!row || row.status !== "active") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (row.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.user = { id: req.user.id, role: row.role };
    next();
  })().catch(next);
}

/**
 * After requireAuth: reject disabled users so revoked accounts cannot read protected resources with a stale JWT.
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const row = await findUserRoleStatusById(req.user.id);
    if (!row || row.status !== "active") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.user = { id: req.user.id, role: row.role };
    next();
  })().catch(next);
}
