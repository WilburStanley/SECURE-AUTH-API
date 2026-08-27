import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

export const protectedRouter = Router();

protectedRouter.use(requireAuth);

protectedRouter.get("/profile", (_req: Request, res: Response) => {
  res.status(200).json({ message: "You reached a protected route." });
});