import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes.js";
import { globalLimiter } from "./middleware/rateLimiters.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(globalLimiter);
app.use(express.json({ limit: "10kb" }));
app.use("/auth", authRouter);