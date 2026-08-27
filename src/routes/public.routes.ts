import { Router } from "express";
import type { Request, Response } from "express";

export const publicRouter = Router();

publicRouter.get("/info", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome stranger! This info is public." });
});