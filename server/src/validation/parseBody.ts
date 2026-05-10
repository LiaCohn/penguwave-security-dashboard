import { z } from "zod";

export type ParseBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Safe-parse JSON body; first issue message for 400 responses (api_contract shape). */
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): ParseBodyResult<z.infer<T>> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const first = result.error.issues[0];
  return { ok: false, error: first?.message ?? "Invalid request" };
}
