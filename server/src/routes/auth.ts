import bcrypt from "bcryptjs";
import { Router } from "express";
import type { Response } from "express";
import rateLimit from "express-rate-limit";
import { AUTH_COOKIE_NAME, requireAuth, signAccessToken } from "../middleware/auth.js";
import { loginBodySchema } from "../schemas/auth.js";
import { findUserByEmail, findUserPublicById } from "../services/users.js";
import { parseBody } from "../validation/parseBody.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const invalidCredentials = { error: "Invalid email or password" } as const;
const cookieSecure = process.env.NODE_ENV === "production";

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}

export const authRouter = Router();

authRouter.post("/login", loginLimiter, async (req, res) => {
  const body = parseBody(loginBodySchema, req.body);
  if (!body.ok) {
    res.status(400).json({ error: body.error });
    return;
  }
  const { email, password } = body.data;

  const user = await findUserByEmail(email);
  if (!user) {
    res.status(401).json(invalidCredentials);
    return;
  }
  if (user.status === "disabled") {
    res.status(401).json(invalidCredentials);
    return;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    res.status(401).json(invalidCredentials);
    return;
  }

  const token = signAccessToken({ sub: user.id, role: user.role });
  setAuthCookie(res, token);
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const row = await findUserPublicById(req.user!.id);
  if (!row || row.status === "disabled") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
  });
});
