import jwt, { type SignOptions } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../services/users.js";

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length > 0) {
    return s;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required");
  }
  return "penguwave-dev-insecure-secret";
}

function getExpiresIn(): SignOptions["expiresIn"] {
  const v = process.env.JWT_EXPIRES_IN?.trim();
  return (v && v.length > 0 ? v : "8h") as SignOptions["expiresIn"];
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "analyst" || value === "viewer";
}

export function signAccessToken(claims: { sub: string; role: UserRole }): string {
  const options: SignOptions = { expiresIn: getExpiresIn() };
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
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & { role?: unknown };
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

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
