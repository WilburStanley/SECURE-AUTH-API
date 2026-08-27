import { Router } from "express";
import { pool } from "../db/pool";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { validateBody } from "../middleware/validate.js";
import { signupSchema, loginSchema } from "../schemas/auth.schema.js";
import { remainingBackoffMs } from "../utils/backoff.js";
import { signAccessToken } from "../utils/tokens.js";
import { authLimiter } from "../middleware/rateLimiters.js";

export const authRouter = Router();

authRouter.post("/signup", authLimiter, validateBody(signupSchema), async (req, res) => {
  const { email, password } = req.body;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await hashPassword(password);

  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
    [email, passwordHash],
  );

  return res.status(201).json({ user: result.rows[0] });
});

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT id, email, password_hash, failed_login_attempts, last_failed_login_at FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];

  const genericFailure = () => res.status(401).json({ error: "Invalid login credentials" });

  if (!user) {
    return genericFailure();
  }

  const wait = remainingBackoffMs(user.failed_login_attempts, user.last_failed_login_at);
  if (wait > 0) {
    return res.status(429).json({
      error: "Too many failed attempts for this account, please wait before retrying",
      retryAfterMs: Math.ceil(wait),
    });
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);

  if (!passwordMatches) {
    await pool.query(
      "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = now() WHERE id = $1",
      [user.id],
    );
    return genericFailure();
  }

  await pool.query(
    "UPDATE users SET failed_login_attempts = 0, last_failed_login_at = NULL WHERE id = $1",
    [user.id],
  );

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return res.status(200).json({ accessToken });
});