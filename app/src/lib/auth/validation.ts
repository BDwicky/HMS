/**
 * @file src/lib/auth/validation.ts
 * Zod schemas for auth-related inputs.
 */

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Username atau email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

