import jwt from "jsonwebtoken";

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