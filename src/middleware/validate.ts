import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Bad Request",
        details: result.error.flatten().fieldErrors,
      });
    }

    req.body = result.data;
    next();
  };
};