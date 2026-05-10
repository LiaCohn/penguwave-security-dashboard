import { z } from "zod";

/** Login payload: trimmed email, non-empty password (bounded to limit bcrypt work). */
export const loginBodySchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(1024, "Password is too long"),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
