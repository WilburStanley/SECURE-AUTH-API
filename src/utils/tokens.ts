import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is not set. Check your .env file.");
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
};

const REFRESH_TOKEN_TTL_DAYS = 7;

export const generateRefreshToken = (): { token: string; expiresAt: Date } => {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, expiresAt };
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};