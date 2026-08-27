import { z } from "zod";

export const signupSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email("Must be a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const logoutSchema = z.strictObject({
  refreshToken: z.string().min(1, "refreshToken is required"),
});