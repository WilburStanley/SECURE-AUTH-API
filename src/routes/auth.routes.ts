import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "../db/pool";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { validateBody } from "../middleware/validate.js";
import { signupSchema, loginSchema, logoutSchema, refreshSchema } from "../schemas/auth.schema.js";
import { remainingBackoffMs } from "../utils/backoff.js";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../utils/tokens.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

authRouter.post("/signup", authLimiter, validateBody(signupSchema), async (req: Request, res: Response) => {
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

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
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
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, hashRefreshToken(refreshToken), expiresAt],
  );

  return res.status(200).json({ accessToken, refreshToken });
});

authRouter.post("/logout", requireAuth, validateBody(logoutSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokenHash = hashRefreshToken(refreshToken);

  await pool.query(
    "UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1 AND user_id = $2",
    [tokenHash, req.user!.sub],
  );

  return res.status(204).send();
});

authRouter.post("/refresh", validateBody(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokenHash = hashRefreshToken(refreshToken);

  const result = await pool.query(
    `SELECT refresh_tokens.user_id, refresh_tokens.expires_at, refresh_tokens.revoked, users.email
     FROM refresh_tokens
     JOIN users ON users.id = refresh_tokens.user_id
     WHERE refresh_tokens.token_hash = $1`,
    [tokenHash],
  );
  const record = result.rows[0];

  const isValid = record && !record.revoked && new Date(record.expires_at) > new Date();
  if (!isValid) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const accessToken = signAccessToken({ sub: record.user_id, email: record.email });
  return res.status(200).json({ accessToken });
});