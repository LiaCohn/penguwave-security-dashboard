import { z } from "zod";

const roleSchema = z.enum(["admin", "analyst", "viewer"]);
const statusSchema = z.enum(["active", "disabled"]);

export const createUserBodySchema = z.object({
  email: z.string().trim().min(1, "Email is required").email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema,
});

export const patchUserBodySchema = z
  .object({
    role: roleSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, {
    message: "Provide role and/or status",
  });
