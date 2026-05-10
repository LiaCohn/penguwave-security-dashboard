import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createUserBodySchema, patchUserBodySchema } from "../schemas/users.js";
import {
  createUser,
  deleteUserById,
  listUsersPublic,
  updateUserPublic,
} from "../services/users.js";
import { parseBody } from "../validation/parseBody.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await listUsersPublic();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", async (req, res, next) => {
  const body = parseBody(createUserBodySchema, req.body);
  if (!body.ok) {
    res.status(400).json({ error: body.error });
    return;
  }
  try {
    const password_hash = await bcrypt.hash(body.data.password, 10);
    const user = await createUser({
      email: body.data.email,
      password_hash,
      role: body.data.role,
    });
    res.status(201).json(user);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    next(err);
  }
});

usersRouter.patch("/:id", async (req, res, next) => {
  const body = parseBody(patchUserBodySchema, req.body);
  if (!body.ok) {
    res.status(400).json({ error: body.error });
    return;
  }
  try {
    const result = await updateUserPublic(req.params.id, {
      role: body.data.role,
      status: body.data.status,
    });
    if (!result.ok) {
      if (result.reason === "not_found") {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.status(400).json({ error: "Cannot remove the last active administrator" });
      return;
    }
    res.json(result.user);
  } catch (err) {
    next(err);
  }
});

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await deleteUserById(req.params.id, req.user!.id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (result.reason === "self") {
        res.status(400).json({ error: "Cannot delete your own account" });
        return;
      }
      res.status(400).json({ error: "Cannot delete the last active administrator" });
      return;
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
});
