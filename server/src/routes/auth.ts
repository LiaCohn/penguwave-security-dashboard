import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, signAccessToken } from "../middleware/auth.js";
import { findUserByEmail, findUserPublicById } from "../services/users.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const invalidCredentials = { error: "Invalid email or password" } as const;

export const authRouter = Router();

authRouter.post("/login", loginLimiter, async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

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
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

authRouter.post("/logout", (_req, res) => {
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
